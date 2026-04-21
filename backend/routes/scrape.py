import random
from flask import Blueprint, jsonify
from db import get_connection
from sql_loader import get_query

scrape_bp = Blueprint("scrape", __name__)

FAILURE_RATE = 0.05          # 5% chance a variant fails to scrape
NORMAL_FLUCTUATION = 0.05    # ±5% random price movement
FORCED_DROP_PCT = 0.25       # 25% drop for forced items
FORCED_DROP_COUNT = 2        # how many products get a forced drop per run

ERROR_MESSAGES = [
    "HTTP 403 Forbidden",
    "Connection timeout after 30s",
    "Price element not found on page",
    "CAPTCHA challenge detected",
    "HTTP 503 Service Unavailable",
]


@scrape_bp.route("/api/admin/scrape", methods=["POST"])
def run_scrape():
    """Simulate a full scrape run across all retailers."""
    conn = get_connection()
    try:
        summary = {
            "jobs_created": 0,
            "prices_recorded": 0,
            "failures": 0,
            "alerts_triggered": 0,
            "forced_drops": [],
        }

        with conn.cursor() as cur:
            # Get all retailers
            cur.execute(get_query("scrape", "get_all_retailers"))
            retailers = [r["retailer_id"] for r in cur.fetchall()]

            # Pick products that will get a forced price drop this run
            # Collect all unique product_ids first
            all_product_ids = set()
            for rid in retailers:
                cur.execute(get_query("scrape", "get_variants_by_retailer"), (rid,))
                for v in cur.fetchall():
                    all_product_ids.add(v["product_id"])
            forced_product_ids = set(random.sample(
                list(all_product_ids),
                min(FORCED_DROP_COUNT, len(all_product_ids)),
            ))

            for retailer_id in retailers:
                # Create a scrape job
                cur.execute(get_query("scrape", "insert_job"), (retailer_id,))
                job_id = cur.lastrowid
                summary["jobs_created"] += 1

                # Get variants for this retailer
                cur.execute(get_query("scrape", "get_variants_by_retailer"), (retailer_id,))
                variants = cur.fetchall()

                items_scraped = 0
                job_failed = False

                for variant in variants:
                    vid = variant["variant_id"]
                    pid = variant["product_id"]

                    # Simulate failure
                    if random.random() < FAILURE_RATE:
                        error_msg = random.choice(ERROR_MESSAGES)
                        cur.execute(
                            get_query("scrape", "insert_failure"),
                            (job_id, vid, error_msg),
                        )
                        summary["failures"] += 1
                        continue

                    # Get last known price
                    cur.execute(get_query("scrape", "get_latest_price"), (vid,))
                    last = cur.fetchone()
                    if not last:
                        continue

                    old_price = float(last["price"])
                    old_unit = float(last["unit_price"])

                    # Calculate new price
                    if pid in forced_product_ids:
                        # Forced drop: 25-35% decrease
                        factor = 1 - FORCED_DROP_PCT - random.uniform(0, 0.10)
                    else:
                        # Normal fluctuation: ±5%
                        factor = 1 + random.uniform(-NORMAL_FLUCTUATION, NORMAL_FLUCTUATION)

                    new_price = round(max(old_price * factor, 0.01), 2)
                    new_unit = round(max(old_unit * factor, 0.0001), 4)

                    cur.execute(
                        get_query("scrape", "insert_price_record"),
                        (vid, new_price, new_unit, job_id),
                    )
                    items_scraped += 1
                    summary["prices_recorded"] += 1

                    # Track forced drops for the summary
                    if pid in forced_product_ids and factor < 0.8:
                        drop_pct = round((1 - factor) * 100, 1)
                        summary["forced_drops"].append({
                            "variant_id": vid,
                            "product_id": pid,
                            "old_price": old_price,
                            "new_price": new_price,
                            "drop_pct": drop_pct,
                        })

                # Update job status
                cur.execute(
                    get_query("scrape", "update_job_success"),
                    (items_scraped, job_id),
                )

            # Check and trigger price alerts
            cur.execute(get_query("scrape", "check_triggered_alerts"))
            triggered = cur.fetchall()
            for alert in triggered:
                cur.execute(get_query("scrape", "trigger_alert"), (alert["alert_id"],))
                summary["alerts_triggered"] += 1

        return jsonify({
            "success": True,
            "message": f"Scrape complete: {summary['prices_recorded']} prices, "
                       f"{summary['failures']} failures, "
                       f"{summary['alerts_triggered']} alerts triggered",
            **summary,
        })
    finally:
        conn.close()
