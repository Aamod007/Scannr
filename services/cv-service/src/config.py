"""
Configuration management for the Computer Vision Service.

Centralizes all environment variables and defaults.
"""

import os
from dataclasses import dataclass, field
from typing import List


@dataclass
class CVServiceConfig:
    """Configuration for the Computer Vision Service."""

    # Server
    host: str = "0.0.0.0"
    port: int = 5001
    debug: bool = False

    # Model
    model_path: str = "models/yolov8x-customs-v2.3.pt"
    model_version: str = "yolov8x-customs-v2.3"
    confidence_threshold: float = 0.70
    input_size: int = 1280

    # Detection classes
    detection_classes: List[str] = field(
        default_factory=lambda: ['weapon', 'narcotic', 'contraband', 'anomaly']
    )

    # Storage
    s3_endpoint: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_region: str = "us-east-1"
    s3_xray_bucket: str = "xray-scans"
    s3_gradcam_bucket: str = "gradcam-maps"
    s3_model_bucket: str = "ml-models"
    local_storage_path: str = "storage"

    # Database
    postgres_url: str = ""

    # RabbitMQ
    rabbitmq_url: str = ""
    risk_scoring_queue: str = "risk-scoring-queue"

    # Logging
    log_level: str = "INFO"
    log_dir: str = "logs"

    @classmethod
    def from_env(cls) -> 'CVServiceConfig':
        """Load configuration from environment variables."""
        return cls(
            host=os.getenv('HOST', '0.0.0.0'),
            port=int(os.getenv('PORT', '5001')),
            debug=os.getenv('DEBUG', 'false').lower() == 'true',
            model_path=os.getenv('MODEL_PATH', 'models/yolov8x-customs-v2.3.pt'),
            model_version=os.getenv('MODEL_VERSION', 'yolov8x-customs-v2.3'),
            confidence_threshold=float(os.getenv('CONFIDENCE_THRESHOLD', '0.70')),
            input_size=int(os.getenv('INPUT_SIZE', '1280')),
            s3_endpoint=os.getenv('S3_ENDPOINT', ''),
            s3_access_key=os.getenv('S3_ACCESS_KEY', ''),
            s3_secret_key=os.getenv('S3_SECRET_KEY', ''),
            s3_region=os.getenv('S3_REGION', 'us-east-1'),
            s3_xray_bucket=os.getenv('S3_XRAY_BUCKET', 'xray-scans'),
            s3_gradcam_bucket=os.getenv('S3_GRADCAM_BUCKET', 'gradcam-maps'),
            s3_model_bucket=os.getenv('S3_MODEL_BUCKET', 'ml-models'),
            local_storage_path=os.getenv('LOCAL_STORAGE_PATH', 'storage'),
            postgres_url=os.getenv('POSTGRES_URL', ''),
            rabbitmq_url=os.getenv('RABBITMQ_URL', ''),
            risk_scoring_queue=os.getenv('RISK_SCORING_QUEUE', 'risk-scoring-queue'),
            log_level=os.getenv('LOG_LEVEL', 'INFO'),
            log_dir=os.getenv('LOG_DIR', 'logs'),
        )


# Global config instance
config = CVServiceConfig.from_env()
