from __future__ import annotations
import re

# Expand:
# 1. multiple unit parsing, e.g. "5 packs of 6 rolls" or "40 x 16.9 oz"
# 2. Category Alias ​​Handling, e.g. ct/ count
# 3. combine with production cataegory, e.g. water using ml, protein bar using unit
# 4. sum multiple units, e.g. 24x2 oz > 48 oz

# Basic unit converter（expandable based on product category)
UNIT_MAP = {
    "oz": ("ml", 29.5735),         # oz to ml
    "fl oz": ("ml", 29.5735),
    "g": ("g", 1),
    "kg": ("g", 1000),
    "ml": ("ml", 1),
    "l": ("ml", 1000),
    "count": ("unit", 1),
    "ct": ("unit", 1),
    "bars": ("unit", 1),
    "packs": ("unit", 1),
    "tablets": ("unit", 1),
    "sheets": ("unit", 1),
    "rolls": ("unit", 1)
}

def parse_unit_text(unit_str: str | None) -> tuple[float | None, str | None]:
    if not unit_str:
        return None, None

    unit_str = unit_str.lower()

    # ----------------------------
    # 1 Pattern: 24 x 2 oz
    # ----------------------------
    multi_match = re.search(
        r"(\d+)\s*[xX]\s*(\d+(\.\d+)?)\s*(oz|fl oz|g|kg|ml|l|count|ct|bars|packs|tablets|sheets|rolls)",
        unit_str
    )

    if multi_match:
        outer = float(multi_match.group(1))
        inner = float(multi_match.group(2))
        raw_unit = multi_match.group(4)

        total_quantity = outer * inner

        if raw_unit in UNIT_MAP:
            std_unit, factor = UNIT_MAP[raw_unit]
            return round(total_quantity * factor, 2), std_unit
        else:
            return total_quantity, raw_unit

    # ----------------------------
    # 2 Pattern: 40 pack of 16.9 oz
    # ----------------------------
    pack_match = re.search(
        r"(\d+)\s*pack[s]?\s*(of)?\s*(\d+(\.\d+)?)\s*(oz|fl oz|g|kg|ml|l|count|ct|bars|tablets|sheets|rolls)",
        unit_str
    )

    if pack_match:
        outer = float(pack_match.group(1))
        inner = float(pack_match.group(3))
        raw_unit = pack_match.group(5)

        total_quantity = outer * inner

        if raw_unit in UNIT_MAP:
            std_unit, factor = UNIT_MAP[raw_unit]
            return round(total_quantity * factor, 2), std_unit
        else:
            return total_quantity, raw_unit

    # ----------------------------
    # 3 Fallback: single unit
    # ----------------------------
    single_match = re.search(
        r"([\d,.]+)\s*(oz|fl oz|g|kg|ml|l|count|ct|bars|packs|tablets|sheets|rolls)",
        unit_str
    )

    if single_match:
        quantity = float(single_match.group(1).replace(",", ""))
        raw_unit = single_match.group(2)

        if raw_unit in UNIT_MAP:
            std_unit, factor = UNIT_MAP[raw_unit]
            return round(quantity * factor, 2), std_unit
        else:
            return quantity, raw_unit

    return None, None


def convert_row(row: dict) -> dict:
    """
    Add normalized quantity/unit and computed price_per_unit fields.
    """
    qty, unit = parse_unit_text(row.get("unit"))
    row["normalized_unit_qty"] = qty
    row["normalized_unit"] = unit

    price = row.get("price")
    if price is None:
        row["price_per_unit"] = None
        row["price_per_unit_status"] = "missing_price"
        return row
    if qty is None or qty == 0:
        row["price_per_unit"] = None
        row["price_per_unit_status"] = "missing_or_zero_qty"
        return row
    if not isinstance(price, (int, float)):
        row["price_per_unit"] = None
        row["price_per_unit_status"] = "invalid_price_type"
        return row

    row["price_per_unit"] = round(price / qty, 3)
    row["price_per_unit_status"] = "OK"
    return row
