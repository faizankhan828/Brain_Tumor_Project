"""
app/model.py

ResNet50 Transfer-Learning Architecture
-----------------------------------------
Builds the two-phase brain-tumor classification model.

Architecture
------------
  Base  : ResNet50 pretrained on ImageNet (include_top=False)
  Head  : GlobalAveragePooling2D
          → Dense(256, relu)
          → Dropout(0.4)
          → Dense(4, softmax)       ← glioma / meningioma / notumor / pituitary

Phase 1 — feature extraction
  • ALL ResNet50 base layers frozen
  • Only custom head trained
  • lr = 1e-3, Adam

Phase 2 — fine-tuning
  • Top 30 ResNet50 layers unfrozen
  • Lower layers stay frozen (preserve low-level ImageNet features)
  • lr = 1e-5, Adam  +  ReduceLROnPlateau

Public API
----------
  build_model()       → compiled Keras model (Phase 1 config)
  unfreeze_top(model) → re-compiles model for Phase 2 fine-tuning
"""

from __future__ import annotations

import tensorflow as tf
from tensorflow.keras import layers, Model                       # type: ignore
from tensorflow.keras.applications import ResNet50               # type: ignore
from tensorflow.keras.optimizers import Adam                     # type: ignore

from app.utils.preprocess import IMG_SIZE, CLASSES

# ─── Constants ────────────────────────────────────────────────────────────────
INPUT_SHAPE       = (*IMG_SIZE, 3)   # (224, 224, 3)
NUM_CLASSES       = len(CLASSES)     # 4

DENSE_UNITS       = 256
DROPOUT_RATE      = 0.4

LR_PHASE1         = 1e-3
LR_PHASE2         = 1e-5
TOP_LAYERS_UNFREEZE = 30             # number of ResNet50 layers to unfreeze


# ─── Architecture ─────────────────────────────────────────────────────────────

def build_model(input_shape: tuple = INPUT_SHAPE) -> Model:
    """
    Build and compile the Phase-1 model (base frozen, head trainable).

    Returns
    -------
    tf.keras.Model  compiled with Adam(lr=1e-3) + categorical_crossentropy
    """
    # ── Base: ResNet50 pretrained on ImageNet ─────────────────────────────────
    base = ResNet50(
        weights     = "imagenet",
        include_top = False,           # remove the original FC head
        input_shape = input_shape,
    )
    base.trainable = False             # freeze entire base for Phase 1

    # ── Custom classification head ────────────────────────────────────────────
    inputs  = tf.keras.Input(shape=input_shape, name="mri_input")
    x       = base(inputs, training=False)         # training=False → BN stays in inference mode
    x       = layers.GlobalAveragePooling2D(name="gap")(x)
    x       = layers.Dense(DENSE_UNITS, activation="relu", name="dense_256")(x)
    x       = layers.Dropout(DROPOUT_RATE, name="dropout")(x)
    outputs = layers.Dense(NUM_CLASSES, activation="softmax", name="predictions")(x)

    model = Model(inputs, outputs, name="BrainTumorResNet50")

    # ── Compile — Phase 1 ─────────────────────────────────────────────────────
    model.compile(
        optimizer = Adam(learning_rate=LR_PHASE1),
        loss      = "categorical_crossentropy",
        metrics   = ["accuracy",
                     tf.keras.metrics.AUC(name="auc"),
                     tf.keras.metrics.Precision(name="precision"),
                     tf.keras.metrics.Recall(name="recall")],
    )

    return model


def unfreeze_top(model: Model, n_layers: int = TOP_LAYERS_UNFREEZE) -> Model:
    """
    Prepare the model for Phase-2 fine-tuning.

    Unfreezes the top *n_layers* of the ResNet50 base while keeping all
    earlier layers frozen (preserves low-level ImageNet edge/texture features).

    Re-compiles with Adam(lr=1e-5) and returns the same model in-place.

    Parameters
    ----------
    model    : model returned by build_model() after Phase-1 training
    n_layers : number of base layers to unfreeze from the top

    Returns
    -------
    The same model, re-compiled for fine-tuning
    """
    # Locate the ResNet50 base (first sub-model layer)
    base = next(l for l in model.layers if isinstance(l, Model))

    # Unfreeze selectively
    base.trainable = True
    for layer in base.layers[:-n_layers]:
        layer.trainable = False

    # Summary
    trainable    = sum(1 for l in base.layers if l.trainable)
    non_trainable= sum(1 for l in base.layers if not l.trainable)
    print(f"\n🔓  Fine-tuning: {trainable} layers trainable, "
          f"{non_trainable} frozen in ResNet50 base")

    # Re-compile with lower lr
    model.compile(
        optimizer = Adam(learning_rate=LR_PHASE2),
        loss      = "categorical_crossentropy",
        metrics   = ["accuracy",
                     tf.keras.metrics.AUC(name="auc"),
                     tf.keras.metrics.Precision(name="precision"),
                     tf.keras.metrics.Recall(name="recall")],
    )

    return model


def model_summary(model: Model) -> None:
    """Print a formatted summary with parameter counts."""
    model.summary(line_length=90)
    total     = model.count_params()
    trainable = sum(tf.size(v).numpy() for v in model.trainable_weights)
    frozen    = total - trainable
    print(f"\n  Total params      : {total:,}")
    print(f"  Trainable params  : {trainable:,}")
    print(f"  Frozen params     : {frozen:,}")


# ─── Standalone check ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    m = build_model()
    model_summary(m)
    print("\n✅  Phase-1 model built successfully.")

    m = unfreeze_top(m)
    model_summary(m)
    print("\n✅  Phase-2 fine-tuning config applied successfully.")
