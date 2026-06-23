"""
app/utils/visualize_augmentation.py

Augmentation Visualization
---------------------------
Loads one real MRI image from each class and applies the training-set
augmentation pipeline to generate N variants per image.

Produces a grid plot:
  Rows    → tumor classes (glioma, meningioma, notumor, pituitary)
  Col 0   → original image
  Col 1–N → augmented variants

Saved to:  app/utils/plots/augmentation_grid.png

Run standalone:
    python app/utils/visualize_augmentation.py
"""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
from tensorflow.keras.preprocessing.image import ImageDataGenerator, img_to_array  # type: ignore

from app.utils.preprocess import IMG_SIZE, CLASSES

# ─── Config ───────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).resolve().parents[2]
DATASET_DIR = BASE_DIR / "dataset"
TRAIN_SRC   = DATASET_DIR / "Training"          # original Training folder
OUTPUT_DIR  = BASE_DIR / "app" / "utils" / "plots"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

N_VARIANTS  = 6     # augmented variants to show per class (+ 1 original = 7 cols)
SEED        = 42

# Exact training augmentation (no rescale — keep pixels in 0-255 for display)
AUG_PARAMS = dict(
    rotation_range     = 20,
    horizontal_flip    = True,
    zoom_range         = 0.15,
    shear_range        = 0.1,
    width_shift_range  = 0.10,
    height_shift_range = 0.10,
    brightness_range   = [0.8, 1.2],
    fill_mode          = "nearest",
)

# Dark-mode palette
BG        = "#0f172a"
PANEL_BG  = "#1e293b"
TEXT_CLR  = "white"
ACCENT    = "#2dd4bf"
CLASS_COLORS = {
    "glioma":      "#f87171",
    "meningioma":  "#fb923c",
    "notumor":     "#34d399",
    "pituitary":   "#60a5fa",
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _load_first_image(cls: str) -> tuple[np.ndarray, str] | tuple[None, None]:
    """Return (uint8 array 224×224×3, filename) for the first image in a class."""
    for src_root in [TRAIN_SRC, DATASET_DIR / "Training"]:
        cls_dir = src_root / cls
        if not cls_dir.exists():
            continue
        for ext in ("*.jpg", "*.jpeg", "*.png"):
            matches = sorted(cls_dir.glob(ext))
            if matches:
                img = Image.open(matches[0]).convert("RGB").resize(
                    (IMG_SIZE[1], IMG_SIZE[0]), Image.LANCZOS
                )
                return np.array(img, dtype=np.uint8), matches[0].name
    return None, None


def _augmented_variants(arr_uint8: np.ndarray, n: int, seed: int) -> list[np.ndarray]:
    """
    Return *n* augmented variants of a uint8 image (H×W×3).
    Output arrays are uint8 (clipped to 0-255) for display.
    """
    datagen = ImageDataGenerator(**AUG_PARAMS)
    batch   = np.expand_dims(arr_uint8.astype(np.float32), 0)  # (1,H,W,3)
    gen     = datagen.flow(batch, batch_size=1, seed=seed)

    variants = []
    for _ in range(n):
        aug = next(gen)[0]                             # (H,W,3) float
        variants.append(np.clip(aug, 0, 255).astype(np.uint8))
    return variants


# ─── Main ─────────────────────────────────────────────────────────────────────

def visualize(n_variants: int = N_VARIANTS, seed: int = SEED) -> None:
    n_cols = 1 + n_variants          # original + augmented
    n_rows = len(CLASSES)

    fig, axes = plt.subplots(n_rows, n_cols, figsize=(2.6 * n_cols, 3.2 * n_rows))
    fig.patch.set_facecolor(BG)
    fig.suptitle(
        "Augmentation Grid  —  Col 0: Original  |  Cols 1–6: Augmented variants",
        color=TEXT_CLR, fontsize=13, fontweight="bold", y=1.005,
    )

    for row, cls in enumerate(CLASSES):
        arr, fname = _load_first_image(cls)
        color      = CLASS_COLORS.get(cls, ACCENT)

        if arr is None:
            for col in range(n_cols):
                axes[row][col].set_visible(False)
            print(f"  [WARN] No images found for class: {cls}")
            continue

        variants = _augmented_variants(arr, n_variants, seed)

        for col, img_arr in enumerate([arr] + variants):
            ax = axes[row][col]
            ax.imshow(img_arr, cmap=None)
            ax.set_facecolor(PANEL_BG)
            ax.axis("off")

            # Row label on leftmost column
            if col == 0:
                ax.set_title(
                    f"{cls.capitalize()}\n{fname[:22]}",
                    color=color, fontsize=9, fontweight="bold",
                    loc="left", pad=5,
                )
                # Highlight original with a coloured border
                for spine in ax.spines.values():
                    spine.set_visible(True)
                    spine.set_edgecolor(color)
                    spine.set_linewidth(2.5)
            else:
                ax.set_title(f"aug {col}", color="#64748b", fontsize=8, pad=4)

    plt.tight_layout(pad=0.5)
    out_path = OUTPUT_DIR / "augmentation_grid.png"
    plt.savefig(out_path, dpi=150, bbox_inches="tight", facecolor=BG)
    plt.close()
    print(f"\n✅  Augmentation grid saved → {out_path}")


# ─── Sanity checks printed to stdout ─────────────────────────────────────────

def print_augmentation_summary() -> None:
    """Print the augmentation config in a readable table."""
    print("\n" + "─" * 55)
    print("  Training Augmentation Parameters")
    print("─" * 55)
    rows = [
        ("rotation_range",     "20°"),
        ("horizontal_flip",    "True"),
        ("zoom_range",         "0.15  (±15%)"),
        ("brightness_range",   "[0.8, 1.2]"),
        ("shear_range",        "0.1"),
        ("width_shift_range",  "0.10  (±10%)"),
        ("height_shift_range", "0.10  (±10%)"),
        ("fill_mode",          "nearest"),
        ("rescale",            "1/255  (training only)"),
    ]
    for name, val in rows:
        print(f"  {name:<22}  {val}")
    print("─" * 55)
    print("  Val / Test: rescale=1/255 only — no augmentation")
    print("─" * 55)


if __name__ == "__main__":
    print_augmentation_summary()
    print(f"\n📸  Generating augmentation grid  ({N_VARIANTS} variants per class) …")
    visualize()
