"""Registry and download manager for AI models with custom download, cancellation, and deletion."""

import os
import ssl
import threading
import urllib.request
import certifi

import paths
import settings_manager

HF = 'https://huggingface.co'

# key -> {label, category, files: [(url, filename, approx_bytes)], [extract]}
MODELS = {
    'realesr_x4v3': {
        'label': 'Real-ESRGAN General x4v3 (Fast)',
        'category': 'upscale',
        'files': [(f'{HF}/OwlMaster/AllFilesRope/resolve/main/realesr-general-x4v3.onnx',
                   'realesr-general-x4v3.onnx', 4871181)],
    },
    'realesr_x4plus': {
        'label': 'Real-ESRGAN x4plus (High Detail Photo)',
        'category': 'upscale',
        'files': [(f'{HF}/ximin/Real-ESRGAN-ONNX/resolve/main/realesr-x4plus.onnx',
                   'realesr-x4plus.onnx', 67041792)],
    },
    'realesr_anime': {
        'label': 'Real-ESRGAN Anime 6B (Illustration/Anime)',
        'category': 'upscale',
        'files': [(f'{HF}/ximin/Real-ESRGAN-ONNX/resolve/main/realesr-animevideov3.onnx',
                   'realesr-animevideov3.onnx', 17825792)],
    },
    'bg': {
        'label': 'BiRefNet Background Removal',
        'category': 'bg',
        'files': [(f'{HF}/onnx-community/BiRefNet_lite/resolve/main/onnx/model.onnx',
                   'birefnet-lite.onnx', 224005088)],
    },
    'rmbg': {
        'label': 'RMBG-1.4 Background Removal (Fast)',
        'category': 'bg',
        'files': [(f'{HF}/briaai/RMBG-1.4/resolve/main/onnx/model.onnx',
                   'rmbg-1.4.onnx', 176160768)],
    },
    'u2net': {
        'label': 'U-2-Net Salient Object Removal (Classic)',
        'category': 'bg',
        'files': [('https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx',
                   'u2net.onnx', 175997641)],
    },
    'denoise': {
        'label': 'SCUNet Image Denoise',
        'category': 'denoise',
        'files': [(f'{HF}/Heliosoph/scunet-onnx/resolve/main/scunet_color_real_psnr.onnx',
                   'scunet_color_real_psnr.onnx', 3798678),
                  (f'{HF}/Heliosoph/scunet-onnx/resolve/main/scunet_color_real_psnr.onnx.data',
                   'scunet_color_real_psnr.onnx.data', 73134336)],
    },
    'deblur': {
        'label': 'NAFNet Image Deblur',
        'category': 'deblur',
        'files': [(f'{HF}/opencv/deblurring_nafnet/resolve/main/deblurring_nafnet_2025may.onnx',
                   'nafnet-deblur.onnx', 91736251)],
    },
    'colorize': {
        'label': 'DDColor Photo Colorization',
        'category': 'colorize',
        'files': [(f'{HF}/edgetools/ddcolor/resolve/main/ddcolor-tiny-fp16.onnx',
                   'ddcolor-tiny.onnx', 135399424)],
    },
    'erase': {
        'label': 'LaMa Object Eraser (Inpainting)',
        'category': 'erase',
        'files': [(f'{HF}/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx',
                   'lama.onnx', 207971136)],
    },
    'gfpgan': {
        'label': 'GFPGAN v1.4 Face Restoration',
        'category': 'face',
        'description': 'Restores facial details and enhances vintage portrait photos.',
        'files': [(f'{HF}/OwlMaster/AllFilesRope/resolve/main/GFPGANv1.4.onnx',
                   'GFPGANv1.4.onnx', 348651520)],
    },
    'codeformer': {
        'label': 'CodeFormer High-Fidelity Face Restoration',
        'category': 'face',
        'description': 'Advanced facial restoration for highly blurry and degraded portraits.',
        'files': [(f'{HF}/ximin/CodeFormer-ONNX/resolve/main/codeformer.onnx',
                   'codeformer.onnx', 374000000)],
    },
    'bsrgan': {
        'label': 'BSRGAN Blind Super-Resolution x4',
        'category': 'upscale',
        'description': 'Specialized upscaler for noisy images and heavy JPEG compression.',
        'files': [(f'{HF}/ximin/Real-ESRGAN-ONNX/resolve/main/bsrgan_x4.onnx',
                   'bsrgan_x4.onnx', 67000000)],
    },
    'yunet': {
        'label': 'YuNet Face Detection',
        'category': 'face',
        'description': 'Ultra-fast lightweight face detector for auto-cropping and restoration.',
        'files': [('https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx',
                   'face_detection_yunet_2023mar.onnx', 232550)],
    },
    'separate': {
        'label': 'MDX-Net Vocal Separation (Kim Vocal 2)',
        'category': 'audio',
        'description': 'Splits singing vocals and music instrumental backing tracks.',
        'files': [(f'{HF}/seanghay/uvr_models/resolve/main/Kim_Vocal_2.onnx',
                   'kim_vocal_2.onnx', 66759214)],
    },
    'uvr_kara': {
        'label': 'UVR-MDX Karaoke Stem Splitter',
        'category': 'audio',
        'description': 'Isolates lead vocals for karaoke and music production.',
        'files': [(f'{HF}/seanghay/uvr_models/resolve/main/UVR-MDX-NET-Karaoke_2.onnx',
                   'uvr_mdx_kara.onnx', 64800000)],
    },
    'denoise_speech': {
        'label': 'DeepFilterNet3 Speech Noise Removal',
        'category': 'audio',
        'description': 'Removes background noise, mic hiss, and hum from voice recordings.',
        'files': [('https://github.com/Rikorose/DeepFilterNet/raw/v0.5.6/models/DeepFilterNet3_onnx.tar.gz',
                   'DeepFilterNet3_onnx.tar.gz', 7983136)],
        'extract': {'tmp/export/enc.onnx': 'dfn3_enc.onnx',
                    'tmp/export/erb_dec.onnx': 'dfn3_erb_dec.onnx',
                    'tmp/export/df_dec.onnx': 'dfn3_df_dec.onnx'},
    },
}

_lock = threading.Lock()
_state = {k: {'status': 'idle', 'progress': 0, 'error': None} for k in MODELS}
_cancel_flags = {}


def valid(key):
    return key in MODELS


def model_path(key, index=0):
    if key not in MODELS:
        return None
    name = MODELS[key]['files'][index][1]
    return paths.find_model(name)


def _required_names(key):
    spec = MODELS[key]
    if 'extract' in spec:
        return list(spec['extract'].values())
    return [f[1] for f in spec['files']]


def available(key):
    if key not in MODELS:
        return False
    return all(paths.find_model(n) is not None for n in _required_names(key))


def _extract(archive, dest_dir, members):
    import tarfile
    with tarfile.open(archive, 'r:gz') as tf:
        for member, out_name in members.items():
            src = tf.extractfile(member)
            if src is None:
                raise OSError(f'{member} missing from archive')
            with open(os.path.join(dest_dir, out_name), 'wb') as f:
                f.write(src.read())


def total_size(key):
    if key not in MODELS:
        return 0
    return sum(f[2] for f in MODELS[key]['files'])


def status(key):
    with _lock:
        if key not in _state:
            _state[key] = {'status': 'idle', 'progress': 0, 'error': None}
        state = dict(_state[key])
    state['available'] = available(key)
    state['size'] = total_size(key)
    return state


def get_catalog():
    """Return all catalog models with live availability and status."""
    catalog = []
    with _lock:
        for k, v in MODELS.items():
            st = dict(_state.get(k, {'status': 'idle', 'progress': 0, 'error': None}))
            st['key'] = k
            st['label'] = v.get('label', k)
            st['category'] = v.get('category', 'general')
            st['description'] = v.get('description', '')
            st['size'] = total_size(k)
            st['available'] = available(k)
            st['filename'] = v['files'][0][1] if v.get('files') else ''
            catalog.append(st)
    return catalog


def start_download(key):
    """Kick off model download in a background thread."""
    with _lock:
        if key not in MODELS:
            return False
        if _state[key]['status'] == 'downloading' or available(key):
            return True
        _state[key].update(status='downloading', progress=0, error=None)
        _cancel_flags[key] = False
    threading.Thread(target=_download, args=(key,), daemon=True).start()
    return True


def cancel_download(key):
    """Cancel an in-progress download."""
    with _lock:
        if key in _cancel_flags:
            _cancel_flags[key] = True
        if key in _state and _state[key]['status'] == 'downloading':
            _state[key].update(status='idle', progress=0, error='Download cancelled by user')
            return True
    return False


def delete_model(key):
    """Delete a downloaded model from disk."""
    if key not in MODELS:
        return False
    dest_dir = paths.data('models')
    names = _required_names(key)
    deleted = False
    for n in names:
        p = os.path.join(dest_dir, n)
        if os.path.exists(p):
            try:
                os.remove(p)
                deleted = True
            except Exception:
                pass
    with _lock:
        if key in _state:
            _state[key].update(status='idle', progress=0, error=None)
    return deleted


def add_custom_model(url, filename, category='custom', label=None):
    """Register and download a custom ONNX model from a direct URL."""
    clean_name = filename.strip()
    if not clean_name.endswith('.onnx'):
        clean_name += '.onnx'
    key = 'custom_' + clean_name.replace('.', '_').replace('-', '_')

    with _lock:
        MODELS[key] = {
            'label': label or clean_name,
            'category': category,
            'files': [(url.strip(), clean_name, 50000000)],
        }
        _state[key] = {'status': 'idle', 'progress': 0, 'error': None}

    start_download(key)
    return key


def _download(key):
    dest_dir = paths.data('models')
    os.makedirs(dest_dir, exist_ok=True)
    total = total_size(key)
    done_before = 0
    try:
        ctx = None
        try:
            ctx = ssl.create_default_context(cafile=certifi.where())
        except Exception:
            pass

        for url, name, approx in MODELS[key]['files']:
            if _cancel_flags.get(key, False):
                raise InterruptedError("Cancelled")

            dest = os.path.join(dest_dir, name)
            if os.path.exists(dest):
                done_before += approx
                continue

            part = dest + '.part'
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MeowKit/1.2.0',
                'Accept': '*/*',
            }
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
                content_len = resp.headers.get('Content-Length')
                file_total = int(content_len) if content_len and content_len.isdigit() else approx
                done = 0
                with open(part, 'wb') as f:
                    while True:
                        if _cancel_flags.get(key, False):
                            f.close()
                            if os.path.exists(part):
                                os.remove(part)
                            raise InterruptedError("Cancelled")
                        chunk = resp.read(1024 * 512)
                        if not chunk:
                            break
                        f.write(chunk)
                        done += len(chunk)
                        with _lock:
                            _state[key]['progress'] = min(
                                99, int((done_before + done) / max(total, 1) * 100))

            part_size = os.path.getsize(part) if os.path.exists(part) else 0
            if part_size < 1000:
                raise OSError(f'Download of {name} failed: file too small ({part_size} bytes)')
            if os.path.exists(dest):
                try:
                    os.remove(dest)
                except Exception:
                    pass
            os.replace(part, dest)
            done_before += approx

        if 'extract' in MODELS[key]:
            archive = os.path.join(dest_dir, MODELS[key]['files'][0][1])
            _extract(archive, dest_dir, MODELS[key]['extract'])
            if os.path.exists(archive):
                os.remove(archive)

        with _lock:
            _state[key].update(status='done', progress=100)
        print(f'[models] {key} downloaded to {dest_dir}', flush=True)
    except InterruptedError:
        with _lock:
            _state[key].update(status='idle', progress=0, error='Download cancelled')
        print(f'[models] {key} download cancelled', flush=True)
    except Exception as e:
        with _lock:
            _state[key].update(status='error', error=str(e)[:200])
        print(f'[models] {key} download failed: {e}', flush=True)
