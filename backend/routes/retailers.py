from flask import Blueprint, jsonify
from db import get_connection
from sql_loader import get_query

retailers_bp = Blueprint("retailers", __name__)


@retailers_bp.route("/api/retailers")
def get_retailers():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(get_query("retailers", "get_all"))
            rows = cur.fetchall()
        return jsonify(rows)
    finally:
        conn.close()
