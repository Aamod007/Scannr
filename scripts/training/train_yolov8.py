#!/usr/bin/env python3
"""
SCANNR YOLOv8 Training Script
Trains custom YOLOv8 model on X-ray datasets
"""

import os
import sys
import yaml
import torch
import cv2
import numpy as np
from pathlib import Path
from ultralytics import YOLO
import mlflow
import logging
from datetime import datetime
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YOLOv8Trainer:
    def __init__(self, data_dir: str = "data", model_size: str = "l"):
        self.data_dir = Path(data_dir)
        self.processed_dir = self.data_dir / "processed"
        self.model_size = model_size
        
        # MLflow setup
        mlflow.set_experiment("scannr_yolov8_training")
        
        # Device setup
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        # Load configuration
        self.config = self.load_config()
    
    def load_config(self) -> dict:
        """Load training configuration"""
        config_path = self.processed_dir / "training_manifest.json"
        
        if not config_path.exists():
            # Default configuration
            default_config = {
                "training_config": {
                    "yolo_model": f"yolov8{self.model_size}.pt",
                    "input_size": 640,
                    "batch_size": 16,
                    "epochs": 100,
                    "learning_rate": 0.001,
                    "datasets": {
                        "primary": "gdxray",
                        "secondary": ["clcxray", "opixray"],
                        "validation_split": 0.2
                    },
                    "classes": [
                        {"name": "knife", "id": 0},
                        {"name": "gun", "id": 1},
                        {"name": "scissors", "id": 2},
                        {"name": "wrench", "id": 3},
                        {"name": "hammer", "id": 4},
                        {"name": "density_anomaly", "id": 5}
                    ]
                }
            }
            
            with open(config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
            
            logger.info(f"Created default config: {config_path}")
            return default_config
        
        with open(config_path, 'r') as f:
            return json.load(f)
    
    def setup_model(self) -> YOLO:
        """Setup YOLOv8 model"""
        model_name = self.config['training_config']['yolo_model']
        logger.info(f"Loading YOLOv8 model: {model_name}")
        
        model = YOLO(model_name)
        
        # Update model configuration for X-ray images
        model.overrides.update({
            'imgsz': self.config['training_config']['input_size'],
            'device': str(self.device),
            'optimizer': 'AdamW',
            'lr0': self.config['training_config']['learning_rate'],
            'momentum': 0.937,
            'weight_decay': 0.0005,
            'warmup_epochs': 3.0,
            'warmup_momentum': 0.8,
            'box': 7.5,  # Higher box loss for precise detection
            'cls': 0.5,  # Lower classification loss (fewer classes)
            'dfl': 1.5,  # Distribution focal loss
        })
        
        return model
    
    def prepare_data_yaml(self) -> Path:
        """Prepare YOLOv8 data configuration"""
        yaml_path = self.processed_dir / "dataset.yaml"
        
        if yaml_path.exists():
            return yaml_path
        
        # Create YAML configuration
        classes = self.config['training_config']['classes']
        
        data_config = {
            'path': str(self.processed_dir.absolute()),
            'train': 'train/images',
            'val': 'val/images',
            'test': 'test/images',
            'nc': len(classes),
            'names': [cls['name'] for cls in classes]
        }
        
        with open(yaml_path, 'w') as f:
            yaml.dump(data_config, f, default_flow_style=False)
        
        logger.info(f"Created data configuration: {yaml_path}")
        return yaml_path
    
    def setup_mlflow(self):
        """Setup MLflow tracking"""
        # Create MLflow run
        self.run = mlflow.start_run(
            run_name=f"yolov8_{self.model_size}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            tags={
                "model": "yolov8",
                "model_size": self.model_size,
                "purpose": "xray_contraband_detection",
                "dataset": "custom_xray"
            }
        )
        
        # Log parameters
        mlflow.log_params({
            "model_name": f"yolov8{self.model_size}",
            "input_size": self.config['training_config']['input_size'],
            "batch_size": self.config['training_config']['batch_size'],
            "epochs": self.config['training_config']['epochs'],
            "learning_rate": self.config['training_config']['learning_rate'],
            "num_classes": len(self.config['training_config']['classes']),
            "device": str(self.device)
        })
        
        logger.info("MLflow tracking setup complete")
    
    def train_model(self, model: YOLO, data_yaml: Path) -> dict:
        """Train the YOLOv8 model"""
        logger.info("Starting YOLOv8 training...")
        
        # Training arguments
        train_args = {
            'data': str(data_yaml),
            'epochs': self.config['training_config']['epochs'],
            'batch': self.config['training_config']['batch_size'],
            'imgsz': self.config['training_config']['input_size'],
            'device': str(self.device),
            'optimizer': 'AdamW',
            'lr0': self.config['training_config']['learning_rate'],
            'momentum': 0.937,
            'weight_decay': 0.0005,
            'warmup_epochs': 3.0,
            'box': 7.5,
            'cls': 0.5,
            'dfl': 1.5,
            'patience': 20,  # Early stopping patience
            'save': True,
            'save_period': 10,  # Save checkpoint every 10 epochs
            'cache': True,  # Cache images for faster training
            'workers': 8,  # Number of data loading workers
            'pretrained': True,
            'name': f'yolov8{self.model_size}_xray',
            'project': 'runs/train',
            'exist_ok': True,
            'plots': True,  # Generate training plots
            'val': True,  # Validate during training
            'resume': False,
        }
        
        # Start training with MLflow tracking
        with mlflow.start_run(nested=True):
            results = model.train(**train_args)
        
        logger.info("Training completed!")
        return results
    
    def evaluate_model(self, model: YOLO) -> dict:
        """Evaluate the trained model"""
        logger.info("Evaluating model...")
        
        # Run validation
        val_results = model.val()
        
        # Extract metrics
        metrics = {
            "mAP50": val_results.box.map50,
            "mAP75": val_results.box.map75,
            "mAP50-95": val_results.box.map,
            "precision": val_results.box.mp,
            "recall": val_results.box.mr,
            "f1_score": 2 * (val_results.box.mp * val_results.box.mr) / (val_results.box.mp + val_results.box.mr),
        }
        
        logger.info("Validation metrics:")
        for metric, value in metrics.items():
            logger.info(f"  {metric}: {value:.4f}")
            mlflow.log_metric(f"val_{metric}", value)
        
        return metrics
    
    def test_model(self, model: YOLO) -> dict:
        """Test the model on test set"""
        logger.info("Testing model on test set...")
        
        # Run test
        test_results = model.val(split='test')
        
        # Extract test metrics
        test_metrics = {
            "test_mAP50": test_results.box.map50,
            "test_mAP75": test_results.box.map75,
            "test_mAP50-95": test_results.box.map,
            "test_precision": test_results.box.mp,
            "test_recall": test_results.box.mr,
        }
        
        logger.info("Test metrics:")
        for metric, value in test_metrics.items():
            logger.info(f"  {metric}: {value:.4f}")
            mlflow.log_metric(metric, value)
        
        return test_metrics
    
    def save_model(self, model: YOLO) -> Path:
        """Save the trained model"""
        # Get the best model path
        best_model_path = Path(model.trainer.best)
        
        # Create models directory
        models_dir = self.data_dir / "models"
        models_dir.mkdir(exist_ok=True)
        
        # Copy best model
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        saved_model_path = models_dir / f"yolov8{self.model_size}_xray_{timestamp}.pt"
        
        shutil.copy2(best_model_path, saved_model_path)
        
        logger.info(f"Model saved to: {saved_model_path}")
        
        # Log model to MLflow
        mlflow.log_artifact(saved_model_path)
        
        return saved_model_path
    
    def create_model_card(self, metrics: dict, test_metrics: dict, model_path: Path):
        """Create model card with training information"""
        model_card = {
            "model_name": f"YOLOv8{self.model_size.upper()}",
            "task": "X-ray Contraband Detection",
            "description": "Custom YOLOv8 model trained on X-ray datasets for detecting prohibited items in customs baggage scans",
            "training_date": datetime.now().isoformat(),
            "model_size": self.model_size,
            "input_size": self.config['training_config']['input_size'],
            "num_classes": len(self.config['training_config']['classes']),
            "classes": self.config['training_config']['classes'],
            "validation_metrics": metrics,
            "test_metrics": test_metrics,
            "model_path": str(model_path),
            "dataset_info": {
                "total_images": len(list((self.processed_dir / "train" / "images").glob("*.jpg"))),
                "val_images": len(list((self.processed_dir / "val" / "images").glob("*.jpg"))),
                "test_images": len(list((self.processed_dir / "test" / "images").glob("*.jpg")))
            },
            "performance_targets": {
                "accuracy": ">92%",
                "inference_time": "<5 seconds",
                "false_positive_rate": "<3%",
                "false_negative_rate": "<8%"
            }
        }
        
        model_card_path = model_path.parent / f"{model_path.stem}_card.json"
        with open(model_card_path, 'w') as f:
            json.dump(model_card, f, indent=2)
        
        logger.info(f"Model card created: {model_card_path}")
        mlflow.log_artifact(model_card_path)
    
    def run_training_pipeline(self):
        """Run the complete training pipeline"""
        logger.info("🚀 Starting SCANNR YOLOv8 Training Pipeline")
        logger.info("=" * 60)
        
        try:
            # Setup MLflow
            self.setup_mlflow()
            
            # Prepare data
            data_yaml = self.prepare_data_yaml()
            
            # Setup model
            model = self.setup_model()
            
            # Train model
            train_results = self.train_model(model, data_yaml)
            
            # Evaluate model
            val_metrics = self.evaluate_model(model)
            
            # Test model
            test_metrics = self.test_model(model)
            
            # Save model
            model_path = self.save_model(model)
            
            # Create model card
            self.create_model_card(val_metrics, test_metrics, model_path)
            
            # Log final results
            mlflow.log_metric("final_mAP50", val_metrics["mAP50"])
            mlflow.log_metric("final_test_mAP50", test_metrics["test_mAP50"])
            
            logger.info("\n✅ Training pipeline completed successfully!")
            logger.info(f"Model saved: {model_path}")
            logger.info(f"Validation mAP50: {val_metrics['mAP50']:.4f}")
            logger.info(f"Test mAP50: {test_metrics['test_mAP50']:.4f}")
            
            return {
                "model_path": model_path,
                "val_metrics": val_metrics,
                "test_metrics": test_metrics,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Training pipeline failed: {e}")
            mlflow.log_param("error", str(e))
            return {
                "success": False,
                "error": str(e)
            }
        
        finally:
            mlflow.end_run()

def main():
    """Main function"""
    trainer = YOLOv8Trainer(model_size="l")  # Use large model for better accuracy
    results = trainer.run_training_pipeline()
    
    if results["success"]:
        print("\n🎉 SCANNR YOLOv8 training completed!")
        print(f"Model ready for deployment: {results['model_path']}")
    else:
        print(f"\n❌ Training failed: {results.get('error', 'Unknown error')}")
        sys.exit(1)

if __name__ == "__main__":
    import sys
    main()