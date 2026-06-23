"""
app/utils/preprocess.py

Reusable Preprocessing Pipeline
---------------------------------
Shared by BOTH:
  • Training  → imported by data_loader.py & augment_meningioma.py
  • Inference → imported by the FastAPI /predict endpoint

Public API
----------
  preprocess_image(source)          → np.ndarray  shape (1, 224, 224, 3)
  preprocess_pil(pil_img)           → np.ndarray  shape (1, 224, 224, 3)
  preprocess_path(path)             → np.ndarray  shape (1, 224, 224, 3)
  decode_and_preprocess(raw_bytes)  → np.ndarray  shape (1, 224, 224, 3)
  IMG_SIZE, CLASSES, CLASS_LABELS   → constants re-exported for callers

Steps applied (in order)
-------------------------
  1. Open image (bytes / path / PIL Image accepted)
  2. Convert to 3-channel RGB  — grayscale MRI gets channels repeated
  3. Resize to 224×224 pixels  — ResNet50 / EfficientNet input size
  4. Cast to float32
  5. Normalise to [0, 1]        — divide by 255.0
  6. Add batch dimension        — shape becomes (1, 224, 224, 3)
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Union

import cv2                          # noqa: F401  (available for callers)
import numpy as np
from PIL import Image, UnidentifiedImageError

# ─── Constants (re-exported) ──────────────────────────────────────────────────
IMG_SIZE     = (224, 224)           # (height, width) — matches Keras convention
IMG_CHANNELS = 3                    # RGB
CLASSES      = ["glioma", "meningioma", "notumor", "pituitary"]
CLASS_LABELS = {i: c for i, c in enumerate(CLASSES)}

# ─── Internal helper ──────────────────────────────────────────────────────────

def _pil_to_array(pil_img: Image.Image) -> np.ndarray:
    """
    Convert a PIL Image to a normalised float32 ndarray of shape (224, 224, 3).

    Steps:
      • convert('RGB')  — repeats the single channel for grayscale MRI scans
      • resize to IMG_SIZE with high-quality Lanczos resampling
      • numpy → float32
      • divide by 255.0  → values in [0, 1]
    """
    rgb = pil_img.convert("RGB")                        # step 2: grayscale → RGB
    resized = rgb.resize(                               # step 3: resize 224×224
        (IMG_SIZE[1], IMG_SIZE[0]),                     # PIL uses (W, H)
        resample=Image.LANCZOS,
    )
    arr = np.array(resized, dtype=np.float32)           # step 4: cast
    arr /= 255.0                                        # step 5: normalise
    return arr                                          # shape (224, 224, 3)


# ─── Public API ───────────────────────────────────────────────────────────────

def preprocess_pil(pil_img: Image.Image) -> np.ndarray:
    """
    Preprocess a PIL Image object.

    Parameters
    ----------
    pil_img : PIL.Image.Image

    Returns
    -------
    np.ndarray  shape (1, 224, 224, 3), dtype float32, values in [0, 1]
    """
    arr = _pil_to_array(pil_img)
    return np.expand_dims(arr, axis=0)                  # step 6: batch dim


def preprocess_image(source: Union[io.IOBase, bytes, str, Path]) -> np.ndarray:
    """
    Primary entry-point for inference (FastAPI).

    Accepts:
      • file-like object  (e.g. UploadFile.file from FastAPI)
      • raw bytes
      • file path (str or Path)

    Returns
    -------
    np.ndarray  shape (1, 224, 224, 3), dtype float32, values in [0, 1]

    Raises
    ------
    ValueError  if the source cannot be opened as an image
    """
    try:
        if isinstance(source, (bytes, bytearray)):
            pil_img = Image.open(io.BytesIO(source))
        elif isinstance(source, (str, Path)):
            pil_img = Image.open(Path(source))
        else:
            # file-like: SpooledTemporaryFile, BytesIO, UploadFile.file, etc.
            pil_img = Image.open(source)
    except (UnidentifiedImageError, Exception) as exc:
        raise ValueError(f"Cannot open image from source {type(source)}: {exc}") from exc

    return preprocess_pil(pil_img)


def preprocess_path(path: Union[str, Path]) -> np.ndarray:
    """
    Convenience wrapper — preprocess a single image from a file path.

    Returns
    -------
    np.ndarray  shape (1, 224, 224, 3), dtype float32
    """
    return preprocess_image(Path(path))


def decode_and_preprocess(raw_bytes: bytes) -> np.ndarray:
    """
    Convenience alias for raw-bytes input (e.g. from FastAPI request body).

    Returns
    -------
    np.ndarray  shape (1, 224, 224, 3), dtype float32
    """
    return preprocess_image(raw_bytes)


# ─── Standalone smoke-test ────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    from pathlib import Path

    # Try with the first image found in the dataset
    base = Path(__file__).resolve().parents[2] / "dataset"
    test_img = next(base.rglob("*.jpg"), None) or next(base.rglob("*.jpeg"), None)

    if test_img is None:
        print("[ERROR] No .jpg images found under dataset/")
        sys.exit(1)

    print(f"Testing with: {test_img}")
    result = preprocess_path(test_img)

    print(f"  Output shape : {result.shape}")          # (1, 224, 224, 3)
    print(f"  dtype        : {result.dtype}")           # float32
    print(f"  min / max    : {result.min():.4f} / {result.max():.4f}")
    print(f"  mean         : {result.mean():.4f}")
    assert result.shape == (1, 224, 224, 3), "Shape mismatch!"
    assert result.dtype == np.float32,       "dtype should be float32"
    assert 0.0 <= result.min() and result.max() <= 1.0, "Values out of [0,1]"
    print("\n✅  preprocess.py smoke-test PASSED")
