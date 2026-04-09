from flask import Blueprint, jsonify, request, g
from db import get_connection
from auth import require_auth
from sql_loader import get_query

insight_bp = Blueprint("insight", __name__)


def _build_insight_sql(name):
    """Load an insight query and inject the spending_cte subquery."""
    cte = get_query("insight", "spending_cte")
    sql = get_query("insight", name)
    return sql.replace("{spending_cte}", cte)


@insight_bp.route("/api/insight/monthly")
@require_auth
def get_monthly():
    months = request.args.get("months", 6, type=int)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(_build_insight_sql("get_monthly"), (g.user_id, months))
            rows = cur.fetchall()

        month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        result = []
        for r in reversed(rows):
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
            cur.execute(_build_insight_sql("get_by_category"), (g.user_id, months, g.user_id))
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
            cur.execute(_build_insight_sql("get_summary_months"), (g.user_id,))
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

            cur.execute(_build_insight_sql("get_top_category"), (g.user_id,))
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
