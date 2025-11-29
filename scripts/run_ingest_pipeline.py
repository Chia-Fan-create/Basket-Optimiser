import json
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from transformers.cleaner import clean_all
from transformers.unit_converter import convert_row
from db.repository import insert_products

def load_json(file_path: str):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def run_pipeline(file_path: str, store: str):
    print(f"📦 Loading raw data from: {file_path}")
    raw_data = load_json(file_path)

    print(f"🧼 Cleaning data for store: {store}")
    cleaned = clean_all(raw_data, store)

    print(f"⚖️ Converting units and computing price_per_unit")
    converted = [convert_row(item) for item in cleaned]

    print(f"🛢 Inserting {len(converted)} items into DB...")
    insert_products(converted)
    print("✅ Done!")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python run_ingest_pipeline.py <json_file_path> <store_name>")
    else:
        run_pipeline(sys.argv[1], sys.argv[2])
