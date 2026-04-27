"""
Logging configuration for the Computer Vision Service.
"""

import logging
import sys
import os


def setup_logger(name: str, level: str = None) -> logging.Logger:
    """
    Configure and return a logger instance.

    Args:
        name: Logger name (typically __name__)
        level: Log level string (DEBUG, INFO, WARNING, ERROR)

    Returns:
        Configured logger instance
    """
    log_level = level or os.getenv('LOG_LEVEL', 'INFO')

    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Avoid duplicate handlers
    if logger.handlers:
        return logger

    # Console handler with detailed formatting
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)

    formatter = logging.Formatter(
        fmt='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler for errors
    log_dir = os.getenv('LOG_DIR', 'logs')
    os.makedirs(log_dir, exist_ok=True)

    file_handler = logging.FileHandler(
        os.path.join(log_dir, 'cv-service.log'),
        encoding='utf-8',
    )
    file_handler.setLevel(logging.WARNING)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger
