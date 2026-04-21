from flask import Blueprint, jsonify, request
from db import get_connection
from sql_loader import get_query

compare_bp = Blueprint("compare", __name__)


def _compare_product(cur, product_id):
    cur.execute(get_query("compare", "get_top5_cheapest"), (product_id,))
    rows = cur.fetchall()
    for rank, row in enumerate(rows, 1):
        row["rank"] = rank
        row["unitPrice"] = float(row["unitPrice"])
        row["totalPrice"] = float(row["totalPrice"])
    return rows


@compare_bp.route("/api/compare/<int:product_id>")
def get_comparison(product_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            rows = _compare_product(cur, product_id)
            if not rows:
                return jsonify({"error": True, "message": f"Product not found: {product_id}"}), 404
        return jsonify(rows)
    finally:
        conn.close()


@compare_bp.route("/api/compare/summary", methods=["POST"])
def get_summary():
    data = request.get_json()
    product_ids = data.get("product_ids", [])
    if not product_ids:
        return jsonify({"error": True, "message": "product_ids is required"}), 400

    conn = get_connection()
    try:
        result = {}
        with conn.cursor() as cur:
            for pid in product_ids:
                result[pid] = _compare_product(cur, int(pid))
        return jsonify(result)
    finally:
        conn.close()
