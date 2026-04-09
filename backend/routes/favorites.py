from flask import Blueprint, jsonify, request, g
from db import get_connection
from auth import require_auth

favorites_bp = Blueprint("favorites", __name__)


@favorites_bp.route("/api/user/favorites")
@require_auth
def get_favorites():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT product_id FROM user_favorites WHERE user_id = %s",
                (g.user_id,),
            )
            ids = [row["product_id"] for row in cur.fetchall()]
        return jsonify({"product_ids": ids})
    finally:
        conn.close()


@favorites_bp.route("/api/user/favorites", methods=["PUT"])
@require_auth
def update_favorites():
    data = request.get_json()
    product_ids = data.get("product_ids", [])

    conn = get_connection()
    try:
        conn.autocommit(False)
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM user_favorites WHERE user_id = %s", (g.user_id,))
                for pid in product_ids:
                    cur.execute(
                        "INSERT INTO user_favorites (user_id, product_id) VALUES (%s, %s)",
                        (g.user_id, int(pid)),
                    )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        return jsonify({"success": True, "product_ids": product_ids})
    finally:
        conn.autocommit(True)
        conn.close()
