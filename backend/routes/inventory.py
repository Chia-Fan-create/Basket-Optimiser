from datetime import date
from flask import Blueprint, jsonify, request, g
from db import get_connection
from auth import require_auth

inventory_bp = Blueprint("inventory", __name__)


@inventory_bp.route("/api/inventory")
@require_auth
def get_inventory():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT ii.inventory_id, ii.product_id, p.name AS product_name, "
                "       p.icon, ii.quantity, ii.purchase_date, "
                "       ii.consumption_days, ii.depletion_date, ii.dismissed "
                "FROM inventory_items ii "
                "INNER JOIN products p ON ii.product_id = p.product_id "
                "WHERE ii.user_id = %s "
                "ORDER BY ii.depletion_date ASC",
                (g.user_id,),
            )
            rows = cur.fetchall()

            today = date.today()
            u_name_cache = {}
            for r in rows:
                # Fetch unit info for human-readable quantity
                pid = r["product_id"]
                if pid not in u_name_cache:
                    cur.execute(
                        "SELECT u.abbreviation "
                        "FROM product_variants pv "
                        "INNER JOIN units u ON pv.unit_id = u.unit_id "
                        "WHERE pv.product_id = %s LIMIT 1",
                        (pid,),
                    )
                    unit_row = cur.fetchone()
                    u_name_cache[pid] = unit_row["abbreviation"] if unit_row else ""

                qty_val = float(r["quantity"])
                unit_abbr = u_name_cache[pid]
                r["quantity"] = f"{qty_val:g} {unit_abbr}".strip()
                r["purchase_date"] = r["purchase_date"].isoformat() if r["purchase_date"] else None
                r["depletion_date"] = r["depletion_date"].isoformat() if r["depletion_date"] else None
                days_left = (r["depletion_date"] and (date.fromisoformat(r["depletion_date"]) - today).days) or 0
                r["days_left"] = max(days_left, 0)
                r["status"] = "low" if days_left <= 2 and not r["dismissed"] else "ok"
                del r["dismissed"]

        return jsonify(rows)
    finally:
        conn.close()


@inventory_bp.route("/api/inventory", methods=["POST"])
@require_auth
def add_inventory():
    data = request.get_json()
    product_id = data.get("product_id")
    quantity = data.get("quantity")
    consumption_days = data.get("consumption_days")

    if not product_id or quantity is None or not consumption_days:
        return jsonify({"error": True, "message": "product_id, quantity, and consumption_days are required"}), 400

    today = date.today()
    from datetime import timedelta
    depletion = today + timedelta(days=int(consumption_days))

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Check if entry already exists for this user+product
            cur.execute(
                "SELECT inventory_id FROM inventory_items "
                "WHERE user_id = %s AND product_id = %s",
                (g.user_id, int(product_id)),
            )
            existing = cur.fetchone()

            if existing:
                cur.execute(
                    "UPDATE inventory_items SET quantity = %s, purchase_date = %s, "
                    "consumption_days = %s, depletion_date = %s, dismissed = FALSE "
                    "WHERE inventory_id = %s",
                    (quantity, today, consumption_days, depletion, existing["inventory_id"]),
                )
                inv_id = existing["inventory_id"]
            else:
                cur.execute(
                    "INSERT INTO inventory_items "
                    "(user_id, product_id, quantity, purchase_date, consumption_days, depletion_date) "
                    "VALUES (%s, %s, %s, %s, %s, %s)",
                    (g.user_id, int(product_id), quantity, today, consumption_days, depletion),
                )
                inv_id = cur.lastrowid

        return jsonify({
            "success": True,
            "inventory_id": inv_id,
            "depletion_date": depletion.isoformat(),
        }), 201
    finally:
        conn.close()


@inventory_bp.route("/api/inventory/<int:inv_id>/dismiss", methods=["PATCH"])
@require_auth
def dismiss_inventory(inv_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE inventory_items SET dismissed = TRUE "
                "WHERE inventory_id = %s AND user_id = %s",
                (inv_id, g.user_id),
            )
            if cur.rowcount == 0:
                return jsonify({"error": True, "message": "Inventory item not found"}), 404
        return jsonify({"success": True, "inventory_id": inv_id, "dismissed": True})
    finally:
        conn.close()
