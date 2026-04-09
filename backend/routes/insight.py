from flask import Blueprint, jsonify, request, g
from db import get_connection
from auth import require_auth

insight_bp = Blueprint("insight", __name__)

# Inline the v_monthly_spending_by_category view since it may not exist on the server.
# This matches the view definition from schema.sql.
SPENDING_CTE = """
    SELECT
        sl.user_id,
        YEAR(li.purchased_at)  AS purchase_year,
        MONTH(li.purchased_at) AS purchase_month,
        c.name AS category_name,
        COUNT(li.list_item_id) AS items_bought,
        SUM(pr.price * li.quantity) AS total_spent
    FROM list_items li
    INNER JOIN shopping_lists sl ON li.list_id = sl.list_id
    INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
    INNER JOIN products p ON pv.product_id = p.product_id
    LEFT JOIN categories c ON p.category_id = c.category_id
    INNER JOIN (
        SELECT variant_id, MAX(record_id) AS latest_record_id
        FROM price_records
        GROUP BY variant_id
    ) latest ON pv.variant_id = latest.variant_id
    INNER JOIN price_records pr ON pr.record_id = latest.latest_record_id
    WHERE li.is_purchased = TRUE
      AND li.purchased_at IS NOT NULL
    GROUP BY sl.user_id, purchase_year, purchase_month, c.name
"""


@insight_bp.route("/api/insight/monthly")
@require_auth
def get_monthly():
    months = request.args.get("months", 6, type=int)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT purchase_month AS mo, purchase_year AS yr, "
                f"       SUM(total_spent) AS amount "
                f"FROM ({SPENDING_CTE}) AS spending "
                f"WHERE user_id = %s "
                f"GROUP BY purchase_year, purchase_month "
                f"ORDER BY purchase_year DESC, purchase_month DESC "
                f"LIMIT %s",
                (g.user_id, months),
            )
            rows = cur.fetchall()

        month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        result = []
        for r in reversed(rows):  # chronological order
            result.append({
                "month": month_names[r["mo"]],
                "year": r["yr"],
                "amount": float(r["amount"]),
            })
        return jsonify(result)
    finally:
        conn.close()


@insight_bp.route("/api/insight/categories")
@require_auth
def get_categories():
    months = request.args.get("months", 6, type=int)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT category_name AS category, SUM(total_spent) AS amount "
                f"FROM ({SPENDING_CTE}) AS spending "
                f"WHERE user_id = %s "
                f"  AND (purchase_year * 100 + purchase_month) >= ( "
                f"      SELECT MAX(s2.purchase_year * 100 + s2.purchase_month) - %s "
                f"      FROM ({SPENDING_CTE}) AS s2 WHERE s2.user_id = %s "
                f"  ) "
                f"GROUP BY category_name "
                f"ORDER BY amount DESC",
                (g.user_id, months, g.user_id),
            )
            rows = cur.fetchall()

        grand_total = sum(float(r["amount"]) for r in rows) if rows else 1
        result = []
        for r in rows:
            amt = float(r["amount"])
            result.append({
                "category": r["category"] or "Uncategorized",
                "amount": round(amt, 2),
                "percentage": round(amt / grand_total * 100, 1),
            })
        return jsonify(result)
    finally:
        conn.close()


@insight_bp.route("/api/insight/summary")
@require_auth
def get_summary():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Last 6 months spending
            cur.execute(
                f"SELECT purchase_year AS yr, purchase_month AS mo, "
                f"       SUM(total_spent) AS amount "
                f"FROM ({SPENDING_CTE}) AS spending "
                f"WHERE user_id = %s "
                f"GROUP BY purchase_year, purchase_month "
                f"ORDER BY purchase_year DESC, purchase_month DESC "
                f"LIMIT 6",
                (g.user_id,),
            )
            rows = cur.fetchall()

            if not rows:
                return jsonify({
                    "total_6_months": 0,
                    "monthly_average": 0,
                    "current_month": 0,
                    "change_vs_last_month": 0,
                    "insights": [],
                })

            amounts = [float(r["amount"]) for r in rows]
            total_6 = round(sum(amounts), 2)
            avg = round(total_6 / len(amounts), 2)
            current = amounts[0]
            prev = amounts[1] if len(amounts) > 1 else current
            change_pct = round((current - prev) / prev * 100, 1) if prev else 0

            insights = []
            if change_pct < 0:
                insights.append({
                    "type": "decrease",
                    "message": f"Your spending decreased {abs(change_pct)}% this month",
                    "value": change_pct,
                })
            elif change_pct > 0:
                insights.append({
                    "type": "increase",
                    "message": f"Your spending increased {change_pct}% this month",
                    "value": change_pct,
                })

            # Top category
            cur.execute(
                f"SELECT category_name, SUM(total_spent) AS amount "
                f"FROM ({SPENDING_CTE}) AS spending "
                f"WHERE user_id = %s "
                f"GROUP BY category_name "
                f"ORDER BY amount DESC LIMIT 1",
                (g.user_id,),
            )
            top_cat = cur.fetchone()
            if top_cat:
                cat_amt = round(float(top_cat["amount"]) / max(len(amounts), 1), 2)
                cat_pct = round(float(top_cat["amount"]) / total_6 * 100, 1) if total_6 else 0
                insights.append({
                    "type": "category",
                    "message": f"{top_cat['category_name']} is your largest spending category at ${cat_amt}/month",
                    "value": cat_pct,
                })

        return jsonify({
            "total_6_months": total_6,
            "monthly_average": avg,
            "current_month": current,
            "change_vs_last_month": change_pct,
            "insights": insights,
        })
    finally:
        conn.close()
