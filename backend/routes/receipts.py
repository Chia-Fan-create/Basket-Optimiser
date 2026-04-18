from datetime import date, timedelta
from flask import Blueprint, jsonify, request, g
from db import get_connection
from auth import require_auth
from sql_loader import get_query

receipts_bp = Blueprint("receipts", __name__)

DEFAULT_CONSUMPTION_DAYS = 14


@receipts_bp.route("/api/receipts", methods=["POST"])
@require_auth
def process_receipt():
    """
    TRANSACTION: process a receipt — mark purchased, record prices, update inventory.
    Expects: { list_id, store, items: [{ product, price, qty, matched }, ...] }
    """
    data = request.get_json()
    list_id = data.get("list_id")
    store = data.get("store", "")
    items = data.get("items", [])

    if not items:
        return jsonify({"error": True, "message": "items is required"}), 400

    conn = get_connection()
    try:
        conn.autocommit(False)
        try:
            with conn.cursor() as cur:
                # Look up retailer
                cur.execute(get_query("receipts", "get_retailer_by_name"), (store,))
                retailer_row = cur.fetchone()
                retailer_id = retailer_row["retailer_id"] if retailer_row else None

                # Create a scrape_job entry for receipt-sourced prices
                job_id = None
                matched_items = [i for i in items if i.get("matched")]
                if retailer_id and matched_items:
                    cur.execute(
                        get_query("receipts", "insert_receipt_scrape_job"),
                        (retailer_id, len(matched_items)),
                    )
                    job_id = cur.lastrowid

                items_purchased = 0
                prices_recorded = 0
                inventory_updated = 0
                unmatched_items = 0
                today = date.today()

                for item in items:
                    if not item.get("matched"):
                        unmatched_items += 1
                        continue

                    product_name = item.get("product", "")
                    price = item.get("price", 0)
                    qty = item.get("qty", 1)

                    # Extract first word(s) as search keyword (e.g. "Whole Milk 1 Gal" → "Whole Milk")
                    keyword = _extract_keyword(product_name)
                    cur.execute(get_query("receipts", "find_product_by_name"), (keyword,))
                    product_row = cur.fetchone()
                    if not product_row:
                        unmatched_items += 1
                        continue

                    product_id = product_row["product_id"]
                    default_cpd = product_row["default_consumption_days_per_unit"] or DEFAULT_CONSUMPTION_DAYS

                    # Find variant at this retailer
                    variant_id = None
                    if retailer_id:
                        cur.execute(
                            get_query("receipts", "find_variant_for_product_retailer"),
                            (product_id, retailer_id),
                        )
                        variant_row = cur.fetchone()
                        variant_id = variant_row["variant_id"] if variant_row else None

                    # 1. Mark list_items as purchased
                    if list_id and variant_id:
                        cur.execute(
                            get_query("receipts", "mark_list_items_purchased"),
                            (list_id, variant_id),
                        )
                        if cur.rowcount > 0:
                            items_purchased += cur.rowcount

                    # 2. Insert price_record
                    if variant_id and job_id:
                        unit_price = round(price / qty, 4) if qty else price
                        cur.execute(
                            get_query("receipts", "insert_price_record"),
                            (variant_id, price, unit_price, job_id),
                        )
                        prices_recorded += 1

                    # 3. Upsert inventory
                    cur.execute(
                        get_query("receipts", "upsert_inventory"),
                        (g.user_id, product_id),
                    )
                    existing = cur.fetchone()
                    depletion = today + timedelta(days=default_cpd * qty)

                    if existing:
                        cur.execute(
                            get_query("receipts", "update_inventory"),
                            (qty, today, default_cpd, depletion, existing["inventory_id"]),
                        )
                    else:
                        cur.execute(
                            get_query("receipts", "insert_inventory"),
                            (g.user_id, product_id, qty, today, default_cpd, depletion),
                        )
                    inventory_updated += 1

            conn.commit()
        except Exception:
            conn.rollback()
            raise

        return jsonify({
            "success": True,
            "processed": {
                "items_purchased": items_purchased,
                "prices_recorded": prices_recorded,
                "inventory_updated": inventory_updated,
                "unmatched_items": unmatched_items,
            },
            "message": "Receipt processed successfully",
        })
    finally:
        conn.autocommit(True)
        conn.close()


def _extract_keyword(product_name: str) -> str:
    """Extract a searchable keyword from a receipt product name.
    e.g. 'Whole Milk 1 Gal' → 'Whole Milk'
    e.g. 'Chicken Breast 2.6lb' → 'Chicken Breast'
    """
    words = product_name.split()
    keyword_words = []
    for w in words:
        # Stop at tokens that look like quantities (digits, units)
        if w and (w[0].isdigit() or w.lower() in ("gal", "lb", "oz", "ct", "pk", "l")):
            break
        keyword_words.append(w)
    return " ".join(keyword_words) if keyword_words else product_name
