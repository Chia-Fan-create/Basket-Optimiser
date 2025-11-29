from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from db.models import Product, Base
from datetime import datetime
import os
import uuid

# 設定你的連線字串 (from .env or config.py)
# 如果 DB_URL 環境變數未設定，預設使用 SQLite 進行開發
DB_URL = os.getenv("DB_URL") or "sqlite:///./basket.db"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if "sqlite" in DB_URL else {})
Session = sessionmaker(bind=engine)
Base.metadata.create_all(engine)

def insert_products(data: list[dict]):
    session = Session()
    try:
        for item in data:
            product = Product(
                id=str(uuid.uuid4()),
                title=item.get("title"),
                price=item.get("price"),
                unit=item.get("unit"),
                normalized_unit_qty=item.get("normalized_unit_qty"),
                normalized_unit=item.get("normalized_unit"),
                price_per_unit=item.get("price_per_unit"),
                store=item.get("store"),
                url=item.get("url"),
                timestamp=datetime.now()
            )
            session.add(product)
        session.commit()
    except Exception as e:
        session.rollback()
        print("❌ Error inserting to DB:", e)
    finally:
        session.close()
