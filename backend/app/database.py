import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

# Connect to database using DATABASE_URL
database_url = settings.DATABASE_URL
engine_kwargs = {}

if database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True

try:
    engine = create_engine(database_url, **engine_kwargs)
    # Test connection
    with engine.connect() as conn:
        logger.info(f"Successfully connected to primary database: {database_url.split('@')[-1] if '@' in database_url else database_url}")
except Exception as e:
    logger.warning(f"Could not connect to configured DATABASE_URL ({e}). Falling back to local SQLite database for development.")
    sqlite_url = "sqlite:///./cyber_threat_detection.db"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
