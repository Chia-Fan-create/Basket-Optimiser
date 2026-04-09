from functools import wraps
from datetime import datetime, timezone, timedelta

import jwt
import bcrypt
from flask import request, jsonify, g

from config import JWT_SECRET

TOKEN_EXPIRY_HOURS = 24


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def generate_token(user_id: int, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def require_auth(f):
    """Decorator that extracts user_id from JWT and stores it in g.user_id."""

    @wraps(f)
    def decorated(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": True, "message": "Missing or invalid token"}), 401
        token = header[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": True, "message": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": True, "message": "Invalid token"}), 401
        g.user_id = payload["user_id"]
        return f(*args, **kwargs)

    return decorated
