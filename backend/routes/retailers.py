from flask import Blueprint, jsonify
from db import get_connection

retailers_bp = Blueprint("retailers", __name__)


@retailers_bp.route("/api/retailers")
def get_retailers():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT retailer_id AS id, name, color, logo_url, base_url "
                "FROM retailers ORDER BY retailer_id"
            )
            rows = cur.fetchall()
        return jsonify(rows)
    finally:
        conn.close()
