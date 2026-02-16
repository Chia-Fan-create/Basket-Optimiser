from db.models import Product
from datetime import datetime
from sqlalchemy import func
import uuid
from types import SimpleNamespace

'''
    ProductRepository is a repository wrapper to insert products using an external session.
    It provides a method to insert products and another to retrieve the latest prices by product.
'''

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

        results = (
            self.db.query(Product)
            .filter(Product.title.ilike(f"%{keyword}%"))
            .order_by(Product.price_per_unit.asc())
            .all()
        )

        mapped = []
        for r in results:
            mapped.append({
                "product_name": r.title,
                "store_name": r.store,
                "product_url": r.url,
                "price_per_unit": r.price_per_unit,
                "normalized_unit": r.normalized_unit,
                "price": r.price,
                "timestamp": r.timestamp
            })

        return mapped
