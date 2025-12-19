from __future__ import annotations
from typing import List, Dict
import re


def clean_amazon(item: dict) -> dict:
    # price field can be None (explicit null) in some datasets; guard against that
    price_obj = item.get("price") or {}
    title = item.get("title")
    return {
        "title": title,
        "price": price_obj.get("value"),
        "unit": extract_unit(title),
        "store": "Amazon",
        "url": item.get("url")
    }


def clean_target(item: dict) -> dict:
    title = item.get("title")
    price_obj = item.get("price") or {}
    price = price_obj.get("current_retail")
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
    # priceInfo may be missing or price may be None
    price_info = item.get("priceInfo") or {}
    price_str = price_info.get("price") or "$0"
    try:
        price = float(str(price_str).replace("$", ""))
    except (ValueError, TypeError):
        price = None
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
