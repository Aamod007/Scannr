import os
from typing import Optional, Any

_pool: Optional[Any] = None


async def get_db_pool():
    """Get or create database connection pool."""
    global _pool
    if _pool is None:
        import asyncpg

        database_url = os.getenv("POSTGRES_URL", "postgresql://scannr:scannr@postgres:5432/scannr")
        _pool = await asyncpg.create_pool(database_url)
    return _pool


async def close_db_pool():
    """Close database connection pool."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
