from flask import Blueprint, jsonify, request, g
from db import get_connection
from auth import require_auth
from sql_loader import get_query

lists_bp = Blueprint("lists", __name__)


@lists_bp.route("/api/lists")
@require_auth
def get_lists():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(get_query("lists", "get_user_lists"), (g.user_id,))
            rows = cur.fetchall()
            for r in rows:
                r["estimated_total"] = float(r["estimated_total"])
                r["created_at"] = r["created_at"].isoformat() if r["created_at"] else None
                r["updated_at"] = r["updated_at"].isoformat() if r["updated_at"] else None
        return jsonify(rows)
    finally:
        conn.close()


@lists_bp.route("/api/lists/<int:list_id>")
@require_auth
def get_list_detail(list_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(get_query("lists", "verify_ownership"), (list_id, g.user_id))
            sl = cur.fetchone()
            if not sl:
                return jsonify({"error": True, "message": "List not found"}), 404

            cur.execute(get_query("lists", "get_items_with_product_info"), (list_id,))
            items_raw = cur.fetchall()

            items = []
            product_ids = set()
            for item in items_raw:
                product_ids.add(item["product_id"])
                item["is_purchased"] = bool(item["is_purchased"])
                item["purchased_at"] = item["purchased_at"].isoformat() if item["purchased_at"] else None
                items.append(item)

            if product_ids:
                placeholders = ",".join(["%s"] * len(product_ids))
                sql = get_query("lists", "get_best_prices_for_products").format(placeholders=placeholders)
                cur.execute(sql, tuple(product_ids))
                price_rows = cur.fetchall()

                best_prices = {}
                for pr in price_rows:
                    pid = pr["product_id"]
                    if pid not in best_prices:
                        best_prices[pid] = pr

                for item in items:
                    bp = best_prices.get(item["product_id"], {})
                    item["best_store"] = bp.get("store")
                    item["best_store_color"] = bp.get("store_color")
                    item["best_price"] = float(bp["unit_price"]) if bp.get("unit_price") else None
                    item["unit"] = bp.get("unit")

            if product_ids:
                sql = get_query("lists", "get_store_prices_for_products").format(placeholders=placeholders)
                cur.execute(sql, tuple(product_ids))
                all_prices = cur.fetchall()

                store_product_prices = {}
                for row in all_prices:
                    store = row["store"]
                    pid = row["product_id"]
                    price = float(row["price"])
                    if store not in store_product_prices:
                        store_product_prices[store] = {}
                    if pid not in store_product_prices[store] or price < store_product_prices[store][pid]:
                        store_product_prices[store][pid] = price

                qty_map = {}
                for item in items:
                    pid = item["product_id"]
                    qty_map[pid] = qty_map.get(pid, 0) + item["quantity"]

                store_totals = {}
                for store, prices in store_product_prices.items():
                    total = 0
                    for pid, qty in qty_map.items():
                        if pid in prices:
                            total += prices[pid] * qty
                    store_totals[store] = round(total, 2)

                cheapest_store = min(store_totals, key=store_totals.get) if store_totals else None
                most_expensive = max(store_totals.values()) if store_totals else 0
                cheapest_total = store_totals.get(cheapest_store, 0) if cheapest_store else 0
                savings = round(most_expensive - cheapest_total, 2)
            else:
                store_totals = {}
                cheapest_store = None
                savings = 0

        return jsonify({
            "list_id": sl["list_id"],
            "name": sl["name"],
            "items": items,
            "store_totals": store_totals,
            "cheapest_store": cheapest_store,
            "savings_vs_expensive": savings,
        })
    finally:
        conn.close()


@lists_bp.route("/api/lists", methods=["POST"])
@require_auth
def create_list():
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": True, "message": "name is required"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(get_query("lists", "insert_list"), (g.user_id, name))
            list_id = cur.lastrowid
        return jsonify({"success": True, "list_id": list_id, "name": name}), 201
    finally:
        conn.close()


@lists_bp.route("/api/lists/<int:list_id>/items", methods=["POST"])
@require_auth
def add_list_item(list_id):
    """Add item to list — uses a TRANSACTION (course requirement)."""
    data = request.get_json()
    variant_id = data.get("variant_id")
    quantity = data.get("quantity", 1)

    if not variant_id:
        return jsonify({"error": True, "message": "variant_id is required"}), 400

    conn = get_connection()
    try:
        conn.autocommit(False)
        try:
            with conn.cursor() as cur:
                cur.execute(get_query("lists", "verify_ownership"), (list_id, g.user_id))
                if not cur.fetchone():
                    conn.rollback()
                    return jsonify({"error": True, "message": "List not found"}), 404

                cur.execute(get_query("lists", "insert_item"), (list_id, variant_id, quantity))
                list_item_id = cur.lastrowid

                cur.execute(get_query("lists", "update_estimated_total"), (quantity, variant_id, list_id))

                cur.execute(get_query("lists", "get_estimated_total"), (list_id,))
                new_total = float(cur.fetchone()["estimated_total"])

            conn.commit()
            return jsonify({
                "success": True,
                "list_item_id": list_item_id,
                "estimated_total": new_total,
            }), 201
        except Exception:
            conn.rollback()
            raise
    finally:
        conn.autocommit(True)
        conn.close()


@lists_bp.route("/api/lists/<int:list_id>/items/<int:item_id>", methods=["PATCH"])
@require_auth
def update_list_item(list_id, item_id):
    data = request.get_json()

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(get_query("lists", "verify_item_ownership"), (item_id, list_id, g.user_id))
            if not cur.fetchone():
                return jsonify({"error": True, "message": "Item not found"}), 404

            sets = []
            params = []
            if "quantity" in data:
                sets.append("quantity = %s")
                params.append(data["quantity"])
            if "is_purchased" in data:
                sets.append("is_purchased = %s")
                params.append(data["is_purchased"])
                if data["is_purchased"]:
                    sets.append("purchased_at = NOW()")

            if not sets:
                return jsonify({"error": True, "message": "No fields to update"}), 400

            params.append(item_id)
            cur.execute(f"UPDATE list_items SET {', '.join(sets)} WHERE list_item_id = %s", params)

            cur.execute(get_query("lists", "get_item_after_update"), (item_id,))
            row = cur.fetchone()

        return jsonify({
            "success": True,
            "list_item_id": row["list_item_id"],
            "is_purchased": bool(row["is_purchased"]),
            "purchased_at": row["purchased_at"].isoformat() if row["purchased_at"] else None,
        })
    finally:
        conn.close()
