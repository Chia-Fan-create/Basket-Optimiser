from flask import Blueprint, jsonify, request, g
from db import get_connection
from auth import require_auth

lists_bp = Blueprint("lists", __name__)


@lists_bp.route("/api/lists")
@require_auth
def get_lists():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT sl.list_id, sl.name, sl.estimated_total, "
                "       COUNT(li.list_item_id) AS items_count, "
                "       sl.created_at, sl.updated_at "
                "FROM shopping_lists sl "
                "LEFT JOIN list_items li ON sl.list_id = li.list_id "
                "WHERE sl.user_id = %s "
                "GROUP BY sl.list_id "
                "ORDER BY sl.updated_at DESC",
                (g.user_id,),
            )
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
            # Verify ownership
            cur.execute(
                "SELECT list_id, name FROM shopping_lists WHERE list_id = %s AND user_id = %s",
                (list_id, g.user_id),
            )
            sl = cur.fetchone()
            if not sl:
                return jsonify({"error": True, "message": "List not found"}), 404

            # Get items with product info and best price
            cur.execute(
                "SELECT li.list_item_id, pv.product_id, p.name AS product_name, "
                "       p.icon, li.variant_id, li.quantity, "
                "       li.is_purchased, li.purchased_at "
                "FROM list_items li "
                "INNER JOIN product_variants pv ON li.variant_id = pv.variant_id "
                "INNER JOIN products p ON pv.product_id = p.product_id "
                "WHERE li.list_id = %s",
                (list_id,),
            )
            items_raw = cur.fetchall()

            # For each item, find best current price across all stores
            items = []
            product_ids = set()
            for item in items_raw:
                product_ids.add(item["product_id"])
                item["is_purchased"] = bool(item["is_purchased"])
                item["purchased_at"] = item["purchased_at"].isoformat() if item["purchased_at"] else None
                items.append(item)

            # Get best prices for each product in the list
            if product_ids:
                placeholders = ",".join(["%s"] * len(product_ids))
                cur.execute(
                    f"SELECT pv.product_id, r.name AS store, r.color AS store_color, "
                    f"       pr.unit_price, CONCAT('per ', u.name) AS unit "
                    f"FROM price_records pr "
                    f"INNER JOIN ( "
                    f"    SELECT variant_id, MAX(record_id) AS latest_record_id "
                    f"    FROM price_records GROUP BY variant_id "
                    f") latest ON pr.record_id = latest.latest_record_id "
                    f"INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id "
                    f"INNER JOIN retailers r ON pv.retailer_id = r.retailer_id "
                    f"INNER JOIN units u ON pv.unit_id = u.unit_id "
                    f"WHERE pv.product_id IN ({placeholders}) "
                    f"ORDER BY pv.product_id, pr.unit_price ASC",
                    tuple(product_ids),
                )
                price_rows = cur.fetchall()

                # Build best-price lookup: product_id -> cheapest row
                best_prices = {}
                for pr in price_rows:
                    pid = pr["product_id"]
                    if pid not in best_prices:
                        best_prices[pid] = pr

                # Attach best price info to each item
                for item in items:
                    bp = best_prices.get(item["product_id"], {})
                    item["best_store"] = bp.get("store")
                    item["best_store_color"] = bp.get("store_color")
                    item["best_price"] = float(bp["unit_price"]) if bp.get("unit_price") else None
                    item["unit"] = bp.get("unit")

            # Calculate store_totals: what would the ENTIRE list cost at each store?
            if product_ids:
                # Get latest prices for all variants of products in this list
                cur.execute(
                    f"SELECT pv.product_id, r.name AS store, pr.price "
                    f"FROM price_records pr "
                    f"INNER JOIN ( "
                    f"    SELECT variant_id, MAX(record_id) AS latest_record_id "
                    f"    FROM price_records GROUP BY variant_id "
                    f") latest ON pr.record_id = latest.latest_record_id "
                    f"INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id "
                    f"INNER JOIN retailers r ON pv.retailer_id = r.retailer_id "
                    f"WHERE pv.product_id IN ({placeholders})",
                    tuple(product_ids),
                )
                all_prices = cur.fetchall()

                # For each store, pick cheapest variant per product, then multiply by quantity
                # Build: store -> product_id -> cheapest price
                store_product_prices = {}
                for row in all_prices:
                    store = row["store"]
                    pid = row["product_id"]
                    price = float(row["price"])
                    if store not in store_product_prices:
                        store_product_prices[store] = {}
                    if pid not in store_product_prices[store] or price < store_product_prices[store][pid]:
                        store_product_prices[store][pid] = price

                # Build quantity map from list items
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
            cur.execute(
                "INSERT INTO shopping_lists (user_id, name) VALUES (%s, %s)",
                (g.user_id, name),
            )
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
                # Verify list ownership
                cur.execute(
                    "SELECT list_id FROM shopping_lists WHERE list_id = %s AND user_id = %s",
                    (list_id, g.user_id),
                )
                if not cur.fetchone():
                    conn.rollback()
                    return jsonify({"error": True, "message": "List not found"}), 404

                # Step 1: Insert the list item
                cur.execute(
                    "INSERT INTO list_items (list_id, variant_id, quantity) VALUES (%s, %s, %s)",
                    (list_id, variant_id, quantity),
                )
                list_item_id = cur.lastrowid

                # Step 2: Update estimated_total atomically
                cur.execute(
                    "UPDATE shopping_lists "
                    "SET estimated_total = estimated_total + ( "
                    "    SELECT pr.price * %s "
                    "    FROM price_records pr "
                    "    INNER JOIN ( "
                    "        SELECT variant_id, MAX(record_id) AS latest_record_id "
                    "        FROM price_records "
                    "        WHERE variant_id = %s "
                    "        GROUP BY variant_id "
                    "    ) latest ON pr.record_id = latest.latest_record_id "
                    ") "
                    "WHERE list_id = %s",
                    (quantity, variant_id, list_id),
                )

                # Get updated total
                cur.execute(
                    "SELECT estimated_total FROM shopping_lists WHERE list_id = %s",
                    (list_id,),
                )
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
            # Verify ownership via join
            cur.execute(
                "SELECT li.list_item_id "
                "FROM list_items li "
                "INNER JOIN shopping_lists sl ON li.list_id = sl.list_id "
                "WHERE li.list_item_id = %s AND li.list_id = %s AND sl.user_id = %s",
                (item_id, list_id, g.user_id),
            )
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

            # Fetch updated row
            cur.execute(
                "SELECT list_item_id, is_purchased, purchased_at FROM list_items WHERE list_item_id = %s",
                (item_id,),
            )
            row = cur.fetchone()

        return jsonify({
            "success": True,
            "list_item_id": row["list_item_id"],
            "is_purchased": bool(row["is_purchased"]),
            "purchased_at": row["purchased_at"].isoformat() if row["purchased_at"] else None,
        })
    finally:
        conn.close()
