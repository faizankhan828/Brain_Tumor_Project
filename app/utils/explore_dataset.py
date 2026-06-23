"""
app/utils/explore_dataset.py

Dataset Exploration Script
--------------------------
1. Count images per class in Training & Testing folders
2. Check image sizes (expected 512x512 JPEG)
3. Detect corrupted or duplicate files
4. Visualize sample MRI scans from each class
5. Plot class distribution bar chart
6. Plot pixel intensity distributions per class
"""

import os
import hashlib
from pathlib import Path
from collections import defaultdict

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from PIL import Image, UnidentifiedImageError

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).resolve().parents[2]   # Brain_Tumor_Project/
DATASET_DIR  = BASE_DIR / "dataset"
TRAIN_DIR    = DATASET_DIR / "Training"
TEST_DIR     = DATASET_DIR / "Testing"
CLASSES      = ["glioma", "meningioma", "notumor", "pituitary"]
OUTPUT_DIR   = BASE_DIR / "app" / "utils" / "plots"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ─── Helpers ──────────────────────────────────────────────────────────────────
def file_hash(path: Path) -> str:
    """MD5 hash of a file for duplicate detection."""
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def scan_split(split_dir: Path) -> dict:
    """
    Walk a split directory and collect per-class stats.
    Returns a dict keyed by class name with:
      - count, sizes, corrupted, hashes
    """
    stats = {}
    for cls in CLASSES:
        cls_dir = split_dir / cls
        if not cls_dir.exists():
            print(f"  [WARN] Missing class folder: {cls_dir}")
            stats[cls] = {"count": 0, "sizes": [], "corrupted": [], "hashes": []}
            continue

        image_paths = sorted(cls_dir.glob("*"))
        sizes, corrupted, hashes = [], [], []
        for p in image_paths:
            if not p.is_file():
                continue
            try:
                with Image.open(p) as img:
                    sizes.append(img.size)   # (W, H)
            except (UnidentifiedImageError, Exception) as e:
                corrupted.append((p.name, str(e)))
            hashes.append(file_hash(p))

        stats[cls] = {
            "count":     len(image_paths),
            "sizes":     sizes,
            "corrupted": corrupted,
            "hashes":    hashes,
        }
    return stats


# ─── 1 & 2 — Count + Size Audit ───────────────────────────────────────────────
print("=" * 60)
print("  DATASET EXPLORATION — Brain Tumor MRI")
print("=" * 60)

for split_name, split_dir in [("Training", TRAIN_DIR), ("Testing", TEST_DIR)]:
    print(f"\n📂  {split_name} split  ({split_dir})")
    stats = scan_split(split_dir)
    total = 0
    for cls in CLASSES:
        s    = stats[cls]
        cnt  = s["count"]
        total += cnt
        # Most-common size
        if s["sizes"]:
            from collections import Counter
            common_size = Counter(s["sizes"]).most_common(1)[0]
        else:
            common_size = (("N/A",), 0)
        # Corrupted
        n_corrupt = len(s["corrupted"])
        # Duplicates
        seen, dups = set(), 0
        for h in s["hashes"]:
            if h in seen:
                dups += 1
            seen.add(h)
        print(f"  {cls:<15} {cnt:>5} images  |  "
              f"most-common size: {common_size[0]}  |  "
              f"corrupted: {n_corrupt}  |  duplicates: {dups}")
        if n_corrupt:
            for fname, err in s["corrupted"][:3]:
                print(f"    ⚠️  {fname}: {err}")
    print(f"  {'TOTAL':<15} {total:>5}")


# ─── 3 — Sample Visualization ─────────────────────────────────────────────────
print("\n📸  Saving sample MRI scans …")

fig, axes = plt.subplots(2, 4, figsize=(16, 8))
fig.patch.set_facecolor("#0f172a")
fig.suptitle("Sample MRI Scans — One per Class (Training)", color="white",
             fontsize=16, fontweight="bold", y=1.01)

for col, cls in enumerate(CLASSES):
    cls_dir = TRAIN_DIR / cls
    imgs = sorted(cls_dir.glob("*.jpg"))[:1] or sorted(cls_dir.glob("*.jpeg"))[:1]
    if not imgs:
        imgs = sorted(cls_dir.glob("*"))[:1]

    for row, path in enumerate([imgs[0]] if imgs else []):
        img = Image.open(path).convert("RGB")
        axes[row][col].imshow(img)
        axes[row][col].set_title(cls.capitalize(), color="white", fontsize=12,
                                 fontweight="bold", pad=6)
        axes[row][col].axis("off")
        axes[row][col].set_facecolor("#0f172a")

    # Grayscale version on second row
    if imgs:
        img_gray = Image.open(imgs[0]).convert("L")
        axes[1][col].imshow(img_gray, cmap="gray")
        axes[1][col].set_title(f"{cls} (gray)", color="#94a3b8", fontsize=10, pad=6)
        axes[1][col].axis("off")
        axes[1][col].set_facecolor("#0f172a")

for ax in axes.flat:
    ax.set_facecolor("#0f172a")

plt.tight_layout()
out_path = OUTPUT_DIR / "sample_scans.png"
plt.savefig(out_path, dpi=150, bbox_inches="tight", facecolor="#0f172a")
plt.close()
print(f"   Saved → {out_path}")


# ─── 4 — Class Distribution Bar Chart ─────────────────────────────────────────
print("\n📊  Plotting class distribution …")

train_counts = {}
test_counts  = {}

for cls in CLASSES:
    train_path = TRAIN_DIR / cls
    test_path  = TEST_DIR  / cls
    train_counts[cls] = len(list(train_path.glob("*"))) if train_path.exists() else 0
    test_counts[cls]  = len(list(test_path.glob("*")))  if test_path.exists()  else 0

x     = np.arange(len(CLASSES))
width = 0.35
TEAL  = "#2dd4bf"
INDIGO = "#818cf8"

fig, ax = plt.subplots(figsize=(10, 6))
fig.patch.set_facecolor("#0f172a")
ax.set_facecolor("#0f172a")

bars1 = ax.bar(x - width / 2, [train_counts[c] for c in CLASSES], width,
               label="Training", color=TEAL,   alpha=0.85, zorder=3)
bars2 = ax.bar(x + width / 2, [test_counts[c]  for c in CLASSES], width,
               label="Testing",  color=INDIGO, alpha=0.85, zorder=3)

ax.set_title("Class Distribution — Training vs Testing", color="white",
             fontsize=14, fontweight="bold", pad=14)
ax.set_xlabel("Tumor Class", color="#94a3b8", fontsize=11)
ax.set_ylabel("Number of Images", color="#94a3b8", fontsize=11)
ax.set_xticks(x)
ax.set_xticklabels([c.capitalize() for c in CLASSES], color="white", fontsize=11)
ax.tick_params(colors="#94a3b8")
ax.yaxis.label.set_color("#94a3b8")
ax.spines[:].set_color("#1e293b")
ax.grid(axis="y", color="#1e293b", linewidth=0.8, zorder=0)
ax.legend(facecolor="#1e293b", edgecolor="#334155", labelcolor="white", fontsize=10)

for bar in list(bars1) + list(bars2):
    h = bar.get_height()
    ax.annotate(f"{int(h)}", xy=(bar.get_x() + bar.get_width() / 2, h),
                xytext=(0, 4), textcoords="offset points",
                ha="center", va="bottom", color="white", fontsize=9)

plt.tight_layout()
out_path = OUTPUT_DIR / "class_distribution.png"
plt.savefig(out_path, dpi=150, bbox_inches="tight", facecolor="#0f172a")
plt.close()
print(f"   Saved → {out_path}")


# ─── 5 — Pixel Intensity Distribution per Class ───────────────────────────────
print("\n🔬  Plotting pixel intensity distributions …")

SAMPLE_N = 30   # images per class to sample for speed

fig, axes = plt.subplots(2, 2, figsize=(14, 9))
fig.patch.set_facecolor("#0f172a")
fig.suptitle("Pixel Intensity Distribution per Class (Grayscale channel)",
             color="white", fontsize=14, fontweight="bold")
axes = axes.flat

CLASS_COLORS = {"glioma": "#f87171", "meningioma": "#fb923c",
                "notumor": "#34d399", "pituitary": "#60a5fa"}

for ax, cls in zip(axes, CLASSES):
    cls_dir   = TRAIN_DIR / cls
    all_files = [p for p in cls_dir.glob("*") if p.is_file()]
    sample    = all_files[:SAMPLE_N]
    all_pixels = []

    for path in sample:
        try:
            img = Image.open(path).convert("L")          # grayscale
            all_pixels.append(np.array(img).ravel())
        except Exception:
            pass

    if all_pixels:
        pixels = np.concatenate(all_pixels)
        ax.hist(pixels, bins=64, color=CLASS_COLORS[cls],
                alpha=0.85, edgecolor="none", density=True)
        ax.axvline(pixels.mean(), color="white", lw=1.5,
                   linestyle="--", label=f"mean={pixels.mean():.1f}")
        ax.legend(facecolor="#1e293b", edgecolor="none",
                  labelcolor="white", fontsize=9)

    ax.set_facecolor("#0f172a")
    ax.set_title(cls.capitalize(), color="white", fontsize=12, fontweight="bold")
    ax.set_xlabel("Pixel value (0–255)", color="#94a3b8", fontsize=9)
    ax.set_ylabel("Density", color="#94a3b8", fontsize=9)
    ax.tick_params(colors="#94a3b8")
    ax.spines[:].set_color("#1e293b")

plt.tight_layout()
out_path = OUTPUT_DIR / "pixel_intensity_distributions.png"
plt.savefig(out_path, dpi=150, bbox_inches="tight", facecolor="#0f172a")
plt.close()
print(f"   Saved → {out_path}")

print("\n✅  Exploration complete.  All plots saved to:", OUTPUT_DIR)
