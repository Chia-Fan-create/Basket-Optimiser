from flask import Blueprint, jsonify
from db import get_connection

products_bp = Blueprint("products", __name__)


@products_bp.route("/api/products")
def get_products():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT p.product_id AS id, p.name, p.icon, "
                "       c.name AS category "
                "FROM products p "
                "LEFT JOIN categories c ON p.category_id = c.category_id "
                "ORDER BY p.product_id"
            )
            rows = cur.fetchall()
        return jsonify(rows)
    finally:
        conn.close()
