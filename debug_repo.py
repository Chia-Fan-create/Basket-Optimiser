from db.session import SessionLocal
from db.repository import ProductRepository

db = SessionLocal()
repo = ProductRepository(db)

results = repo.get_latest_prices_by_product("Toilet")

print("Count:", len(results))
for r in results[:3]:
    print(r.title, r.store, r.price_per_unit)

db.close()
