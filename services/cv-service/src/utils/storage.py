"""
S3/MinIO storage integration for the Computer Vision Service.

Handles uploading and downloading X-ray scans and Grad-CAM heatmaps
from object storage (S3 in production, MinIO for local development).
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Try to import boto3; fall back gracefully for local dev
try:
    import boto3
    from botocore.exceptions import ClientError
    _HAS_BOTO3 = True
except ImportError:
    _HAS_BOTO3 = False
    logger.warning("boto3 not installed — S3Storage will use local filesystem fallback")


class S3Storage:
    """
    Object storage client for X-ray scans and Grad-CAM heatmaps.

    In production, connects to AWS S3 or MinIO.
    In development, falls back to local filesystem storage.
    """

    def __init__(self):
        self.use_s3 = _HAS_BOTO3 and os.getenv('S3_ENDPOINT')
        self.local_storage_path = os.getenv('LOCAL_STORAGE_PATH', 'storage')

        if self.use_s3:
            self.client = boto3.client(
                's3',
                endpoint_url=os.getenv('S3_ENDPOINT', 'http://localhost:9000'),
                aws_access_key_id=os.getenv('S3_ACCESS_KEY', 'minioadmin'),
                aws_secret_access_key=os.getenv('S3_SECRET_KEY', 'minioadmin'),
                region_name=os.getenv('S3_REGION', 'us-east-1'),
            )
            logger.info(f"S3 storage initialized: {os.getenv('S3_ENDPOINT')}")
        else:
            os.makedirs(self.local_storage_path, exist_ok=True)
            logger.info(f"Using local filesystem storage: {self.local_storage_path}")

    async def download(self, path: str) -> bytes:
        """
        Download a file from storage.

        Args:
            path: S3 URI (s3://bucket/key) or local path

        Returns:
            File contents as bytes
        """
        if path.startswith('s3://'):
            bucket, key = self._parse_s3_uri(path)
            return await self._download_s3(bucket, key)
        else:
            return await self._download_local(path)

    async def upload(
        self,
        data: bytes,
        key: str,
        bucket: Optional[str] = None,
        content_type: str = 'application/octet-stream',
    ) -> str:
        """
        Upload data to storage.

        Args:
            data: File contents as bytes
            key: Storage key/path
            bucket: S3 bucket name (default: from env)
            content_type: MIME type

        Returns:
            Storage path/URI of uploaded file
        """
        if self.use_s3:
            bucket = bucket or os.getenv('S3_DEFAULT_BUCKET', 'scannr-data')
            return await self._upload_s3(data, bucket, key, content_type)
        else:
            return await self._upload_local(data, key)

    async def _download_s3(self, bucket: str, key: str) -> bytes:
        """Download from S3/MinIO."""
        try:
            response = self.client.get_object(Bucket=bucket, Key=key)
            data = response['Body'].read()
            logger.debug(f"Downloaded {len(data)} bytes from s3://{bucket}/{key}")
            return data
        except Exception as e:
            logger.error(f"S3 download failed for s3://{bucket}/{key}: {e}")
            raise

    async def _upload_s3(
        self, data: bytes, bucket: str, key: str, content_type: str
    ) -> str:
        """Upload to S3/MinIO."""
        try:
            self.client.put_object(
                Bucket=bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
            uri = f"s3://{bucket}/{key}"
            logger.debug(f"Uploaded {len(data)} bytes to {uri}")
            return uri
        except Exception as e:
            logger.error(f"S3 upload failed for {key}: {e}")
            raise

    async def _download_local(self, path: str) -> bytes:
        """Download from local filesystem."""
        full_path = os.path.join(self.local_storage_path, path)
        try:
            with open(full_path, 'rb') as f:
                data = f.read()
            logger.debug(f"Read {len(data)} bytes from {full_path}")
            return data
        except FileNotFoundError:
            logger.error(f"File not found: {full_path}")
            raise

    async def _upload_local(self, data: bytes, key: str) -> str:
        """Upload to local filesystem."""
        full_path = os.path.join(self.local_storage_path, key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'wb') as f:
            f.write(data)
        logger.debug(f"Wrote {len(data)} bytes to {full_path}")
        return full_path

    @staticmethod
    def _parse_s3_uri(uri: str):
        """Parse s3://bucket/key into (bucket, key)."""
        without_prefix = uri.replace('s3://', '')
        parts = without_prefix.split('/', 1)
        bucket = parts[0]
        key = parts[1] if len(parts) > 1 else ''
        return bucket, key
