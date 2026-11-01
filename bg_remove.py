"""Server-side background removal via BiRefNet-lite and RMBG-1.4 (RemBG).

Supports dual AI engines:
- BiRefNet: High-accuracy general segmentation.
- RemBG (RMBG-1.4): High-precision edge and object segmentation.

Includes interactive object marker refinement (Keep / Remove) using OpenCV GrabCut.
"""

import threading
import numpy as np
from PIL import Image, ImageFilter
import cv2

import model_store

INPUT_SIZE = 1024
# ImageNet normalization for BiRefNet
BIREFNET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
BIREFNET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# RMBG-1.4 normalization
RMBG_MEAN = np.array([0.5, 0.5, 0.5], dtype=np.float32)
RMBG_STD = np.array([1.0, 1.0, 1.0], dtype=np.float32)

_sessions = {}
_session_lock = threading.Lock()
_infer_lock = threading.Lock()


def _engine_key(engine='birefnet'):
    if engine == 'u2net':
        return 'u2net'
    elif engine == 'rembg':
        return 'rmbg'
    return 'bg'


def model_path(engine='birefnet'):
    return model_store.model_path(_engine_key(engine))


def available(engine='birefnet'):
    return model_store.available(_engine_key(engine))


def download_status(engine='birefnet'):
    return model_store.status(_engine_key(engine))


def start_download(engine='birefnet'):
    model_store.start_download(_engine_key(engine))


def _get_session(engine='birefnet'):
    global _sessions
    import onnxruntime as ort
    import gpu_manager

    key = _engine_key(engine)
    with _session_lock:
        if key not in _sessions:
            path = model_store.model_path(key)
            _sessions[key] = ort.InferenceSession(
                path, providers=gpu_manager.get_providers()
            )
        return _sessions[key]


def _predict_mask(img, engine='birefnet'):
    """Run AI segmentation on a PIL image, return an alpha mask at the image's size."""
    sess = _get_session(engine)
    input_name = sess.get_inputs()[0].name

    input_size = 320 if engine == 'u2net' else INPUT_SIZE
    small = img.resize((input_size, input_size), Image.BILINEAR)
    arr = np.asarray(small, dtype=np.float32) / 255.0

    if engine == 'rembg':
        arr = (arr - RMBG_MEAN) / RMBG_STD
    else:
        arr = (arr - BIREFNET_MEAN) / BIREFNET_STD

    inp = arr.transpose(2, 0, 1)[np.newaxis]

    with _infer_lock:
        out = sess.run(None, {input_name: np.ascontiguousarray(inp)})[0]

    out_arr = out[0] if (isinstance(out, (list, tuple)) or (isinstance(out, np.ndarray) and out.ndim == 4)) else out
    mask = np.squeeze(out_arr).astype(np.float32)
    # If the export emits logits, apply sigmoid; RMBG outputs are already [0, 1]
    if mask.min() < -0.01 or mask.max() > 1.01:
        mask = 1.0 / (1.0 + np.exp(-mask))
    mask8 = (np.clip(mask, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8)

    alpha = Image.fromarray(mask8, mode='L').resize(img.size, Image.LANCZOS)
    return alpha.filter(ImageFilter.GaussianBlur(radius=1))


def refine_mask_with_markers(img, alpha_mask, keep_mask=None, remove_mask=None):
    """Refine initial alpha mask by detecting the ENTIRE SHAPE of marked objects (not just painted strokes)."""
    w, h = img.size
    has_keep = keep_mask is not None and np.any(np.array(keep_mask) > 50)
    has_remove = remove_mask is not None and np.any(np.array(remove_mask) > 50)

    if not has_keep and not has_remove:
        return alpha_mask

    img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    alpha_arr = np.array(alpha_mask)

    # 1. Connected Component Shape Detection on AI Mask
    # If user marks an object to REMOVE, find the AI mask component it touches and remove the ENTIRE component shape.
    # If user marks an object to KEEP, find the AI mask component it touches and keep that entire component shape.
    ai_bin = (alpha_arr > 128).astype(np.uint8)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(ai_bin, connectivity=8)

    keep_arr = np.array(keep_mask.resize((w, h), Image.NEAREST)) if has_keep else None
    rem_arr = np.array(remove_mask.resize((w, h), Image.NEAREST)) if has_remove else None

    # Initialize GrabCut mask
    gc_mask = np.full((h, w), cv2.GC_PR_BGD, dtype=np.uint8)
    gc_mask[alpha_arr > 128] = cv2.GC_PR_FGD
    gc_mask[alpha_arr <= 128] = cv2.GC_PR_BGD

    # If user marked REMOVE on an AI-detected object component:
    if has_remove and rem_arr is not None:
        rem_coords = np.where(rem_arr > 50)
        touched_labels = np.unique(labels[rem_coords])
        for lbl in touched_labels:
            if lbl == 0:
                continue
            # Entire component shape is marked for removal
            gc_mask[labels == lbl] = cv2.GC_BGD
        gc_mask[rem_arr > 50] = cv2.GC_BGD

    # If user marked KEEP on an object:
    if has_keep and keep_arr is not None:
        keep_coords = np.where(keep_arr > 50)
        touched_labels = np.unique(labels[keep_coords])
        for lbl in touched_labels:
            if lbl == 0:
                continue
            # Entire component shape is marked for keeping
            gc_mask[labels == lbl] = cv2.GC_FGD
        gc_mask[keep_arr > 50] = cv2.GC_FGD

        # Also detect shape of objects that the AI missed:
        # Compute bounding rectangle of keep strokes and expand to object contours
        ys, xs = keep_coords
        if len(ys) > 0:
            ymin, ymax = max(0, int(np.min(ys)) - 40), min(h, int(np.max(ys)) + 40)
            xmin, xmax = max(0, int(np.min(xs)) - 40), min(w, int(np.max(xs)) + 40)
            roi = img_cv[ymin:ymax, xmin:xmax]
            if roi.size > 0:
                gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
                edges_roi = cv2.Canny(gray_roi, 30, 100)
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
                edges_dilated = cv2.dilate(edges_roi, kernel)
                roi_keep = (keep_arr[ymin:ymax, xmin:xmax] > 50).astype(np.uint8)
                roi_keep_dilated = cv2.dilate(roi_keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
                shape_fg = (roi_keep_dilated > 0) & (edges_dilated == 0)
                sub_gc = gc_mask[ymin:ymax, xmin:xmax]
                sub_gc[shape_fg & (sub_gc != cv2.GC_BGD)] = cv2.GC_PR_FGD
                gc_mask[ymin:ymax, xmin:xmax] = sub_gc

    try:
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        cv2.grabCut(img_cv, gc_mask, None, bgd_model, fgd_model, 4, cv2.GC_INIT_WITH_MASK)
        refined = np.where((gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    except Exception:
        refined = np.where(gc_mask == cv2.GC_BGD, 0, alpha_arr).astype(np.uint8)

    # Clean edges with morphological smoothing
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    refined = cv2.morphologyEx(refined, cv2.MORPH_CLOSE, kernel)

    refined_pil = Image.fromarray(refined, mode='L')
    return refined_pil.filter(ImageFilter.GaussianBlur(radius=1))


def remove_background(in_path, out_path, background='transparent',
                      engine='birefnet', keep_mask=None, remove_mask=None,
                      progress_cb=None):
    """Remove the background from an image with optional engine selection and marker refinement."""
    img = Image.open(in_path).convert('RGB')
    if progress_cb:
        progress_cb(30, f'Running {engine.upper()} AI segmentation...')

    alpha = _predict_mask(img, engine=engine)

    if keep_mask is not None or remove_mask is not None:
        if progress_cb:
            progress_cb(75, 'Refining cutout with object markers...')
        alpha = refine_mask_with_markers(img, alpha, keep_mask=keep_mask, remove_mask=remove_mask)

    if progress_cb:
        progress_cb(88, 'Compositing...')

    cutout = img.convert('RGBA')
    cutout.putalpha(alpha)

    if background == 'transparent':
        result = cutout
    else:
        color = background.lstrip('#')
        rgb = tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))
        result = Image.new('RGBA', img.size, rgb + (255,))
        result.alpha_composite(cutout)
        result = result.convert('RGB')

    result.save(out_path, 'PNG')
    return img.size

