"""Path resolution for both dev mode and the packaged desktop app.

Dev mode: everything lives in the repo directory as before.
Packaged (PyInstaller sidecar inside Tauri): read-only assets are unpacked
to sys._MEIPASS, writable data goes to NEXTGENUP_DATA (the Tauri app-data
dir), and ffmpeg/ffprobe sit next to the executable.
"""

import os
import sys

BUNDLE_DIR = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.environ.get('MEOWKIT_DATA') or os.environ.get('NEXTGENUP_DATA') or os.getcwd()

FROZEN = bool(getattr(sys, 'frozen', False))
EXE_DIR = os.path.dirname(sys.executable) if FROZEN else None


def resource(rel):
    """Read-only bundled asset (templates, static, small models)."""
    return os.path.join(BUNDLE_DIR, rel)


def data(rel):
    """Writable location (uploads, outputs, frames, tasks.db)."""
    if rel == 'outputs':
        try:
            import settings_manager
            return settings_manager.get_media_dir()
        except Exception:
            pass
    if rel == 'models':
        try:
            import settings_manager
            return settings_manager.get_models_dir()
        except Exception:
            pass
    return os.path.join(DATA_DIR, rel)


def find_model(name):
    """Look for an ONNX model: user's custom models dir first, then default data dir, then bundled."""
    candidates = []
    try:
        import settings_manager
        custom_models = settings_manager.get_models_dir()
        if custom_models:
            candidates.append(os.path.join(custom_models, name))
    except Exception:
        pass

    candidates.extend([
        os.path.join(DATA_DIR, 'models', name),
        resource(os.path.join('static', 'models', name))
    ])

    for p in candidates:
        if os.path.exists(p):
            return p
    return None
