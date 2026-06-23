"""
app/utils/gradcam.py

Grad-CAM (Gradient-weighted Class Activation Mapping) Implementation
-------------------------------------------------------------------
Generates heatmaps highlighting the regions in MRI scans that the model
focused on to make its prediction.

Algorithm:
  1. Hook into ResNet50's last convolutional layer (conv5_block3_out).
  2. Compute gradients of predicted class score w.r.t. layer feature maps.
  3. Global average pool gradients to get importance weights.
  4. Linearly combine feature maps using weights.
  5. Apply ReLU activation to capture positive features only.
  6. Resize heatmap to 224x224 and colorize with cv2.COLORMAP_JET.
  7. Blend heatmap with original MRI image at 0.4 alpha.
  8. Base64-encode the blended image as a PNG data string.
"""

from __future__ import annotations

import base64
import io
from pathlib import Path
from typing import Union

import cv2
import numpy as np
import tensorflow as tf
from PIL import Image

# ─── Load Original Image Helper ───────────────────────────────────────────────

def load_original_image(source: Union[Image.Image, str, Path, bytes]) -> np.ndarray:
    """
    Load an image source and resize to 224x224 as a 3-channel RGB uint8 array.
    """
    if isinstance(source, Image.Image):
        pil_img = source
    elif isinstance(source, (str, Path)):
        pil_img = Image.open(source)
    elif isinstance(source, bytes):
        pil_img = Image.open(io.BytesIO(source))
    else:
        raise ValueError(f"Unsupported image source type: {type(source)}")
    
    # Ensure RGB and resize
    rgb_img = pil_img.convert("RGB").resize((224, 224), Image.Resampling.LANCZOS)
    return np.array(rgb_img, dtype=np.uint8)


# ─── Grad-CAM Implementation ──────────────────────────────────────────────────

def generate_gradcam(
    model: tf.keras.Model,
    preprocessed_img: np.ndarray,
    original_source: Union[Image.Image, str, Path, bytes],
    class_idx: int | None = None,
) -> str:
    """
    Generate Grad-CAM heatmap overlay on original image and return base64 string.

    Parameters
    ----------
    model : tf.keras.Model
        The compiled brain tumor classification model.
    preprocessed_img : np.ndarray
        The input image tensor of shape (1, 224, 224, 3) normalized in [0, 1].
    original_source : Image.Image | str | Path | bytes
        The original input image (not normalized) for blending.
    class_idx : int | None
        The index of the class to compute Grad-CAM for.
        If None, the model's predicted class will be used.

    Returns
    -------
    str
        Base64-encoded PNG string of the color-blended heatmap overlay.
    """
    # 1. Locate the ResNet50 base sub-model
    try:
        base_model = next(l for l in model.layers if isinstance(l, tf.keras.Model))
    except StopIteration:
        # Fallback if model is flat
        base_model = model

    # 2. Get the target conv layer
    target_layer_name = "conv5_block3_out"
    try:
        conv_layer = base_model.get_layer(target_layer_name)
    except ValueError as exc:
        raise ValueError(
            f"Could not find layer '{target_layer_name}' in the base model. "
            f"Available layers: {[l.name for l in base_model.layers[-5:]]}"
        ) from exc

    # 3. Create a sub-model that maps the base inputs to target conv output & base output
    grad_model = tf.keras.Model(
        inputs=[base_model.input],
        outputs=[conv_layer.output, base_model.output]
    )

    # 4. Record operations under tf.GradientTape to compute gradients
    with tf.GradientTape() as tape:
        # Pass image tensor through the base gradient model
        conv_outputs, base_outputs = grad_model(preprocessed_img)
        
        # Traverse parent model layers to apply classification head manually
        # This keeps gradients traceable w.r.t base submodel layers
        gap_layer = None
        dense_layer = None
        dropout_layer = None
        pred_layer = None
        
        for layer in model.layers:
            name = layer.name.lower()
            if "gap" in name or "global_average_pooling" in name:
                gap_layer = layer
            elif "dense" in name and "predictions" not in name:
                dense_layer = layer
            elif "dropout" in name:
                dropout_layer = layer
            elif "prediction" in name or "output" in name or "dense" in name:
                # predictions dense is usually named 'predictions'
                if layer is not dense_layer:
                    pred_layer = layer

        # Fallbacks by exact name if matching failed
        if not gap_layer: gap_layer = model.get_layer("gap")
        if not dense_layer: dense_layer = model.get_layer("dense_256")
        if not dropout_layer: dropout_layer = model.get_layer("dropout")
        if not pred_layer: pred_layer = model.get_layer("predictions")

        # Forward pass on the head
        x = gap_layer(base_outputs)
        x = dense_layer(x)
        x = dropout_layer(x, training=False)
        predictions = pred_layer(x)

        # Retrieve prediction index if not provided
        if class_idx is None:
            class_idx = tf.argmax(predictions[0]).numpy()
            
        class_channel = predictions[:, class_idx]

    # 5. Compute gradients of the class score w.r.t the feature maps
    grads = tape.gradient(class_channel, conv_outputs)

    # 6. Pool gradients across height/width channels (axis=0 is batch)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    # 7. Weight feature maps by gradient importance and apply ReLU
    conv_outputs = conv_outputs[0]  # shape (H, W, C)
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]  # shape (H, W, 1)
    heatmap = tf.squeeze(heatmap).numpy()                   # shape (H, W)

    # ReLU activation
    heatmap = np.maximum(heatmap, 0)

    # 8. Normalise heatmap to [0, 1]
    heatmap_max = np.max(heatmap)
    if heatmap_max > 0:
        heatmap /= heatmap_max

    # 9. Resize to 224x224 and colorize
    heatmap_resized = cv2.resize(heatmap, (224, 224))
    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_colored_rgb = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)

    # 10. Blend heatmap overlay onto the original MRI scan at 0.4 alpha
    original_arr = load_original_image(original_source)
    overlay = cv2.addWeighted(heatmap_colored_rgb, 0.4, original_arr, 0.6, 0)

    # 11. Encode to base64 PNG string
    _, buffer = cv2.imencode(".png", cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
    base64_str = base64.b64encode(buffer).decode("utf-8")

    return base64_str


# ─── Standalone Smoke-Test ────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    from app.model import build_model
    from app.utils.preprocess import preprocess_path

    # Check for image
    base = Path(__file__).resolve().parents[2] / "dataset"
    test_img = next(base.rglob("*.jpg"), None) or next(base.rglob("*.jpeg"), None)
    
    if test_img is None:
        print("[WARN] No test images found in dataset/ to test Grad-CAM.")
        sys.exit(0)

    print("Building model for smoke test...")
    m = build_model()
    
    print(f"Running Grad-CAM on: {test_img}")
    preprocessed = preprocess_path(test_img)
    
    b64 = generate_gradcam(m, preprocessed, test_img)
    print(f"Grad-CAM Success! Base64 output length: {len(b64)}")
    print(f"Prefix: {b64[:50]}...")
    assert len(b64) > 100, "Base64 string too short!"
    print("gradcam.py smoke-test PASSED")
