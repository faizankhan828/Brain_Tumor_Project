"""
app/schemas.py

Pydantic Schemas for Request/Response Validation
------------------------------------------------
Defines structured response formats for the API.
"""

from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field


CLASSES = ["glioma", "meningioma", "notumor", "pituitary"]


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    created_at: datetime


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    role: str | None = None


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class HistoryScan(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    scan_id: int
    filename: str
    predicted_class: str
    confidence: float
    date: datetime
    thumbnail: str


class HistoryResponse(BaseModel):
    items: List[HistoryScan]
    page: int
    size: int
    total: int
    pages: int


class PredictResponse(BaseModel):
    """
    Response schema for the prediction endpoint.
    """
    predicted_class: str = Field(..., alias="class", description="Predicted tumor classification class")
    scan_id: int = Field(..., description="Database identifier for the saved scan")
    confidence: float = Field(..., description="Prediction confidence score between 0.0 and 1.0")
    probabilities: List[float] = Field(..., description="Array of probabilities for all 4 classes in alphabetical order")
    heatmap_base64: str = Field(..., description="Base64-encoded PNG image showing the Grad-CAM heatmap overlay")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "class": "glioma",
                "scan_id": 1,
                "confidence": 0.9452,
                "probabilities": [0.9452, 0.0210, 0.0118, 0.0220],
                "heatmap_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
            }
        }


class HealthResponse(BaseModel):
    """
    Response schema for the health check endpoint.
    """
    status: str = Field(..., description="API operational status")
    model_status: str = Field(..., description="Status of the TensorFlow model (loaded / instantiated_fallback)")
    version: str = Field(..., description="API application version")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "model_status": "loaded",
                "version": "1.0.0"
            }
        }
