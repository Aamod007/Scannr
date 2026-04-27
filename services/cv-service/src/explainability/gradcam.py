"""
Grad-CAM (Gradient-weighted Class Activation Mapping) for YOLOv8.

Generates visual explanations of which regions in an X-ray scan
most influenced the model's threat detection decision. This is
critical for officer trust and regulatory compliance — officers
must understand WHY the AI flagged a container.

Reference: Selvaraju et al., "Grad-CAM: Visual Explanations from
Deep Networks via Gradient-based Localization" (ICCV 2017)
"""

import torch
import numpy as np
import cv2
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)


class GradCAMGenerator:
    """
    Grad-CAM heatmap generator for YOLOv8 models.

    Hooks into the last convolutional layer of the YOLOv8 backbone
    to capture activations and gradients, then computes a weighted
    combination to produce the class-discriminative heatmap.
    """

    def __init__(self, model, target_layer: Optional[str] = None):
        """
        Initialize Grad-CAM generator.

        Args:
            model: Loaded YOLOv8 model instance
            target_layer: Name of the target conv layer (auto-detected if None)
        """
        self.model = model
        self.activations = None
        self.gradients = None
        self._hook_handles = []

        # Auto-detect last conv layer if not specified
        self.target_layer = target_layer
        self._register_hooks()

    def _register_hooks(self):
        """Register forward and backward hooks on the target layer."""
        try:
            # For YOLOv8, the backbone's last conv layer is typically
            # model.model.model[-2] or similar
            backbone = self.model.model
            if hasattr(backbone, 'model'):
                # Navigate to the last feature extraction layer
                layers = list(backbone.model.children())
                target = layers[-2] if len(layers) > 2 else layers[-1]
            else:
                target = backbone

            handle_fwd = target.register_forward_hook(self._forward_hook)
            handle_bwd = target.register_full_backward_hook(self._backward_hook)
            self._hook_handles = [handle_fwd, handle_bwd]

            logger.info(f"Grad-CAM hooks registered on {type(target).__name__}")
        except Exception as e:
            logger.warning(f"Could not register Grad-CAM hooks: {e}")

    def _forward_hook(self, module, input, output):
        """Capture activations during forward pass."""
        self.activations = output.detach()

    def _backward_hook(self, module, grad_input, grad_output):
        """Capture gradients during backward pass."""
        self.gradients = grad_output[0].detach()

    def generate(
        self,
        image: np.ndarray,
        target_class: str,
        class_map: Optional[Dict[str, int]] = None,
    ) -> np.ndarray:
        """
        Generate Grad-CAM heatmap for the given image and target class.

        Args:
            image: Preprocessed image as (H, W, 3) numpy array
            target_class: Class name to generate heatmap for
            class_map: Mapping of class names to indices

        Returns:
            Heatmap as (H, W) numpy array with values in [0, 1]
        """
        if class_map is None:
            class_map = {
                'weapon': 0,
                'narcotic': 1,
                'contraband': 2,
                'anomaly': 3,
            }

        target_idx = class_map.get(target_class, 0)

        try:
            # Convert image to tensor
            if isinstance(image, np.ndarray):
                tensor = torch.from_numpy(image).permute(2, 0, 1).unsqueeze(0).float()
                tensor = tensor / 255.0
                tensor.requires_grad_(True)
            else:
                tensor = image

            device = next(self.model.model.parameters()).device
            tensor = tensor.to(device)

            # Forward pass
            output = self.model.model(tensor)

            # Create target for backprop
            if isinstance(output, (list, tuple)):
                output = output[0]

            # Select target class score and backpropagate
            if output.dim() > 1:
                target_score = output[..., target_idx].sum()
            else:
                target_score = output.sum()

            self.model.model.zero_grad()
            target_score.backward(retain_graph=True)

            # Compute Grad-CAM
            if self.activations is not None and self.gradients is not None:
                # Global average pooling of gradients
                weights = self.gradients.mean(dim=[2, 3], keepdim=True)

                # Weighted combination of activation maps
                cam = (weights * self.activations).sum(dim=1, keepdim=True)

                # ReLU (only positive contributions)
                cam = torch.relu(cam)

                # Normalize to [0, 1]
                cam = cam.squeeze().cpu().numpy()
                if cam.max() > 0:
                    cam = cam / cam.max()

                # Resize to original image dimensions
                cam = cv2.resize(cam, (image.shape[1], image.shape[0]))

                logger.debug(f"Grad-CAM generated for class '{target_class}'")
                return cam
            else:
                logger.warning("No activations/gradients captured, returning uniform heatmap")
                return np.ones((image.shape[0], image.shape[1]), dtype=np.float32) * 0.5

        except Exception as e:
            logger.error(f"Grad-CAM generation failed: {e}")
            # Return a uniform low-intensity heatmap as fallback
            return np.ones((image.shape[0], image.shape[1]), dtype=np.float32) * 0.3

    def cleanup(self):
        """Remove registered hooks."""
        for handle in self._hook_handles:
            handle.remove()
        self._hook_handles = []
