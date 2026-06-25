"""
app/main.py

FastAPI Application Entry Point
--------------------------------
Initialises the FastAPI server, registers routes, configures CORS,
and loads the TensorFlow/Keras model during lifecycle startup.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from contextlib import asynccontextmanager

import tensorflow as tf
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import STATIC_DIR, UPLOAD_DIR, HEATMAP_DIR
from app.database import Base, engine
from app.model import build_model
from app.schemas import HealthResponse
from app.routes.auth import router as auth_router
from app.routes.history import router as history_router
from app.routes.report import router as report_router
from app.routes.predict import router as predict_router
from app.models import Scan, User  # noqa: F401

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BrainTumorAPI")

# ─── Model Lifecycle Manager ──────────────────────────────────────────────────

MODEL_LOADED = False

STATIC_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
HEATMAP_DIR.mkdir(parents=True, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage model loading lifecycle.
    Loads the best trained checkpoint, or instantiates a fresh architecture
    with pretrained ImageNet weights if the checkpoint is missing.
    """
    global MODEL_LOADED
    
    base_dir = Path(__file__).resolve().parent.parent
    models_dir = base_dir / "models"
    model_path = models_dir / "brain_tumor_model.h5"

    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    HEATMAP_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)

    logger.info("Initializing Brain Tumor MRI Model...")
    
    try:
        if model_path.exists():
            logger.info(f"Loading trained checkpoint from {model_path}...")
            app.state.model = tf.keras.models.load_model(str(model_path))
            MODEL_LOADED = True
            logger.info("Trained model successfully loaded.")
        else:
            logger.warning(f"No checkpoint found at {model_path}.")
            logger.warning("Instantiating fresh model architecture with ImageNet weights...")
            
            # Ensure models directory exists
            models_dir.mkdir(parents=True, exist_ok=True)
            
            # Instantiate model structure
            app.state.model = build_model()
            
            # Save the initialized model so it is cached locally
            app.state.model.save(str(model_path))
            MODEL_LOADED = False
            logger.info(f"Fresh model saved to {model_path} for immediate testing.")
            
    except Exception as exc:
        logger.error(f"Error loading prediction model: {exc}")
        # In worst case, keep model None or load structure
        app.state.model = None
        MODEL_LOADED = False

    yield
    
    # Clean up state if necessary
    logger.info("Shutting down Brain Tumor API.")


# ─── FastAPI App Initialization ───────────────────────────────────────────────

app = FastAPI(
    title="Brain Tumor MRI Classification & Grad-CAM API",
    description="FastAPI backend serving MRI scans classification with visual explanation heatmap using Grad-CAM",
    version="1.0.0",
    lifespan=lifespan,
)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# ─── CORS Middleware ──────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    # Read allowed origins from env var — comma-separated list.
    # Default "*" is kept for local dev; always set ALLOWED_ORIGINS in production.
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Router Registration ──────────────────────────────────────────────────────

app.include_router(predict_router)
app.include_router(auth_router)
app.include_router(history_router)
app.include_router(report_router)


# ─── Health Check Endpoint ────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint returning the status of the service and prediction model.
    """
    status = "healthy"
    if not MODEL_LOADED:
        model_status = "instantiated_fallback"
    else:
        model_status = "loaded"
        
    return HealthResponse(
        status=status,
        model_status=model_status,
        version="1.0.0"
    )
