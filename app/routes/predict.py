"""
app/routes/predict.py

Inference Route — Brain Tumor MRI Prediction & Grad-CAM Visualisation
-------------------------------------------------------------------
Accepts an UploadFile, validates it, preprocesses it, runs model prediction,
runs Grad-CAM from scratch, and returns the response JSON.
"""

from __future__ import annotations

import base64
import io
from pathlib import Path
from PIL import Image
import numpy as np

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import STATIC_DIR
from app.database import get_db
from app.models import Scan, User
from app.schemas import PredictResponse
from app.utils.preprocess import preprocess_image, CLASSES
from app.utils.gradcam import generate_gradcam
from app.security import get_current_user

router = APIRouter(prefix="/api", tags=["prediction"])

@router.post("/predict", response_model=PredictResponse)
async def predict_mri(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PredictResponse:
    """
    Accepts an MRI scan image, predicts the tumor category, and generates
    a Grad-CAM heat-map visualization of the prediction region.
    """
    # ─── 1. Content Type & Extension Validation ──────────────────────────────
    content_type = file.content_type
    filename = file.filename or ""
    suffix = Path(filename).suffix.lower()

    valid_types = ["image/jpeg", "image/png"]
    valid_suffixes = [".jpg", ".jpeg", ".png"]

    if (content_type and content_type not in valid_types) or (not content_type and suffix not in valid_suffixes):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only JPEG and PNG formats are accepted. (Got: {content_type or suffix})"
        )

    # ─── 2. File Size Validation (15MB Limit) ─────────────────────────────────
    MAX_SIZE = 15 * 1024 * 1024  # 15 Megabytes
    file_bytes = await file.read()
    
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of 15MB. (Size: {len(file_bytes) / (1024 * 1024):.2f}MB)"
        )

    # ─── 3. Dimension Validation (>= 50px) ────────────────────────────────────
    try:
        # Load in PIL to inspect size
        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.size
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Corrupted or invalid image file. Could not parse format. Error: {exc}"
        )

    if width < 50 or height < 50:
        raise HTTPException(
            status_code=400,
            detail=f"Image dimensions too small ({width}x{height}px). Scans must be at least 50x50 pixels."
        )

    # ─── 4. Preprocess Image ──────────────────────────────────────────────────
    try:
        preprocessed_img = preprocess_image(file_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to preprocess the image: {exc}"
        )

    # ─── 5. Inference ─────────────────────────────────────────────────────────
    model = getattr(request.app.state, "model", None)
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Prediction model is currently loading or unavailable."
        )

    try:
        preds = model.predict(preprocessed_img, verbose=0)
        probabilities = preds[0].tolist()
        pred_idx = int(np.argmax(probabilities))
        pred_class = CLASSES[pred_idx]
        confidence = float(probabilities[pred_idx])
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction error: {exc}"
        )

    # ─── 6. Grad-CAM Generation ───────────────────────────────────────────────
    try:
        heatmap_base64 = generate_gradcam(
            model=model,
            preprocessed_img=preprocessed_img,
            original_source=file_bytes,
            class_idx=pred_idx,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Grad-CAM visualization failed: {exc}"
        )

    scan = Scan(
        user_id=current_user.id,
        filename=filename,
        predicted_class=pred_class,
        confidence=confidence,
        heatmap_path="",
    )
    db.add(scan)
    db.flush()

    artifact_name = f"scan_{scan.id}.png"
    original_path = STATIC_DIR / "uploads" / artifact_name
    heatmap_path = STATIC_DIR / "heatmaps" / artifact_name

    try:
        Image.open(io.BytesIO(file_bytes)).convert("RGB").save(original_path, format="PNG")
        heatmap_path.write_bytes(base64.b64decode(heatmap_base64))
        scan.heatmap_path = f"/static/heatmaps/{artifact_name}"
        db.commit()
        db.refresh(scan)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to persist scan artifacts: {exc}") from exc

    # ─── 7. Return Formatted Response ─────────────────────────────────────────
    return PredictResponse(
        predicted_class=pred_class,
        scan_id=scan.id,
        confidence=confidence,
        probabilities=probabilities,
        heatmap_base64=heatmap_base64
    )
