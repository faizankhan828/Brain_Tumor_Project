from __future__ import annotations

import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Scan, User
from app.schemas import HistoryResponse, HistoryScan
from app.security import get_current_user


router = APIRouter(prefix="/api", tags=["history"])


@router.get("/history", response_model=HistoryResponse)
def get_history(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HistoryResponse:
    base_query = db.query(Scan).filter(Scan.user_id == current_user.id)
    total = base_query.count()
    scans = (
        base_query.order_by(desc(Scan.timestamp))
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    items = [
        HistoryScan(
            scan_id=scan.id,
            filename=scan.filename,
            predicted_class=scan.predicted_class,
            confidence=scan.confidence,
            date=scan.timestamp,
                thumbnail=scan.heatmap_path,
        )
        for scan in scans
    ]

    total_pages = math.ceil(total / size) if total else 0
    return HistoryResponse(items=items, page=page, size=size, total=total, pages=total_pages)