"""
CyberGuard AI — FastAPI Application Entry Point
"""
import os
import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine, SessionLocal

# ── Import all models so SQLAlchemy registers them before create_all ──────────
import app.models  # noqa: F401

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Application startup and shutdown lifecycle."""
    # ── Create tables ──────────────────────────────────────────────────────────
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ready.")

    # ── Train ML model if not present ─────────────────────────────────────────
    model_dir = os.path.join(os.path.dirname(__file__), "ml", "models")
    rf_path = os.path.join(model_dir, "rf_model.pkl")
    if not os.path.exists(rf_path):
        logger.info("ML models not found. Training now (this takes ~60 seconds)...")
        try:
            from app.ml.train import train_and_save
            train_and_save()
            logger.info("ML model training complete.")
        except Exception as exc:
            logger.error(f"ML training failed: {exc}. Run 'python -m app.ml.train' manually.")
    else:
        logger.info("ML models found. Loading...")

    # ── Load ML models ─────────────────────────────────────────────────────────
    try:
        from app.ml.model import get_predictor
        predictor = get_predictor()
        if predictor.is_loaded:
            logger.info("ML models loaded successfully.")
        else:
            logger.warning("ML models failed to load. Threat detection will be unavailable.")
    except Exception as exc:
        logger.error(f"Could not load ML models: {exc}")

    # ── Start simulation service ───────────────────────────────────────────────
    from app.services.simulation_service import simulation_service
    sim_task = asyncio.create_task(simulation_service.start(SessionLocal))
    logger.info(f"Simulation service started (interval: {settings.SIMULATION_INTERVAL_SECONDS}s).")

    # ── Static files directory ─────────────────────────────────────────────────
    os.makedirs("static/avatars", exist_ok=True)

    yield  # Application runs here

    # ── Shutdown ───────────────────────────────────────────────────────────────
    logger.info("Shutting down simulation service...")
    simulation_service.stop()
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass
    logger.info("Application shutdown complete.")


# ── FastAPI App ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CyberGuard AI — Threat Detection API",
    description="AI/ML-based network threat detection and security monitoring system.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files ───────────────────────────────────────────────────────────────
os.makedirs("static/avatars", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Routers ────────────────────────────────────────────────────────────────────
from app.routers import (  # noqa: E402
    auth, dashboard, threats, devices, analytics,
    geo, notifications, blocked_ips, profile,
    websocket, admin, ai_agents
)
from app.routers import settings as settings_router  # noqa: E402

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(threats.router)
app.include_router(devices.router)
app.include_router(analytics.router)
app.include_router(geo.router)
app.include_router(notifications.router)
app.include_router(blocked_ips.router)
app.include_router(profile.router)
app.include_router(settings_router.router)
app.include_router(websocket.router)
app.include_router(admin.router)
app.include_router(ai_agents.router)


# ── Health Check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
def health_check():
    """Health check endpoint — verify DB and ML model status."""
    from sqlalchemy import text
    db = SessionLocal()
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Health check DB error: {e}")
        db_status = "error"
    finally:
        db.close()

    from app.ml.model import get_predictor
    predictor = get_predictor()
    ml_status = "loaded" if predictor.is_loaded else "not_loaded"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "ml_model": ml_status,
        "version": "1.0.0",
    }


# ── Global exception handler ───────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
    )
