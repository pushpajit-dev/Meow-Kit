import os
import subprocess
import sys
import threading
import onnxruntime as ort
import settings_manager

_setup_lock = threading.Lock()
_setup_state = {"status": "idle", "message": "", "progress": 0}


def detect_gpus():
    """Detect available graphics cards on Windows or Linux."""
    gpus = []
    if sys.platform == "win32":
        try:
            cmd = 'Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Caption'
            out = subprocess.check_output(['powershell', '-NoProfile', '-Command', cmd], text=True, timeout=5)
            for line in out.strip().splitlines():
                line = line.strip()
                if line and line not in gpus:
                    gpus.append(line)
        except Exception:
            pass

    if not gpus and sys.platform.startswith("linux"):
        try:
            out = subprocess.check_output(['lspci'], text=True, timeout=5)
            for line in out.strip().splitlines():
                if 'VGA' in line or '3D' in line:
                    gpus.append(line)
        except Exception:
            pass

    return gpus or ["Generic Display Adapter"]


def get_available_providers():
    return ort.get_available_providers()


def get_providers():
    """Return ONNX Runtime execution providers based on user settings."""
    settings = settings_manager.get_settings()
    available = ort.get_available_providers()
    providers = []

    if settings.get("gpu_enabled", False):
        if "CUDAExecutionProvider" in available:
            providers.append("CUDAExecutionProvider")
        if "DmlExecutionProvider" in available:
            providers.append("DmlExecutionProvider")

    if settings.get("hybrid_enabled", True) or not providers:
        if "CPUExecutionProvider" not in providers:
            providers.append("CPUExecutionProvider")

    return providers or ["CPUExecutionProvider"]


def setup_gpu_async():
    """Install or upgrade ONNX Runtime DirectML / CUDA in the current virtual environment."""
    with _setup_lock:
        if _setup_state["status"] == "running":
            return {"status": "running", "message": "Setup already in progress"}
        _setup_state.update(status="running", message="Detecting GPU and preparing installation...", progress=10)

    def _worker():
        try:
            gpus = detect_gpus()
            has_nvidia = any("NVIDIA" in g.upper() or "GEFORCE" in g.upper() or "RTX" in g.upper() for g in gpus)
            python_exe = sys.executable

            with _setup_lock:
                _setup_state.update(
                    message=f"Found: {', '.join(gpus)}. Installing DirectML / GPU acceleration...",
                    progress=30
                )

            # On Windows, onnxruntime-directml gives native DirectX 12 hardware acceleration
            # across ALL NVIDIA, AMD, and Intel GPUs without needing CUDA toolkit matching.
            pkg = "onnxruntime-directml"
            cmd = [python_exe, "-m", "pip", "install", "--upgrade", pkg]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

            if proc.returncode != 0:
                with _setup_lock:
                    _setup_state.update(status="error", message=f"Installation failed: {proc.stderr[:200]}", progress=100)
                return

            with _setup_lock:
                # Enable GPU in settings
                settings_manager.save_settings({"gpu_enabled": True, "hybrid_enabled": True})
                _setup_state.update(
                    status="done",
                    message="GPU hardware acceleration configured successfully! Restarting sessions will use GPU.",
                    progress=100
                )
        except Exception as e:
            with _setup_lock:
                _setup_state.update(status="error", message=str(e)[:200], progress=100)

    threading.Thread(target=_worker, daemon=True).start()
    return {"status": "running", "message": "GPU setup started"}


def get_setup_status():
    with _setup_lock:
        return dict(_setup_state)


def get_system_gpu_info():
    gpus = detect_gpus()
    real_gpus = [g for g in gpus if g != "Generic Display Adapter"]
    if not real_gpus and gpus:
        real_gpus = gpus

    providers = ort.get_available_providers()
    active = get_providers()
    settings = settings_manager.get_settings()

    cuda_avail = "CUDAExecutionProvider" in providers
    dml_avail = "DmlExecutionProvider" in providers

    status_summary = ""
    if dml_avail or cuda_avail:
        status_summary = f"Hardware acceleration active ({'CUDA' if cuda_avail else 'DirectML'})."
    elif real_gpus:
        status_summary = f"Detected: {', '.join(real_gpus)}. Ready for acceleration."
    else:
        status_summary = "Running in CPU mode."

    return {
        "gpus": real_gpus,
        "providers": providers,
        "active_providers": active,
        "cuda_available": cuda_avail,
        "directml_available": dml_avail,
        "gpu_enabled": settings.get("gpu_enabled", True),
        "hybrid_enabled": settings.get("hybrid_enabled", True),
        "status_summary": status_summary
    }


def start_directml_setup():
    res = setup_gpu_async()
    return res.get("status") == "running"

