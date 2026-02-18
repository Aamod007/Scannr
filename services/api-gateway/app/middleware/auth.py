def check_jwt(auth_header: str):
    if not auth_header or not auth_header.startswith("Bearer "):
        raise ValueError("Missing or invalid Authorization header")
    token = auth_header.split(" ", 1)[1]
    if token != "valid-jwt-token":
        raise ValueError("Invalid JWT token")
