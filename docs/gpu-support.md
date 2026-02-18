# GPU Support for SCANNR

## NVIDIA GPU Operator Installation

SCANNR's Vision AI service requires NVIDIA GPUs for YOLOv8 inference. Follow these steps to enable GPU support in Kubernetes.

## Prerequisites

- Kubernetes cluster 1.30+
- NVIDIA GPUs installed on worker nodes
- NVIDIA drivers 525.60.13 or later

## Installation

### 1. Install NVIDIA GPU Operator

```bash
# Add NVIDIA Helm repository
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

# Install GPU Operator
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace \
  --set driver.enabled=true \
  --set toolkit.enabled=true
```

### 2. Verify GPU Nodes

```bash
# Check GPU nodes
kubectl get nodes -o json | jq '.items[] | {name: .metadata.name, gpus: .status.capacity["nvidia.com/gpu"]}'

# Check GPU operator pods
kubectl get pods -n gpu-operator
```

### 3. Label GPU Nodes

```bash
# Label nodes with GPUs
kubectl label nodes <node-name> accelerator=nvidia-gpu
```

## Vision AI GPU Configuration

The Vision AI service is configured with the following GPU resources:

```yaml
resources:
  requests:
    nvidia.com/gpu: 1
  limits:
    nvidia.com/gpu: 1
```

### GPU Node Selector

Vision AI pods are scheduled on GPU nodes using nodeSelector:

```yaml
nodeSelector:
  accelerator: nvidia-gpu
```

### GPU Toleration

```yaml
tolerations:
- key: nvidia.com/gpu
  operator: Exists
  effect: NoSchedule
```

## Performance Tuning

### YOLOv8 GPU Optimization

1. **Batch Size**: Configure based on GPU memory
   - A100 (40GB): Batch size 32
   - A100 (80GB): Batch size 64
   - V100 (32GB): Batch size 16

2. **TensorRT Optimization**
   ```python
   # In vision-svc inference.py
   import torch
   from ultralytics import YOLO
   
   # Load model with TensorRT
   model = YOLO('yolov8n.engine')  # TensorRT engine
   ```

3. **CUDA Memory Management**
   ```python
   # Clear cache between inferences
   torch.cuda.empty_cache()
   ```

## Monitoring GPU Usage

### Prometheus GPU Metrics

```yaml
# GPU metrics are automatically collected
# Query examples:
# - nvidia_gpu_utilization
# - nvidia_gpu_memory_used_bytes
# - nvidia_gpu_temperature_celsius
```

### Grafana Dashboard

Import NVIDIA GPU dashboard (ID: 12239) to monitor:
- GPU utilization
- Memory usage
- Temperature
- Power consumption

## Scaling GPU Workloads

### Horizontal Pod Autoscaler with GPU

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vision-svc-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vision-svc
  minReplicas: 2
  maxReplicas: 6
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

## Troubleshooting

### Common Issues

1. **GPU not detected**
   ```bash
   # Check nvidia-device-plugin
   kubectl logs -n gpu-operator -l app=nvidia-device-plugin-daemonset
   ```

2. **Out of memory errors**
   - Reduce batch size
   - Enable gradient checkpointing
   - Use mixed precision (FP16)

3. **Slow inference**
   - Verify TensorRT engine is used
   - Check GPU utilization
   - Optimize image preprocessing

### Validation Commands

```bash
# Test GPU access from pod
kubectl exec -it <vision-svc-pod> -- nvidia-smi

# Check CUDA version
kubectl exec -it <vision-svc-pod> -- python -c "import torch; print(torch.version.cuda)"
```

## Cost Optimization

### GPU Sharing with MIG (Multi-Instance GPU)

For A100 GPUs, enable MIG to share GPU across multiple pods:

```bash
# Enable MIG
nvidia-smi mig -cgi 19,19,19 -C

# Configure pod to use MIG slice
resources:
  limits:
    nvidia.com/mig-3g.40gb: 1
```

### Spot Instances

Use GPU spot instances for non-production workloads:

```yaml
nodeSelector:
  node-type: spot
tolerations:
- key: spot
  operator: Equal
  value: "true"
  effect: NoSchedule
```
