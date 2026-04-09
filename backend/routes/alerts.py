from flask import Blueprint, jsonify, request, g
from db import get_connection
from auth import require_auth
from sql_loader import get_query

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.route("/api/alerts")
@require_auth
def get_alerts():
    conn = get_connection()
    try:
        conn.autocommit(False)
        try:
            with conn.cursor() as cur:
                # --- User alerts ---
                cur.execute(get_query("alerts", "get_user_alerts"), (g.user_id,))
                alert_rows = cur.fetchall()

                user_alerts = []
                for a in alert_rows:
                    pid = a["product_id"]
                    cur.execute(get_query("alerts", "get_cheapest_current_price"), (pid,))
                    cheapest = cur.fetchone()
                    current_price = float(cheapest["unit_price"]) if cheapest else None
                    target = float(a["target_price"])
                    is_triggered = current_price is not None and current_price <= target

                    alert_obj = {
                        "alert_id": a["alert_id"],
                        "product_id": pid,
                        "product_name": a["product_name"],
                        "icon": a["icon"],
                        "target_price": target,
                        "current_price": current_price,
                        "is_triggered": is_triggered,
                        "triggered_at": a["triggered_at"].isoformat() if a["triggered_at"] else None,
                        "triggered_store": cheapest["store"] if is_triggered and cheapest else None,
                    }
                    if is_triggered and cheapest:
                        alert_obj["triggered_store_color"] = cheapest["store_color"]
                    user_alerts.append(alert_obj)

                # --- Smart alerts (TRANSACTION) ---
                cur.execute(get_query("alerts", "get_tracked_product_ids"), (g.user_id, g.user_id))
                tracked_pids = [r["product_id"] for r in cur.fetchall()]

                smart_alerts = []
                for pid in tracked_pids:
                    cur.execute(get_query("alerts", "get_latest_cheapest_with_date"), (pid,))
                    cheapest = cur.fetchone()
                    if not cheapest:
                        continue

                    cur.execute(get_query("alerts", "get_avg_price"), (pid,))
                    avg_row = cur.fetchone()
                    if not avg_row or not avg_row["avg_price"]:
                        continue

                    avg_price = float(avg_row["avg_price"])
                    latest_price = float(cheapest["latest_price"])
                    if avg_price == 0:
                        continue

                    drop_pct = round((1 - latest_price / avg_price) * 100)
                    if drop_pct < 20:
                        continue

                    cur.execute(get_query("alerts", "check_existing_todo"), (g.user_id, pid))
                    existing = cur.fetchone()

                    if not existing:
                        cur.execute(get_query("alerts", "get_variant_for_product"), (pid,))
                        variant = cur.fetchone()
                        if variant:
                            cur.execute(
                                get_query("alerts", "insert_smart_todo"),
                                (g.user_id, variant["variant_id"],
                                 f"Price dropped {drop_pct}%% — consider buying now"),
                            )
                            todo_id = cur.lastrowid
                    else:
                        todo_id = existing["todo_id"]

                    cur.execute(get_query("alerts", "get_product_name_icon"), (pid,))
                    prod = cur.fetchone()

                    smart_alerts.append({
                        "alert_id": todo_id if not existing else existing["todo_id"],
                        "product_id": pid,
                        "product_name": prod["product_name"] if prod else "",
                        "icon": prod["icon"] if prod else "",
                        "current_price": latest_price,
                        "previous_avg": round(avg_price, 2),
                        "drop_pct": drop_pct,
                        "store": cheapest["store"],
                        "store_color": cheapest["store_color"],
                        "detected_at": cheapest["scraped_at"].isoformat() if cheapest["scraped_at"] else None,
                    })

            conn.commit()
        except Exception:
            conn.rollback()
            raise

        return jsonify({"user_alerts": user_alerts, "smart_alerts": smart_alerts})
    finally:
        conn.autocommit(True)
        conn.close()


@alerts_bp.route("/api/alerts", methods=["POST"])
@require_auth
def create_alert():
    data = request.get_json()
    product_id = data.get("product_id")
    target_price = data.get("target_price")

    if product_id is None or target_price is None:
        return jsonify({"error": True, "message": "product_id and target_price are required"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(get_query("alerts", "check_product_exists"), (int(product_id),))
            prod = cur.fetchone()
            if not prod:
                return jsonify({"error": True, "message": "Product not found"}), 404

            cur.execute(get_query("alerts", "insert_alert"), (g.user_id, int(product_id), target_price))
            alert_id = cur.lastrowid
        return jsonify({
            "success": True,
            "alert_id": alert_id,
            "message": f"Alert set for {prod['name']} at ${target_price:.2f}",
        }), 201
    finally:
        conn.close()


@alerts_bp.route("/api/alerts/<int:alert_id>", methods=["DELETE"])
@require_auth
def delete_alert(alert_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(get_query("alerts", "delete_alert"), (alert_id, g.user_id))
            if cur.rowcount == 0:
                return jsonify({"error": True, "message": "Alert not found"}), 404
        return jsonify({"success": True, "deleted": True})
    finally:
        conn.close()
