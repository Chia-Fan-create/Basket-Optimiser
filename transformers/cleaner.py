from __future__ import annotations
from typing import List, Dict
import re


def clean_amazon(item: dict) -> dict:
    return {
        "title": item.get("title"),
        "price": item.get("price", {}).get("value"),
        "unit": extract_unit(item.get("title")),
        "store": "Amazon",
        "url": item.get("url")
    }


def clean_target(item: dict) -> dict:
    title = item.get("title")
    price = item.get("price", {}).get("current_retail")
    unit = extract_unit(title)
    return {
        "title": title,
        "price": price,
        "unit": unit,
        "store": "Target",
        "url": item.get("buy_url")
    }


def clean_walmart(item: dict) -> dict:
    title = item.get("name")
    price_str = item.get("priceInfo.price", "$0")
    price = float(price_str.replace("$", ""))
    unit = extract_unit(title)
    return {
        "title": title,
        "price": price,
        "unit": unit,
        "store": "Walmart",
        "url": None  # optional, depends if URL is scraped
    }


def extract_unit(text: str | None) -> str | None:
    if not text:
        return None
    # Match things like "12 rolls", "1000 sheets", "20 bars", etc.
    match = re.search(r"(\d+(,\d+)?\s*(rolls|bars|count|sheets|packs|tablets|oz|ml|ct))", text.lower())
    return match.group(0) if match else None


def clean_all(raw_data: List[dict], store: str) -> List[dict]:
    cleaned = []
    for item in raw_data:
        if store.lower() == "amazon":
            cleaned.append(clean_amazon(item))
        elif store.lower() == "target":
            cleaned.append(clean_target(item))
        elif store.lower() == "walmart":
            cleaned.append(clean_walmart(item))
    return cleaned
