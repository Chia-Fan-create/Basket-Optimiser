from flask import Blueprint, jsonify, request
from db import get_connection

compare_bp = Blueprint("compare", __name__)

COMPARE_SQL = """
SELECT
    pv.variant_id,
    CONCAT(b.name, ' ', p.name, ' ', pv.pack_size, ' ', u.abbreviation) AS product,
    r.name   AS store,
    r.color  AS storeColor,
    pr.unit_price AS unitPrice,
    CONCAT('per ', u.name) AS unit,
    pr.price AS totalPrice,
    CONCAT(pv.pack_size, ' ', u.abbreviation) AS originalPack,
    COALESCE(pv.url, r.base_url) AS url
FROM price_records pr
INNER JOIN (
    SELECT variant_id, MAX(record_id) AS latest_record_id
    FROM price_records
    GROUP BY variant_id
) latest ON pr.record_id = latest.latest_record_id
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
INNER JOIN units u ON pv.unit_id = u.unit_id
LEFT JOIN brands b ON p.brand_id = b.brand_id
WHERE pv.product_id = %s
ORDER BY pr.unit_price ASC
LIMIT 5
"""


def _compare_product(cur, product_id):
    cur.execute(COMPARE_SQL, (product_id,))
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
