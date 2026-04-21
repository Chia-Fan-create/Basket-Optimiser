import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "167.71.90.83")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_NAME = os.getenv("DB_NAME", "smartcart")
DB_USER = os.getenv("DB_USER", "joj161")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))
