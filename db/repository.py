from db.models import Product
from datetime import datetime
from sqlalchemy import func
import uuid
from types import SimpleNamespace


class ProductRepository:
    """Repository wrapper to insert products using an external session.

    Usage:
        db = SessionLocal()
        repo = ProductRepository(db)
        repo.insert_products(data)
        db.close()
    """

    def __init__(self, db_session):
        self.db = db_session

    def insert_products(self, data: list[dict]):
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
                    price_per_unit_status=item.get("price_per_unit_status"),
                    store=item.get("store"),
                    url=item.get("url"),
                    timestamp=datetime.now()
                )
                self.db.add(product)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            print("❌ Error inserting to DB:", e)
    
    def get_latest_prices_by_product(self, keyword: str):
        subq = (
            self.db.query(
                Product.store,
                func.max(Product.timestamp).label("latest_ts")
            )
            .filter(Product.title.ilike(f"%{keyword}%"))
            .filter(Product.price_per_unit_status == "ok")
            .group_by(Product.store)
            .subquery()
        )

        results = (
            self.db.query(Product)
            .join(
                subq,
                (Product.store == subq.c.store) &
                (Product.timestamp == subq.c.latest_ts)
            )
            .order_by(Product.price_per_unit.asc())
            .all()
        )
        return results