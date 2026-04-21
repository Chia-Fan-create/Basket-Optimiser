from flask import Blueprint, jsonify
from db import get_connection
from sql_loader import get_query

trends_bp = Blueprint("trends", __name__)


@trends_bp.route("/api/trends/<int:product_id>")
def get_trends(product_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(get_query("trends", "get_monthly_avg_by_retailer"), (product_id,))
            rows = cur.fetchall()

            if not rows:
                return jsonify({"error": True, "message": f"No trend data for product {product_id}"}), 404

            months_map = {}
            for r in rows:
                key = (r["yr"], r["mo"], r["month_label"])
                if key not in months_map:
                    months_map[key] = {}
                months_map[key][r["retailer"]] = float(r["avg_price"])

            result = []
            for (yr, mo, label), retailers in months_map.items():
                result.append({"month": label, "retailers": retailers, "predicted": None})

            cur.execute(get_query("trends", "get_seasonal_patterns"), (product_id,))
            patterns = cur.fetchall()

            seasonal_info = []
            if patterns and result:
                last_prices = result[-1]["retailers"]
                overall_avg = sum(last_prices.values()) / len(last_prices) if last_prices else 0

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

                # Build seasonal pattern details with year-by-year evidence
                cur.execute(get_query("trends", "get_pattern_years"), (product_id,))
                year_rows = cur.fetchall()
                years_by_pattern = {}
                for yr in year_rows:
                    pid = yr["pattern_id"]
                    if pid not in years_by_pattern:
                        years_by_pattern[pid] = []
                    years_by_pattern[pid].append({
                        "year": yr["year"],
                        "observed_discount": float(yr["observed_discount"]),
                    })

                for p in patterns:
                    seasonal_info.append({
                        "event_name": p["event_name"],
                        "retailer": p["retailer"],
                        "typical_month": p["typical_month"],
                        "month_label": month_names[p["typical_month"]],
                        "avg_discount_pct": float(p["avg_discount_pct"]),
                        "confidence_score": float(p["confidence_score"]),
                        "years": years_by_pattern.get(p["pattern_id"], []),
                    })

        return jsonify({"trend": result, "seasonal": seasonal_info})
    finally:
        conn.close()