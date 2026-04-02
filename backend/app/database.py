from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from pathlib import Path
import os  # ✅ NEW
import time  # ✅ NEW

# 🔐 LOAD ENV VARIABLES (ADD THIS)
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.exc import OperationalError  # ✅ NEW
from sqlalchemy.exc import OperationalError  # ✅ NEW

# Database path
BASE_DIR = Path(__file__).resolve().parent.parent

# 🔥 NEW: Support ENV-based DB (Docker → PostgreSQL, Local → SQLite)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{BASE_DIR / 'soc.db'}"
)

# 🔥 Detect SQLite or Postgres
is_sqlite = DATABASE_URL.startswith("sqlite")

# 🔥 Improved Engine Configuration
engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 30
    } if is_sqlite else {},  # ✅ only for SQLite
    pool_pre_ping=True,
)

# 🔥 NEW: Retry DB connection (important for Docker/Postgres)
MAX_RETRIES = 10
for i in range(MAX_RETRIES):
    try:
        with engine.connect() as conn:
            print("✅ Database connected")
        break
    except OperationalError:
        print(f"⏳ Waiting for DB... ({i+1}/{MAX_RETRIES})")
        time.sleep(3)

# ✅ Enable WAL mode ONLY for SQLite
if is_sqlite:
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL;"))
        conn.execute(text("PRAGMA synchronous=NORMAL;"))

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# 🔹 Import models AFTER Base definition to avoid circular import
from app.models.incident import Incident


# Dependency for routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()