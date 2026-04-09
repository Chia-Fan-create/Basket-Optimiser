from flask import Blueprint, jsonify, request
from db import get_connection
from auth import hash_password, check_password, generate_token

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    display_name = data.get("display_name", "").strip()

    if not email or not password or not display_name:
        return jsonify({"error": True, "message": "email, password, and display_name are required"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                return jsonify({"error": True, "message": "Email already registered"}), 400

            hashed = hash_password(password)
            cur.execute(
                "INSERT INTO users (email, password_hash, display_name) VALUES (%s, %s, %s)",
                (email, hashed, display_name),
            )
            user_id = cur.lastrowid

        user = {"user_id": user_id, "email": email, "display_name": display_name}
        token = generate_token(user_id, email)
        return jsonify({"success": True, "user": user, "token": token}), 201
    finally:
        conn.close()


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": True, "message": "email and password are required"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id, email, password_hash, display_name FROM users WHERE email = %s",
                (email,),
            )
            user = cur.fetchone()

        if not user or not check_password(password, user["password_hash"]):
            return jsonify({"error": True, "message": "Invalid credentials"}), 401

        token = generate_token(user["user_id"], user["email"])
        return jsonify({
            "success": True,
            "user": {
                "user_id": user["user_id"],
                "email": user["email"],
                "display_name": user["display_name"],
            },
            "token": token,
        })
    finally:
        conn.close()
