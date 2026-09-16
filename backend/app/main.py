"""
CyberGuard AI — FastAPI Application Entry Point
"""
import os
import logging
import asyncio
import uuid
import time
from contextlib import asynccontextmanager
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.database import Base, engine, SessionLocal, get_db

# ── Import all models so SQLAlchemy registers them before create_all ──────────
import app.models  # noqa: F401

# ── Logging Configuration with Rotation ────────────────────────────────────────
os.makedirs("logs", exist_ok=True)

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),  # Console output
        RotatingFileHandler(
            'logs/cyberguard.log',
            maxBytes=10*1024*1024,  # 10 MB
            backupCount=5,
            encoding='utf-8'
        )
    ]
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Application startup and shutdown lifecycle."""
    
    # ── Validate Configuration ─────────────────────────────────────────────────
    logger.info("Validating configuration...")
    try:
        if not settings.DATABASE_URL:
            raise ValueError("DATABASE_URL is not configured")
        if not settings.JWT_SECRET_KEY or settings.JWT_SECRET_KEY == "root":
            logger.warning("Using default JWT_SECRET_KEY. Change this in production!")
        if settings.ENVIRONMENT == "production" and settings.JWT_SECRET_KEY == "root":
            raise ValueError("Cannot use default JWT_SECRET_KEY in production")
        logger.info(f"Configuration validated. Environment: {settings.ENVIRONMENT}")
    except Exception as exc:
        logger.critical(f"Configuration validation failed: {exc}")
        raise
    
    # ── Validate Database Connection ───────────────────────────────────────────
    logger.info("Validating database connection...")
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection validated.")
    except Exception as exc:
        logger.critical(f"Database connection failed: {exc}")
        raise
    
    # ── Create tables ──────────────────────────────────────────────────────────
    logger.info("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables ready.")
    except Exception as exc:
        logger.error(f"Failed to create database tables: {exc}")
        raise

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
    sim_task = None
    try:
        sim_task = asyncio.create_task(simulation_service.start(SessionLocal))
        logger.info(f"Simulation service started (interval: {settings.SIMULATION_INTERVAL_SECONDS}s).")
    except Exception as exc:
        logger.error(f"Failed to start simulation service: {exc}. Continuing without simulation.")

    # ── Static files directory ─────────────────────────────────────────────────
    os.makedirs("static/avatars", exist_ok=True)
    
    logger.info("Application startup complete.")
    
    yield  # Application runs here

    # ── Shutdown ───────────────────────────────────────────────────────────────
    logger.info("Shutting down services...")
    
    if sim_task:
        logger.info("Stopping simulation service...")
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
    description="""
    AI/ML-based network threat detection and security monitoring system.
    
    ## Features:
    - **Real-time threat detection** with machine learning
    - **Network monitoring** and device management
    - **Geolocation tracking** of threats
    - **Notification system** (Email, SMS, Push)
    - **Admin dashboard** with analytics
    """,
    version="1.0.0",
    lifespan=lifespan,
    contact={
        "name": "CyberGuard AI Team",
        "email": "support@cyberguard.ai",
    },
    license_info={
        "name": "Proprietary",
    },
)

# ── CORS Configuration ─────────────────────────────────────────────────────────
if settings.ENVIRONMENT == "production":
    # Strict CORS for production
    allowed_origins = settings.FRONTEND_URL.split(",") if settings.FRONTEND_URL else []
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )
    logger.info(f"Production CORS: Allowing origins {allowed_origins}")
else:
    # Permissive CORS for development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info("Development CORS: Allowing all origins")

# ── Request ID Middleware ──────────────────────────────────────────────────────
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID and process time to each request."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(round(process_time, 4))
    
    # Log slow requests
    if process_time > 1.0:  # Log requests taking more than 1 second
        logger.warning(
            f"Slow request - ID: {request_id}, "
            f"Path: {request.method} {request.url.path}, "
            f"Time: {process_time:.2f}s"
        )
    
    return response

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
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint — verify DB and ML model status."""
    from sqlalchemy import text
    from datetime import datetime
    
    # Check database
    db_status = "connected"
    db_latency_ms = None
    try:
        start_time = time.time()
        db.execute(text("SELECT 1"))
        db_latency_ms = round((time.time() - start_time) * 1000, 2)
    except Exception as e:
        logger.error(f"Health check DB error: {e}")
        db_status = "error"
    
    # Check ML model
    from app.ml.model import get_predictor
    predictor = get_predictor()
    ml_status = "loaded" if predictor.is_loaded else "not_loaded"
    
    # Check simulation service
    from app.services.simulation_service import simulation_service
    sim_status = "running" if hasattr(simulation_service, 'is_running') and simulation_service.is_running else "stopped"
    
    # Determine overall status
    is_healthy = db_status == "connected" and ml_status == "loaded"
    
    return {
        "status": "healthy" if is_healthy else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": db_status,
            "latency_ms": db_latency_ms
        },
        "ml_model": ml_status,
        "simulation_service": sim_status
    }


# ── Root endpoint ──────────────────────────────────────────────────────────────
@app.get("/", tags=["system"])
def root():
    """Root endpoint with API information."""
    return {
        "name": "CyberGuard AI API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "health": "/health"
    }


# ── Global exception handler ───────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    client_ip = request.client.host if request.client else "unknown"
    
    logger.error(
        f"Unhandled exception - Request ID: {request_id}, "
        f"Method: {request.method}, Path: {request.url.path}, "
        f"Client: {client_ip}, Error: {str(exc)}",
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please try again.",
            "request_id": request_id,
            "timestamp": time.time()
        },
    )