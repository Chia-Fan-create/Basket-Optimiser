from sqlalchemy import Column, Float, String, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Product(Base):
    __tablename__ = 'products'

    id = Column(String(100), primary_key=True)
    title = Column(String(512))
    price = Column(Float)
    unit = Column(String(64))
    normalized_unit_qty = Column(Float)
    normalized_unit = Column(String(32))
    price_per_unit = Column(Float)
    store = Column(String(64))
    url = Column(String(512))
    timestamp = Column(DateTime)
