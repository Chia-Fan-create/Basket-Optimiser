from flask import Blueprint, jsonify
from db import get_connection

trends_bp = Blueprint("trends", __name__)


@trends_bp.route("/api/trends/<int:product_id>")
def get_trends(product_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Historical prices grouped by month and retailer
            cur.execute(
                "SELECT DATE_FORMAT(pr.scraped_at, '%%b') AS month_label, "
                "       YEAR(pr.scraped_at) AS yr, "
                "       MONTH(pr.scraped_at) AS mo, "
                "       r.name AS retailer, "
                "       ROUND(AVG(pr.unit_price), 2) AS avg_price "
                "FROM price_records pr "
                "INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id "
                "INNER JOIN retailers r ON pv.retailer_id = r.retailer_id "
                "WHERE pv.product_id = %s "
                "GROUP BY yr, mo, month_label, r.name "
                "ORDER BY yr, mo",
                (product_id,),
            )
            rows = cur.fetchall()

            if not rows:
                return jsonify({"error": True, "message": f"No trend data for product {product_id}"}), 404

            # Pivot: group by (yr, mo) -> {retailer: price}
            months_map = {}
            for r in rows:
                key = (r["yr"], r["mo"], r["month_label"])
                if key not in months_map:
                    months_map[key] = {}
                months_map[key][r["retailer"]] = float(r["avg_price"])

            result = []
            for (yr, mo, label), retailers in months_map.items():
                result.append({"month": label, "retailers": retailers, "predicted": None})

            # Append predictions from seasonal_patterns
            cur.execute(
                "SELECT sp.typical_month, r.name AS retailer, "
                "       sp.avg_discount_pct "
                "FROM seasonal_patterns sp "
                "INNER JOIN retailers r ON sp.retailer_id = r.retailer_id "
                "WHERE sp.product_id = %s",
                (product_id,),
            )
            patterns = cur.fetchall()

            if patterns and result:
                # Use the last known average price to project predictions
                last_prices = result[-1]["retailers"]
                overall_avg = sum(last_prices.values()) / len(last_prices) if last_prices else 0

                # Group predictions by month
                pred_map = {}
                for p in patterns:
                    m = p["typical_month"]
                    discount = float(p["avg_discount_pct"]) / 100
                    predicted = round(overall_avg * (1 - discount), 2)
                    if m not in pred_map or predicted < pred_map[m]:
                        pred_map[m] = predicted

                month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                for m, pred in sorted(pred_map.items()):
                    result.append({"month": month_names[m], "retailers": {}, "predicted": pred})

        return jsonify(result)
    finally:
        conn.close()
