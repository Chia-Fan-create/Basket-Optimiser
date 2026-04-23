import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "167.71.90.83")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_NAME = os.getenv("DB_NAME", "smartcart")
DB_USER = os.getenv("DB_USER")
if not DB_USER:
    raise RuntimeError(
        "DB_USER environment variable is required. "
        "Copy .env.example to .env and fill in your credentials."
    )
DB_PASSWORD = os.getenv("DB_PASSWORD")
if DB_PASSWORD is None:
    raise RuntimeError(
        "DB_PASSWORD environment variable is required. "
        "Copy .env.example to .env and fill in your credentials."
    )
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))
