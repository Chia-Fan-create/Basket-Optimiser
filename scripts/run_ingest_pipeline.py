# scripts/run_ingest_pipeline.py
import json
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from transformers.cleaner import clean_all
from transformers.unit_converter import convert_row
from db.session import SessionLocal
from db.repository import ProductRepository

def infer_store_from_filename(filename: str) -> str:
    name = filename.lower()
    if "amazon" in name:
        return "amazon"
    if "walmart" in name:
        return "walmart"
    if "target" in name:
        return "target"
    raise ValueError(f"Unknown store for file: {filename}")


def load_json(file_path: str):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def run_pipeline_on_dataset_folder(dataset_dir: str):
    dataset_path = Path(dataset_dir)

    db = SessionLocal()
    repo = ProductRepository(db)

    for file in dataset_path.glob("*.json"):
        store = infer_store_from_filename(file.name)
        print(f"\n Processing {file.name} ({store})")

        raw_data = load_json(file)
        cleaned = clean_all(raw_data, store)
        converted = [convert_row(item) for item in cleaned]

        repo.insert_products(converted)
        print(f" Inserted {len(converted)} records")

    db.close()

def run_pipeline(file_path: str, store: str):
    print(f"Loading raw data from: {file_path}")
    raw_data = load_json(file_path)

    print(f"Cleaning data for store: {store}")
    cleaned = clean_all(raw_data, store)

    print("Converting units and computing price_per_unit")
    converted = [convert_row(item) for item in cleaned]

    print(f"Inserting {len(converted)} items into DB...")
    db = SessionLocal()
    repo = ProductRepository(db)
    repo.insert_products(converted)
    db.close()

    print("Done!")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python run_ingest_pipeline.py <dataset_folder>")
    else:
        run_pipeline_on_dataset_folder(sys.argv[1])

