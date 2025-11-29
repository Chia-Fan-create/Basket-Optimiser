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
    """
    e.g. string '12 rolls', '16.9 oz', '500 count' transfer to (quantity, standardized_unit)
    """
    if not unit_str:
        return None, None

    unit_str = unit_str.lower()

    # pick number and unit, e.g. 12 rolls
    match = re.search(r"([\d,.]+)\s*(oz|fl oz|g|kg|ml|l|count|ct|bars|packs|tablets|sheets|rolls)", unit_str)
    if not match:
        return None, None

    quantity = float(match.group(1).replace(",", ""))
    raw_unit = match.group(2).strip()

    # conversion
    if raw_unit in UNIT_MAP:
        std_unit, factor = UNIT_MAP[raw_unit]
        std_quantity = quantity * factor
        return round(std_quantity, 2), std_unit
    else:
        return quantity, raw_unit


def convert_row(row: dict) -> dict:
    """
    Input the product info,
    add "normalized_unit_qty" and "normalized_unit" columns
    """
    qty, unit = parse_unit_text(row.get("unit"))
    row["normalized_unit_qty"] = qty
    row["normalized_unit"] = unit
    if qty and "price" in row:
        row["price_per_unit"] = round(row["price"] / qty, 4)
    else:
        row["price_per_unit"] = None
    return row

