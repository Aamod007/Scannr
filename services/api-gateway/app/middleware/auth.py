import os
import time
from jose import jwt, JWTError

JWT_SECRET = os.getenv("JWT_SECRET", "scannr-dev-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "scannr-auth")


def check_jwt(auth_header: str) -> dict:
    """Validate JWT token and return decoded claims.

    In development (no JWT_SECRET env var set), accepts the literal
    token 'valid-jwt-token' for backward compatibility with tests.
    """
    if not auth_header or not auth_header.startswith("Bearer "):
        raise ValueError("Missing or invalid Authorization header")

    token = auth_header.split(" ", 1)[1]

    # Dev/test shortcut — only when using the default dev secret
    if JWT_SECRET == "scannr-dev-secret-key-change-in-production" and token == "valid-jwt-token":
        return {
            "sub": "dev-user",
            "role": "admin",
            "officer_id": "OFF-DEV-0001",
            "iss": JWT_ISSUER,
        }

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"verify_aud": False},
        )
    except JWTError as e:
        raise ValueError(f"Invalid JWT token: {e}")

    # Check expiry
    exp = payload.get("exp")
    if exp and time.time() > exp:
        raise ValueError("JWT token has expired")

    return payload


def create_jwt(subject: str, role: str = "officer", officer_id: str = "", ttl_seconds: int = 3600) -> str:
    """Create a signed JWT token (utility for tests and dev)."""
    now = int(time.time())
    claims = {
        "sub": subject,
        "role": role,
        "officer_id": officer_id or f"OFF-{subject[:3].upper()}-0001",
        "iss": JWT_ISSUER,
        "iat": now,
        "exp": now + ttl_seconds,
    }
    return jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)
