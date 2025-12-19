import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use environment DB_URL or fall back to local SQLite for development
DB_URL = os.getenv("DB_URL") or "sqlite:///./basket.db"

ENGINE_KWARGS = {"check_same_thread": False} if "sqlite" in DB_URL else {}

engine = create_engine(DB_URL, connect_args=ENGINE_KWARGS)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Ensure models are created when the session module is imported
try:
    from db.models import Base
    Base.metadata.create_all(bind=engine)
except Exception:
    # If models cannot be imported yet, ignore and allow repository to create later
    pass
