"""
app/utils/data_loader.py

Data Loader  —  ImageDataGenerator + Class Balancing
------------------------------------------------------
Builds train / val / test generators ready for ResNet50 / EfficientNet.

Key features
------------
  • Augmentation (training only):
      rotation_range=20, horizontal_flip=True, zoom_range=0.15,
      brightness_range=[0.8, 1.2], shear_range=0.1,
      width_shift_range=0.10, height_shift_range=0.10

  • Meningioma 2× oversampling:
      augmented copies are written to  dataset/train_balanced/meningioma/
      before generators are built, so every subsequent training run benefits.

  • Class weights via sklearn.compute_class_weight:
      returned alongside generators and passed to model.fit(class_weight=...)

Usage
-----
    from app.utils.data_loader import get_generators

    train_gen, val_gen, test_gen, class_weights = get_generators()
    model.fit(
        train_gen,
        validation_data=val_gen,
        class_weight=class_weights,
        ...
    )
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path

import numpy as np
from sklearn.utils.class_weight import compute_class_weight   # type: ignore
from tensorflow.keras.preprocessing.image import (            # type: ignore
    ImageDataGenerator,
    img_to_array,
    load_img,
)

from app.utils.preprocess import IMG_SIZE, CLASSES

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR         = Path(__file__).resolve().parents[2]
DATASET_DIR      = BASE_DIR / "dataset"
TRAIN_DIR        = DATASET_DIR / "train"
TRAIN_BAL_DIR    = DATASET_DIR / "train_balanced"   # oversampled copy
VAL_DIR          = DATASET_DIR / "val"
TEST_DIR         = DATASET_DIR / "test"

# ─── Constants ────────────────────────────────────────────────────────────────
BATCH_SIZE  = 32
COLOR_MODE  = "rgb"
CLASS_MODE  = "categorical"
SEED        = 42

# Augmentation parameters (spec-exact)
AUG_PARAMS = dict(
    rescale            = 1.0 / 255.0,
    rotation_range     = 20,
    horizontal_flip    = True,
    zoom_range         = 0.15,
    brightness_range   = [0.8, 1.2],
    shear_range        = 0.1,
    width_shift_range  = 0.10,
    height_shift_range = 0.10,
    fill_mode          = "nearest",
)

OVERSAMPLE_CLASS  = "meningioma"
OVERSAMPLE_FACTOR = 2            # generate 2× extra augmented copies


# ─── Meningioma Oversampling ──────────────────────────────────────────────────

def _build_aug_datagen_no_rescale() -> ImageDataGenerator:
    """Augmentation generator WITHOUT rescale (for pixel-level saving)."""
    p = {k: v for k, v in AUG_PARAMS.items() if k != "rescale"}
    return ImageDataGenerator(**p)


def oversample_meningioma(
    train_dir: Path    = TRAIN_DIR,
    out_dir:   Path    = TRAIN_BAL_DIR,
    factor:    int     = OVERSAMPLE_FACTOR,
    seed:      int     = SEED,
) -> Path:
    """
    Copy all training images to *out_dir*, then generate *factor* extra
    augmented copies of every meningioma image and save them there.

    The balanced directory mirrors the original layout:
        out_dir/
            glioma/
            meningioma/        ← original + augmented copies
            notumor/
            pituitary/

    Returns
    -------
    Path  — the balanced training directory (TRAIN_BAL_DIR)
    """
    np.random.seed(seed)

    # ── Step 1: copy all original images flat ───────────────────────────────
    print(f"\n🔁  Building balanced training set → {out_dir}")
    if out_dir.exists():
        shutil.rmtree(out_dir)

    for cls in CLASSES:
        src = train_dir / cls
        dst = out_dir   / cls
        if src.exists():
            shutil.copytree(src, dst)
            print(f"   Copied {cls:<15} → {dst}  ({len(list(dst.iterdir()))} files)")

    # ── Step 2: generate extra augmented meningioma images ──────────────────
    aug_gen   = _build_aug_datagen_no_rescale()
    src_dir   = out_dir / OVERSAMPLE_CLASS
    all_imgs  = [p for p in src_dir.iterdir() if p.is_file()]
    n_orig    = len(all_imgs)
    n_target  = n_orig * factor
    generated = 0

    print(f"\n   Generating {n_target} extra {OVERSAMPLE_CLASS} images "
          f"(orig={n_orig}, factor={factor}×) …")

    for i, img_path in enumerate(all_imgs * factor):
        try:
            img = load_img(img_path, target_size=IMG_SIZE, color_mode="rgb")
            arr = img_to_array(img)                         # shape (224,224,3)
            arr = np.expand_dims(arr, 0)                    # (1,224,224,3)

            # Pull one augmented batch
            aug_iter  = aug_gen.flow(arr, batch_size=1, seed=seed + i)
            aug_arr   = next(aug_iter)[0]                   # (224,224,3) float

            # Clip and convert back to uint8 for saving
            aug_uint8 = np.clip(aug_arr, 0, 255).astype(np.uint8)

            from PIL import Image as PILImage
            out_name = f"aug_{i:05d}_{img_path.name}"
            PILImage.fromarray(aug_uint8).save(src_dir / out_name, quality=95)
            generated += 1
        except Exception as exc:
            print(f"   [WARN] Skipped {img_path.name}: {exc}")

    final_count = len(list(src_dir.iterdir()))
    print(f"   {OVERSAMPLE_CLASS}: {n_orig} → {final_count} images "
          f"({generated} augmented added)")

    return out_dir


# ─── Class Weights ─────────────────────────────────────────────────────────────

def compute_weights(train_dir: Path = TRAIN_BAL_DIR) -> dict[int, float]:
    """
    Scan *train_dir* to count class frequencies and compute balanced
    class weights via sklearn.

    Returns
    -------
    dict  {class_index: weight}  — pass directly to model.fit(class_weight=...)
    """
    counts = []
    for cls in CLASSES:
        cls_dir = train_dir / cls
        n = len(list(cls_dir.glob("*"))) if cls_dir.exists() else 0
        counts.append(n)

    # Build flat label array matching generator ordering
    y = np.concatenate([
        np.full(counts[i], i, dtype=int) for i in range(len(CLASSES))
    ])

    weights = compute_class_weight(
        class_weight="balanced",
        classes=np.arange(len(CLASSES)),
        y=y,
    )

    cw_dict = {i: float(w) for i, w in enumerate(weights)}

    print("\n⚖️   Class weights:")
    for i, cls in enumerate(CLASSES):
        print(f"   [{i}] {cls:<15} count={counts[i]:>5}   weight={cw_dict[i]:.4f}")

    return cw_dict


# ─── Generators ───────────────────────────────────────────────────────────────

def get_generators(
    train_dir:  Path  = None,     # defaults to TRAIN_BAL_DIR (built if absent)
    val_dir:    Path  = VAL_DIR,
    test_dir:   Path  = TEST_DIR,
    img_size:   tuple = IMG_SIZE,
    batch_size: int   = BATCH_SIZE,
    seed:       int   = SEED,
    rebuild_balanced: bool = False,
) -> tuple:
    """
    Build and return (train_generator, val_generator, test_generator, class_weights).

    Parameters
    ----------
    train_dir        : directory to use for training; if None, uses TRAIN_BAL_DIR
                       (auto-building it from TRAIN_DIR if it doesn't exist).
    val_dir          : validation split directory
    test_dir         : test split directory
    img_size         : (H, W) tuple — default (224, 224)
    batch_size       : mini-batch size — default 32
    seed             : random seed
    rebuild_balanced : force rebuild of train_balanced even if it exists

    Returns
    -------
    (train_generator, val_generator, test_generator, class_weights)
    """

    # ── Build balanced training dir if needed ───────────────────────────────
    if train_dir is None:
        if rebuild_balanced or not TRAIN_BAL_DIR.exists():
            oversample_meningioma(seed=seed)
        train_dir = TRAIN_BAL_DIR

    # ── Training generator (augmented) ──────────────────────────────────────
    train_datagen = ImageDataGenerator(**AUG_PARAMS)

    # ── Validation / Test generators (rescale only) ─────────────────────────
    eval_datagen = ImageDataGenerator(rescale=1.0 / 255.0)

    train_generator = train_datagen.flow_from_directory(
        directory  = str(train_dir),
        target_size= img_size,
        batch_size = batch_size,
        color_mode = COLOR_MODE,
        class_mode = CLASS_MODE,
        classes    = CLASSES,
        shuffle    = True,
        seed       = seed,
    )

    val_generator = eval_datagen.flow_from_directory(
        directory  = str(val_dir),
        target_size= img_size,
        batch_size = batch_size,
        color_mode = COLOR_MODE,
        class_mode = CLASS_MODE,
        classes    = CLASSES,
        shuffle    = False,
    )

    test_generator = eval_datagen.flow_from_directory(
        directory  = str(test_dir),
        target_size= img_size,
        batch_size = batch_size,
        color_mode = COLOR_MODE,
        class_mode = CLASS_MODE,
        classes    = CLASSES,
        shuffle    = False,
    )

    # ── Class weights ────────────────────────────────────────────────────────
    class_weights = compute_weights(train_dir)

    # ── Summary ─────────────────────────────────────────────────────────────
    print("\n" + "─" * 52)
    print(f"  Class indices  : {train_generator.class_indices}")
    print(f"  Train samples  : {train_generator.samples}")
    print(f"  Val   samples  : {val_generator.samples}")
    print(f"  Test  samples  : {test_generator.samples}")
    print(f"  Image size     : {img_size}")
    print(f"  Batch size     : {batch_size}")
    print("─" * 52)

    return train_generator, val_generator, test_generator, class_weights


# ─── Standalone test ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    train_gen, val_gen, test_gen, cw = get_generators()

    images, labels = next(iter(train_gen))
    print(f"\nSample batch — images: {images.shape}, labels: {labels.shape}")
    print(f"Pixel range  — min={images.min():.4f}  max={images.max():.4f}")
    print(f"Class weights: {cw}")
