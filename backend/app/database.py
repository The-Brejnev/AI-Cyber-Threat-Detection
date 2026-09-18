"""
Database configuration and session management.
"""
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool
from app.config import settings

logger = logging.getLogger(__name__)

# ── Database URL Configuration ────────────────────────────────────────────────
database_url = settings.DATABASE_URL
engine_kwargs = {}

# Configuration spécifique selon le type de base de données
if database_url.startswith("sqlite"):
    # SQLite : configuration pour le multi-threading
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    logger.info("Using SQLite database")
else:
    # PostgreSQL/MySQL : configuration du pool de connexions
    engine_kwargs.update({
        "pool_pre_ping": True,  # Vérifier la connexion avant utilisation
        "pool_size": 10,        # Taille du pool
        "max_overflow": 20,     # Connexions supplémentaires en cas de pic
        "pool_recycle": 3600,   # Recycler les connexions après 1 heure
        "pool_timeout": 30,     # Temout pour obtenir une connexion du pool
    })
    logger.info(f"Using database: {database_url.split('@')[-1] if '@' in database_url else 'configured database'}")

# ── Create Engine ─────────────────────────────────────────────────────────────
try:
    engine = create_engine(database_url, **engine_kwargs)
    
    # Test de connexion
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        logger.info(f"Successfully connected to database")
        
except Exception as e:
    logger.warning(f"Could not connect to configured DATABASE_URL ({e}). "
                   f"Falling back to local SQLite database for development.")
    
    # Fallback vers SQLite en cas d'échec
    sqlite_url = "sqlite:///./cyber_threat_detection.db"
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False}
    )
    logger.info("Using fallback SQLite database")

# ── Session Factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Garder les objets utilisables après commit
)

# ── Base Class for Models ─────────────────────────────────────────────────────
Base = declarative_base()


# ── Dependency for FastAPI ────────────────────────────────────────────────────
def get_db():
    """
    FastAPI dependency that provides a database session.
    
    Usage:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()  # Rollback en cas d'erreur
        raise
    finally:
        db.close()


# ── Utility Functions ─────────────────────────────────────────────────────────
def check_database_connection() -> bool:
    """
    Check if the database is reachable.
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return False


def get_database_info() -> dict:
    """
    Get information about the database configuration.
    
    Returns:
        dict: Database information
    """
    db_type = "sqlite" if database_url.startswith("sqlite") else "postgresql"
    
    # Masquer les informations sensibles
    safe_url = database_url
    if '@' in safe_url:
        # Masquer le mot de passe
        parts = safe_url.split('@')
        if ':' in parts[0]:
            user_pass = parts[0].split('://')[-1].split(':')
            if len(user_pass) == 2:
                safe_url = parts[0].replace(user_pass[1], '****') + '@' + parts[1]
    
    return {
        "type": db_type,
        "url": safe_url,
        "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else None,
        "is_connected": check_database_connection()
    }