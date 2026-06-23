"""
app/train.py

Two-Phase Training Pipeline — Brain Tumor MRI Classifier
----------------------------------------------------------
Phase 1 — Feature Extraction  (10 epochs, lr=1e-3)
  • ResNet50 base fully frozen
  • Only custom head (Dense 256 → Dropout → Dense 4) is trained

Phase 2 — Fine-Tuning         (20 epochs, lr=1e-5)
  • Top 30 ResNet50 layers unfrozen
  • ReduceLROnPlateau halves lr on val_loss plateau (patience=3)
  • EarlyStopping on val_accuracy (patience=5)

Outputs
-------
  models/brain_tumor_model.h5          ← best checkpoint (highest val_accuracy)
  models/brain_tumor_savedmodel/       ← TF SavedModel format for serving
  logs/fit/                            ← TensorBoard event files
  app/utils/plots/training_curves.png  ← Phase-1 + Phase-2 loss/accuracy plots

Run
---
  python app/train.py

Prerequisites
-------------
  • dataset/train_balanced/ exists  (run split_dataset.py + data_loader.py first)
  • pip install -r requirements.txt
"""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf

from app.model import build_model, unfreeze_top, model_summary
from app.utils.data_loader import get_generators
from app.utils.preprocess import CLASSES

# ─── Reproducibility ──────────────────────────────────────────────────────────
SEED = 42
os.environ["PYTHONHASHSEED"] = str(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).resolve().parent.parent   # Brain_Tumor_Project/
MODELS_DIR  = BASE_DIR / "models"
LOGS_DIR    = BASE_DIR / "logs" / "fit"
PLOTS_DIR   = BASE_DIR / "app" / "utils" / "plots"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)
PLOTS_DIR.mkdir(parents=True, exist_ok=True)

CHECKPOINT_PATH  = str(MODELS_DIR / "brain_tumor_model.h5")
SAVEDMODEL_PATH  = str(MODELS_DIR / "brain_tumor_savedmodel")

# ─── Training hyper-params ────────────────────────────────────────────────────
PHASE1_EPOCHS = 10
PHASE2_EPOCHS = 20
BATCH_SIZE    = 32


# ─── Callbacks ────────────────────────────────────────────────────────────────

def make_callbacks(phase: int) -> list:
    """
    Build the callback stack for a given training phase.

    Phase 1 → ModelCheckpoint + TensorBoard (no early stopping — short run)
    Phase 2 → ModelCheckpoint + EarlyStopping + ReduceLROnPlateau + TensorBoard
    """
    run_tag  = datetime.now().strftime("%Y%m%d-%H%M%S")
    log_dir  = str(LOGS_DIR / f"phase{phase}_{run_tag}")

    ckpt = tf.keras.callbacks.ModelCheckpoint(
        filepath          = CHECKPOINT_PATH,
        monitor           = "val_accuracy",
        save_best_only    = True,
        save_weights_only = False,
        verbose           = 1,
    )

    tb = tf.keras.callbacks.TensorBoard(
        log_dir           = log_dir,
        histogram_freq    = 1,
        write_graph       = True,
        update_freq       = "epoch",
    )

    callbacks = [ckpt, tb]

    if phase == 2:
        early_stop = tf.keras.callbacks.EarlyStopping(
            monitor              = "val_accuracy",
            patience             = 5,
            restore_best_weights = True,
            verbose              = 1,
        )
        reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(
            monitor   = "val_loss",
            factor    = 0.5,
            patience  = 3,
            min_lr    = 1e-7,
            verbose   = 1,
        )
        callbacks += [early_stop, reduce_lr]

    return callbacks


# ─── Plot Training Curves ─────────────────────────────────────────────────────

def plot_training_curves(
    hist1: tf.keras.callbacks.History,
    hist2: tf.keras.callbacks.History,
) -> None:
    """
    Combine Phase-1 and Phase-2 histories and plot:
      - Accuracy (train + val)
      - Loss     (train + val)
    Vertical dashed line marks Phase-1 / Phase-2 boundary.
    """
    # Concatenate metrics
    def concat(key: str) -> list:
        return hist1.history.get(key, []) + hist2.history.get(key, [])

    acc     = concat("accuracy")
    val_acc = concat("val_accuracy")
    loss    = concat("loss")
    val_loss= concat("val_loss")
    epochs  = range(1, len(acc) + 1)
    phase1_end = len(hist1.history["accuracy"])

    BG, TEAL, RED, GRID = "#0f172a", "#2dd4bf", "#f87171", "#1e293b"

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
    fig.patch.set_facecolor(BG)

    for ax in (ax1, ax2):
        ax.set_facecolor(BG)
        ax.spines[:].set_color(GRID)
        ax.tick_params(colors="#94a3b8")
        ax.grid(color=GRID, linewidth=0.7)

    # ── Accuracy ──────────────────────────────────────────────────────────────
    ax1.plot(epochs, acc,     color=TEAL,          lw=2,   label="Train accuracy")
    ax1.plot(epochs, val_acc, color=TEAL,          lw=2,   linestyle="--",
             label="Val accuracy", alpha=0.75)
    ax1.axvline(phase1_end, color="white", lw=1.2, linestyle=":", alpha=0.6,
                label="Phase 1 → 2")
    ax1.set_title("Accuracy", color="white", fontsize=13, fontweight="bold")
    ax1.set_xlabel("Epoch", color="#94a3b8")
    ax1.set_ylabel("Accuracy", color="#94a3b8")
    ax1.legend(facecolor="#1e293b", edgecolor="#334155", labelcolor="white")
    ax1.set_ylim(0, 1.05)

    # ── Loss ──────────────────────────────────────────────────────────────────
    ax2.plot(epochs, loss,     color=RED,           lw=2,   label="Train loss")
    ax2.plot(epochs, val_loss, color=RED,           lw=2,   linestyle="--",
             label="Val loss", alpha=0.75)
    ax2.axvline(phase1_end, color="white", lw=1.2, linestyle=":", alpha=0.6,
                label="Phase 1 → 2")
    ax2.set_title("Loss", color="white", fontsize=13, fontweight="bold")
    ax2.set_xlabel("Epoch", color="#94a3b8")
    ax2.set_ylabel("Loss", color="#94a3b8")
    ax2.legend(facecolor="#1e293b", edgecolor="#334155", labelcolor="white")

    fig.suptitle("ResNet50 Training — Phase 1 (Feature Extraction) + Phase 2 (Fine-Tuning)",
                 color="white", fontsize=14, fontweight="bold")

    plt.tight_layout()
    out = PLOTS_DIR / "training_curves.png"
    plt.savefig(out, dpi=150, bbox_inches="tight", facecolor=BG)
    plt.close()
    print(f"\n📈  Training curves saved → {out}")


# ─── Main Training Loop ───────────────────────────────────────────────────────

def train() -> None:
    print("=" * 62)
    print("  BRAIN TUMOR MRI CLASSIFIER — Two-Phase Training")
    print("=" * 62)

    # ── Data ──────────────────────────────────────────────────────────────────
    print("\n📂  Loading data generators …")
    train_gen, val_gen, test_gen, class_weights = get_generators(
        batch_size = BATCH_SIZE,
    )

    # ── Build model ───────────────────────────────────────────────────────────
    print("\n🏗️   Building ResNet50 model …")
    model = build_model()
    model_summary(model)

    # ══════════════════════════════════════════════════════════════════════════
    #  PHASE 1 — Feature Extraction
    # ══════════════════════════════════════════════════════════════════════════
    print(f"\n{'═'*62}")
    print("  PHASE 1 — Feature Extraction  (base frozen, head training)")
    print(f"  Epochs: {PHASE1_EPOCHS}  |  lr: 1e-3  |  Optimizer: Adam")
    print(f"{'═'*62}")

    history1 = model.fit(
        train_gen,
        epochs          = PHASE1_EPOCHS,
        validation_data = val_gen,
        class_weight    = class_weights,
        callbacks       = make_callbacks(phase=1),
        verbose         = 1,
    )

    p1_val_acc = max(history1.history["val_accuracy"])
    print(f"\n✅  Phase 1 complete — best val_accuracy: {p1_val_acc:.4f}")

    # ══════════════════════════════════════════════════════════════════════════
    #  PHASE 2 — Fine-Tuning
    # ══════════════════════════════════════════════════════════════════════════
    print(f"\n{'═'*62}")
    print("  PHASE 2 — Fine-Tuning  (top 30 ResNet50 layers unfrozen)")
    print(f"  Epochs: {PHASE2_EPOCHS}  |  lr: 1e-5  |  Optimizer: Adam")
    print(f"{'═'*62}")

    model = unfreeze_top(model, n_layers=30)

    history2 = model.fit(
        train_gen,
        epochs          = PHASE2_EPOCHS,
        validation_data = val_gen,
        class_weight    = class_weights,
        callbacks       = make_callbacks(phase=2),
        verbose         = 1,
    )

    p2_val_acc = max(history2.history["val_accuracy"])
    print(f"\n✅  Phase 2 complete — best val_accuracy: {p2_val_acc:.4f}")

    # ── Save model ────────────────────────────────────────────────────────────
    print(f"\n💾  Saving model …")

    # Load best checkpoint (ModelCheckpoint saved it during training)
    best_model = tf.keras.models.load_model(CHECKPOINT_PATH)

    # Also export as TF SavedModel
    best_model.save(SAVEDMODEL_PATH)
    print(f"   .h5          → {CHECKPOINT_PATH}")
    print(f"   SavedModel   → {SAVEDMODEL_PATH}")

    # ── Training curves ───────────────────────────────────────────────────────
    plot_training_curves(history1, history2)

    print(f"\n{'═'*62}")
    print("  TRAINING COMPLETE")
    print(f"  Phase-1 best val_accuracy : {p1_val_acc:.4f}")
    print(f"  Phase-2 best val_accuracy : {p2_val_acc:.4f}")
    print(f"{'═'*62}")

    return best_model, test_gen


# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    from app.evaluate import evaluate   # deferred import — avoid circular
    best_model, test_gen = train()
    evaluate(best_model, test_gen)
