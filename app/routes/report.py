from __future__ import annotations

import io
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.config import STATIC_DIR
from app.database import get_db
from app.models import Scan, User
from app.report import build_scan_report_pdf
from app.schemas import CLASSES
from app.security import get_current_user
from app.utils.preprocess import preprocess_image


router = APIRouter(prefix="/api", tags=["report"])


@router.get("/report/{scan_id}")
def download_report(
    scan_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scan = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == current_user.id).first()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    original_path = STATIC_DIR / "uploads" / Path(scan.heatmap_path).name
    if not original_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original image not found")

    model = getattr(request.app.state, "model", None)
    if model is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Prediction model is unavailable")

    probabilities = model.predict(preprocess_image(original_path), verbose=0)[0].tolist()
    if len(probabilities) != len(CLASSES):
        probabilities = probabilities[: len(CLASSES)]

    pdf_bytes = build_scan_report_pdf(user=current_user, scan=scan, probabilities=probabilities)
    filename = f"scan_{scan.id}_report.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )