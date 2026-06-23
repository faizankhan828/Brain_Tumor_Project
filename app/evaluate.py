"""
app/evaluate.py

Model Evaluation  —  Test Set Analysis
----------------------------------------
Loads the saved best model and evaluates it on the held-out test set.

Outputs
-------
  • Console: sklearn classification_report (precision/recall/F1 per class)
  • Console: overall accuracy, macro avg, weighted avg
  • app/utils/plots/confusion_matrix.png   ← seaborn heatmap (counts + %)
  • app/utils/plots/per_class_metrics.png  ← bar chart of P/R/F1 per class

Run standalone
--------------
  python app/evaluate.py

Or call programmatically after training:
  from app.evaluate import evaluate
  evaluate(model, test_generator)
"""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np
import seaborn as sns                                          # type: ignore
from sklearn.metrics import (                                  # type: ignore
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
)
from tensorflow.keras.models import load_model                 # type: ignore

from app.utils.data_loader import get_generators, TEST_DIR
from app.utils.preprocess import CLASSES

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
PLOTS_DIR  = BASE_DIR / "app" / "utils" / "plots"
PLOTS_DIR.mkdir(parents=True, exist_ok=True)

CHECKPOINT_PATH = str(MODELS_DIR / "brain_tumor_model.h5")

# ─── Dark-mode palette ────────────────────────────────────────────────────────
BG       = "#0f172a"
PANEL    = "#1e293b"
GRID     = "#334155"
TEXT     = "white"
TEAL     = "#2dd4bf"
ACCENT   = "#818cf8"
CLASS_COLORS = ["#f87171", "#fb923c", "#34d399", "#60a5fa"]


# ─── Prediction helpers ───────────────────────────────────────────────────────

def predict_all(model, generator) -> tuple[np.ndarray, np.ndarray]:
    """
    Run inference over the entire generator and return:
      y_true  : integer ground-truth labels  (N,)
      y_pred  : integer predicted labels     (N,)
    """
    generator.reset()
    y_true, y_pred = [], []

    steps = int(np.ceil(generator.samples / generator.batch_size))
    for _ in range(steps):
        imgs, labels = next(generator)
        preds = model.predict(imgs, verbose=0)

        y_true.extend(np.argmax(labels, axis=1))
        y_pred.extend(np.argmax(preds,  axis=1))

    return np.array(y_true[:generator.samples]), np.array(y_pred[:generator.samples])


# ─── Confusion Matrix Plot ────────────────────────────────────────────────────

def plot_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray) -> None:
    """
    Save a dual-panel seaborn heatmap:
      Left  — raw counts
      Right — normalised (row %) to expose per-class error rates
    """
    cm      = confusion_matrix(y_true, y_pred)
    cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True)

    labels  = [c.capitalize() for c in CLASSES]

    fig, axes = plt.subplots(1, 2, figsize=(18, 7))
    fig.patch.set_facecolor(BG)
    fig.suptitle(
        "Confusion Matrix — Test Set\n"
        "Left: Counts   |   Right: Row-normalised (recall per class)",
        color=TEXT, fontsize=14, fontweight="bold",
    )

    for ax, data, fmt, title in zip(
        axes,
        [cm, cm_norm],
        ["d",  ".2%"],
        ["Counts", "Row-normalised (Recall)"],
    ):
        ax.set_facecolor(BG)
        sns.heatmap(
            data,
            annot      = True,
            fmt        = fmt,
            cmap       = "YlOrRd",
            xticklabels= labels,
            yticklabels= labels,
            ax         = ax,
            linewidths = 0.5,
            linecolor  = PANEL,
            cbar_kws   = {"shrink": 0.75},
            annot_kws  = {"size": 12, "color": "white"},
        )
        ax.set_title(title, color=TEXT, fontsize=12, fontweight="bold", pad=12)
        ax.set_xlabel("Predicted label", color="#94a3b8", fontsize=11)
        ax.set_ylabel("True label",      color="#94a3b8", fontsize=11)
        ax.tick_params(colors="#94a3b8")
        # Style colour-bar
        cbar = ax.collections[0].colorbar
        cbar.ax.tick_params(colors="#94a3b8")
        cbar.ax.yaxis.label.set_color("#94a3b8")

    plt.tight_layout()
    out = PLOTS_DIR / "confusion_matrix.png"
    plt.savefig(out, dpi=150, bbox_inches="tight", facecolor=BG)
    plt.close()
    print(f"\n🗂️   Confusion matrix saved → {out}")


# ─── Per-class Metrics Bar Chart ─────────────────────────────────────────────

def plot_per_class_metrics(report: dict) -> None:
    """
    Bar chart of Precision / Recall / F1-score for each class.
    Highlights the target accuracy threshold (0.92) with a dashed line.
    """
    class_keys   = [c for c in CLASSES if c in report]
    precision    = [report[c]["precision"]  for c in class_keys]
    recall       = [report[c]["recall"]     for c in class_keys]
    f1           = [report[c]["f1-score"]   for c in class_keys]

    x     = np.arange(len(class_keys))
    width = 0.25

    fig, ax = plt.subplots(figsize=(13, 6))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    b1 = ax.bar(x - width, precision, width, label="Precision", color=TEAL,   alpha=0.9, zorder=3)
    b2 = ax.bar(x,          recall,   width, label="Recall",    color=ACCENT, alpha=0.9, zorder=3)
    b3 = ax.bar(x + width,  f1,       width, label="F1-Score",  color="#f472b6", alpha=0.9, zorder=3)

    ax.axhline(0.92, color="#facc15", lw=1.5, linestyle="--",
               label="Target ≥ 92%", zorder=2)

    ax.set_title("Per-Class Precision / Recall / F1-Score  —  Test Set",
                 color=TEXT, fontsize=13, fontweight="bold", pad=14)
    ax.set_xticks(x)
    ax.set_xticklabels([c.capitalize() for c in class_keys], color=TEXT, fontsize=11)
    ax.set_ylabel("Score", color="#94a3b8", fontsize=11)
    ax.set_ylim(0, 1.08)
    ax.tick_params(colors="#94a3b8")
    ax.spines[:].set_color(GRID)
    ax.grid(axis="y", color=GRID, linewidth=0.7, zorder=0)
    ax.legend(facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, fontsize=10)

    for bars in [b1, b2, b3]:
        for bar in bars:
            h = bar.get_height()
            ax.annotate(f"{h:.3f}",
                        xy=(bar.get_x() + bar.get_width() / 2, h),
                        xytext=(0, 4), textcoords="offset points",
                        ha="center", va="bottom", color=TEXT, fontsize=8)

    plt.tight_layout()
    out = PLOTS_DIR / "per_class_metrics.png"
    plt.savefig(out, dpi=150, bbox_inches="tight", facecolor=BG)
    plt.close()
    print(f"📊  Per-class metrics chart saved → {out}")


# ─── Main Evaluation Function ─────────────────────────────────────────────────

def evaluate(model=None, test_generator=None) -> None:
    """
    Evaluate *model* on *test_generator*.

    If either is None, loads the saved checkpoint and rebuilds generators.
    """
    # ── Load model if not provided ────────────────────────────────────────────
    if model is None:
        print(f"\n📦  Loading model from {CHECKPOINT_PATH} …")
        model = load_model(CHECKPOINT_PATH)

    # ── Load test generator if not provided ──────────────────────────────────
    if test_generator is None:
        _, _, test_generator, _ = get_generators()

    # ── Inference ─────────────────────────────────────────────────────────────
    print(f"\n🔍  Running inference on {test_generator.samples} test images …")
    y_true, y_pred = predict_all(model, test_generator)

    # ── Classification Report ─────────────────────────────────────────────────
    print("\n" + "═" * 62)
    print("  CLASSIFICATION REPORT — Test Set")
    print("═" * 62)
    report_str = classification_report(
        y_true, y_pred,
        target_names = CLASSES,
        digits       = 4,
    )
    print(report_str)

    # Parse report dict for plotting
    report_dict = classification_report(
        y_true, y_pred,
        target_names = CLASSES,
        output_dict  = True,
    )

    overall_acc = report_dict["accuracy"]
    print(f"  Overall accuracy : {overall_acc:.4f}  "
          f"({'✅ TARGET MET' if overall_acc >= 0.92 else '⚠️  Below 92% target'})")

    # ── Per-class confusion analysis ──────────────────────────────────────────
    cm     = confusion_matrix(y_true, y_pred)
    print("\n  Most confused class pairs:")
    off_diag = []
    for i in range(len(CLASSES)):
        for j in range(len(CLASSES)):
            if i != j:
                off_diag.append((cm[i, j], CLASSES[i], CLASSES[j]))
    off_diag.sort(reverse=True)
    for count, true_cls, pred_cls in off_diag[:5]:
        print(f"    True={true_cls:<15} predicted as {pred_cls:<15} → {count} times")

    # ── Plots ─────────────────────────────────────────────────────────────────
    plot_confusion_matrix(y_true, y_pred)
    plot_per_class_metrics(report_dict)

    print("\n✅  Evaluation complete.")
    return report_dict


# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    evaluate()
