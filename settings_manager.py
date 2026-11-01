import json
import os
import threading

_lock = threading.Lock()
_SETTINGS_FILE = "settings.json"

DEFAULT_SETTINGS = {
    "media_save_dir": "",
    "model_save_dir": "",
    "gpu_enabled": False,
    "hybrid_enabled": True,
    "active_models": {
        "upscale": "realesr-general-x4v3.onnx",
        "bg": "birefnet-lite.onnx",
        "denoise": "scunet_color_real_psnr.onnx",
        "deblur": "nafnet-deblur.onnx",
        "colorize": "ddcolor-tiny.onnx",
        "erase": "lama.onnx",
        "separate": "kim_vocal_2.onnx",
        "denoise_speech": "dfn3_enc.onnx"
    }
}


def _settings_path():
    import paths
    return paths.data(_SETTINGS_FILE)


def get_settings():
    path = _settings_path()
    with _lock:
        if not os.path.exists(path):
            return dict(DEFAULT_SETTINGS)
        try:
            with open(path, "r", encoding="utf-8") as f:
                saved = json.load(f)
                res = dict(DEFAULT_SETTINGS)
                res.update(saved)
                if "active_models" in saved:
                    res["active_models"] = dict(DEFAULT_SETTINGS["active_models"])
                    res["active_models"].update(saved["active_models"])
                return res
        except Exception:
            return dict(DEFAULT_SETTINGS)


def save_settings(new_settings):
    path = _settings_path()
    with _lock:
        current = get_settings()
        current.update(new_settings)
        if "active_models" in new_settings:
            current["active_models"] = dict(current.get("active_models", {}))
            current["active_models"].update(new_settings["active_models"])
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
        return current


def get_media_dir():
    s = get_settings()
    custom = s.get("media_save_dir", "").strip()
    if custom and os.path.isdir(custom):
        return custom
    import paths
    return os.path.join(paths.DATA_DIR, "outputs")


def get_models_dir():
    s = get_settings()
    custom = s.get("model_save_dir", "").strip()
    if custom and os.path.isdir(custom):
        return custom
    import paths
    return os.path.join(paths.DATA_DIR, "models")


def get_active_model(tool_category, default_filename=None):
    s = get_settings()
    return s.get("active_models", {}).get(tool_category, default_filename)


def get_all_settings():
    return get_settings()


def update_settings(new_settings):
    return save_settings(new_settings)


def get_setting(key, default=None):
    return get_settings().get(key, default)


def set_setting(key, value):
    return save_settings({key: value})

