"""
app/utils/split_dataset.py

Dataset Splitting Script
------------------------
Reads from dataset/Training + dataset/Testing and creates:
  dataset/
    train/   (80% of all available data)
    val/     (10% of all available data)
    test/    (10% of all available data)

Uses stratified split to maintain class ratios.
Files are COPIED (not moved) so originals are preserved.
"""

import os
import shutil
from pathlib import Path
from collections import defaultdict

import numpy as np
from sklearn.model_selection import train_test_split

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).resolve().parents[2]   # Brain_Tumor_Project/
DATASET_DIR = BASE_DIR / "dataset"
TRAIN_SRC   = DATASET_DIR / "Training"
TEST_SRC    = DATASET_DIR / "Testing"
CLASSES     = ["glioma", "meningioma", "notumor", "pituitary"]

OUT_TRAIN   = DATASET_DIR / "train"
OUT_VAL     = DATASET_DIR / "val"
OUT_TEST    = DATASET_DIR / "test"

RANDOM_SEED = 42
VAL_RATIO   = 0.10   # 10 % validation
TEST_RATIO  = 0.10   # 10 % test  → train = 80 %


# ─── Helpers ──────────────────────────────────────────────────────────────────
def collect_all_files(cls: str) -> list[Path]:
    """Gather every image path for a class from both Training and Testing."""
    paths = []
    for src in [TRAIN_SRC, TEST_SRC]:
        cls_dir = src / cls
        if cls_dir.exists():
            paths.extend([p for p in cls_dir.glob("*") if p.is_file()])
    return paths


def copy_files(files: list[Path], dest_dir: Path, cls: str) -> None:
    target = dest_dir / cls
    target.mkdir(parents=True, exist_ok=True)
    for src in files:
        shutil.copy2(src, target / src.name)


# ─── Main Split ───────────────────────────────────────────────────────────────
print("=" * 60)
print("  STRATIFIED DATASET SPLIT  (80 / 10 / 10)")
print("=" * 60)

split_summary = {}

for cls in CLASSES:
    all_files = collect_all_files(cls)
    np.random.seed(RANDOM_SEED)

    if len(all_files) < 10:
        print(f"  [WARN] {cls}: too few samples ({len(all_files)}), skipping split")
        continue

    # First cut: separate out the test set (10 %)
    train_val, test_files = train_test_split(
        all_files,
        test_size=TEST_RATIO,
        random_state=RANDOM_SEED,
        shuffle=True,
    )

    # Second cut: separate val from train (val = 10 % of total → ~11.1 % of train_val)
    val_ratio_of_remaining = VAL_RATIO / (1.0 - TEST_RATIO)
    train_files, val_files = train_test_split(
        train_val,
        test_size=val_ratio_of_remaining,
        random_state=RANDOM_SEED,
        shuffle=True,
    )

    # Copy files
    copy_files(train_files, OUT_TRAIN, cls)
    copy_files(val_files,   OUT_VAL,   cls)
    copy_files(test_files,  OUT_TEST,  cls)

    split_summary[cls] = {
        "total": len(all_files),
        "train": len(train_files),
        "val":   len(val_files),
        "test":  len(test_files),
    }

    pct_train = 100 * len(train_files) / len(all_files)
    pct_val   = 100 * len(val_files)   / len(all_files)
    pct_test  = 100 * len(test_files)  / len(all_files)

    print(f"  {cls:<15}  total={len(all_files):>5}  "
          f"train={len(train_files):>4} ({pct_train:.0f}%)  "
          f"val={len(val_files):>4} ({pct_val:.0f}%)  "
          f"test={len(test_files):>4} ({pct_test:.0f}%)")

# ─── Summary ──────────────────────────────────────────────────────────────────
totals = defaultdict(int)
for s in split_summary.values():
    for k, v in s.items():
        totals[k] += v

print(f"\n  {'TOTAL':<15}  total={totals['total']:>5}  "
      f"train={totals['train']:>4}  "
      f"val={totals['val']:>4}  "
      f"test={totals['test']:>4}")
print(f"\n  Splits written to:")
print(f"    {OUT_TRAIN}")
print(f"    {OUT_VAL}")
print(f"    {OUT_TEST}")
print("\n✅  Stratified split complete.")
