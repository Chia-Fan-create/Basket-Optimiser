from flask import Blueprint, jsonify
from db import get_connection
from sql_loader import get_query

products_bp = Blueprint("products", __name__)


@products_bp.route("/api/products")
def get_products():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(get_query("products", "get_all_with_category"))
            rows = cur.fetchall()
        return jsonify(rows)
    finally:
        conn.close()
