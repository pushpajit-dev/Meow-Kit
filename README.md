<div align="center">

<img src="https://i.imgur.com/7usVcz6.jpeg" alt="Gemini_Generated_Image_1rz7731rz7731rz7-clean" width="100%" style="border-radius: 16px; max-width: 960px; box-shadow: 0 12px 36px rgba(0,0,0,0.35);">

<br><br>

# 🐾 Meow Kit — AI-Powered Media Studio
### *The Ultimate All-in-One Local AI Suite for Images, Video, Audio & Restoration*

[![Version](https://img.shields.io/badge/version-1.2.0-blueviolet?style=for-the-badge&logo=tauri)](https://github.com/noishixzen/meowkit)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey?style=for-the-badge&logo=windows)](https://github.com/noishixzen/meowkit)
[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![GPU](https://img.shields.io/badge/GPU-CUDA%20%7C%20DirectML%20%7C%20WebGPU-76B900?style=for-the-badge&logo=nvidia)](https://developer.nvidia.com)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Offline%20%26%20Local-success?style=for-the-badge&logo=shield)](https://github.com/noishixzen/meowkit)

<br>

<p align="center">
  <a href="https://drive.google.com/file/d/1NvSKu3m-XKrItpCwvvD06b0tQisgu_cd/view?usp=drive_link">
    <img src="https://img.shields.io/badge/📥_Download_Windows_Setup-EXE_(216_MB)-6C5CE7?style=for-the-badge&logo=windows&logoColor=white" height="40" alt="Download EXE">
  </a>
  &nbsp;&nbsp;
  <a href="https://drive.google.com/drive/folders/1tbmM47KsI1FWEyP6ZBqiTVf2PHcNEIAA?usp=drive_link">
    <img src="https://img.shields.io/badge/📦_Download_Installer-MSI_Folder-00CEC9?style=for-the-badge&logo=windows&logoColor=white" height="40" alt="Download MSI">
  </a>
</p>

<p align="center">
  <b>Free, Private & Open Source alternative to Topaz Photo/Video AI, remove.bg, Magic Eraser, lalal.ai & LANDR.</b><br>
  No subscriptions • No watermarks • No cloud upload • 100% Runs on your hardware
</p>

</div>

---

## ⚡ Direct Downloads (Windows)

| Installer Type | Description | Link |
| :--- | :--- | :--- |
| **🚀 Windows Setup (.exe)** | One-click NSIS setup wizard with dark purple theme & desktop shortcut | [**Download EXE from Google Drive**](https://drive.google.com/file/d/1NvSKu3m-XKrItpCwvvD06b0tQisgu_cd/view?usp=drive_link) |
| **📦 Windows Package (.msi)** | Enterprise-ready MSI Windows installer directory | [**Browse MSI on Google Drive**](https://drive.google.com/drive/folders/1tbmM47KsI1FWEyP6ZBqiTVf2PHcNEIAA?usp=drive_link) |

---

## 🌟 What is Meow Kit?

**Meow Kit** is a unified, locally hosted AI creative suite powered by **Tauri 2**, **Flask**, **ONNX Runtime**, and **WebGPU**. It bundles state-of-the-art open-source deep learning models into an intuitive desktop application for creators, editors, photographers, and audio engineers.

Your files never leave your computer: every inference task is performed locally using your GPU (NVIDIA CUDA / DirectML / WebGPU) or high-efficiency multi-core CPU.

---

## 🛠️ Complete Feature Matrix

### 🖼️ Photo & Image Tools
- **Ultra Super-Resolution (Up to 8K)**: Scale images by 2× or 4× using Real-ESRGAN (`realesr-general-x4v3`).
- **Enhance Mode (Same-Size Reconstruction)**: Cleans JPEG artifacts, reconstructs texture, and removes compression noise without changing dimensions.
- **Precision Background Removal (3 Selectable Models)**:
  - `RemBG (RMBG-1.4)`: High-precision edge detail.
  - `BiRefNet`: Balanced human and product segmentation.
  - `U-2-Net`: Classic salient object detection.
  - *Backdrop options*: Transparent PNG, Clean White, Deep Black, or Custom Color Picker.
  - *Smart Shape Detection*: Brush a simple stroke over an object to select and keep or cut its entire silhouette with automatic GrabCut & contour expansion.
- **Magic Eraser (Object Inpainting)**: Brush over unwanted people, trash, wires, or watermarks; LaMa (*Large Mask Inpainting*) regenerates clean textures in seconds.
- **Denoise (SCUNet)**: Eliminates ISO noise, sensor grain, and low-light speckles while keeping edge sharpness intact.
- **Deblur (NAFNet)**: Reverses camera shake, lens blur, and fast-motion distortions.
- **Old Photo Restoration & Colorization**:
  - Restores faded, vintage, black-and-white photos using **DDColor**.
  - Restores faces automatically with **GFPGAN v1.4** alignment and blending.

### 🎵 Audio Studio
- **Vocal Remover / Stem Splitter**: Isolates acapellas and instrumentals using **MDX-Net (Kim Vocal 2)** with real-time waveform preview and ZIP stem export.
- **Speech Noise Cleaner**: Strips background hums, fan whirs, traffic, and room reverb using **DeepFilterNet3**.
- **1-Click Automatic Mastering**: Audio DSP engine that analyzes LUFS loudness, dynamic range, and tone, then applies an automated mastering chain with fine-tuning knobs (Bass, Treble, Tone, De-hiss, Stereo Width) and loudness-matched A/B preview.
- **Lossless Tag Editor**: Inspects, strips, and rewrites ID3 and WAV metadata without re-encoding audio bytes.

### 🎬 Video Tools
- **Video Upscaling (Up to 4K)**:
  - *Fast Lanczos + CAS Sharpening*: Rapid hardware scaling for long footage.
  - *Pro Frame-by-Frame AI*: Real-ESRGAN inference with audio preservation.
- **Audio Extraction & Voice Isolator**: Remove background music, extract voice, or mute noise tracks directly from videos.
- **Smart Video Compressor**: Compress large recordings for Discord (8 MB / 25 MB / 50 MB), WhatsApp, or Email.
- **GIF Maker**: Convert clips to smooth, optimized animated GIFs.

---

## 🆚 Meow Kit vs. Commercial Paid Tools

| Capability | **Meow Kit** | Topaz Photo / Video AI | remove.bg | Magic Eraser | lalal.ai / Moises |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Pricing** | **Free & Open Source** | ~$199/yr | ~$0.20 / photo | $9.99/mo | ~$10 - $20/mo |
| **Data Privacy** | **100% Local / Offline** | Cloud / Local | Cloud upload | Cloud upload | Cloud upload |
| **Image Upscale (8K)** | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Background Removal** | ✅ 3 Models + Colors | ❌ No | ✅ Paid | ❌ No | ❌ No |
| **Object Magic Eraser** | ✅ Yes (LaMa) | ❌ No | ❌ No | ✅ Paid | ❌ No |
| **Photo Colorization** | ✅ Yes (DDColor) | ❌ No | ❌ No | ❌ No | ❌ No |
| **Face Restoration** | ✅ Yes (GFPGAN) | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Audio Stem Splitting** | ✅ Yes (MDX-Net) | ❌ No | ❌ No | ❌ No | ✅ Paid |
| **Speech Denoising** | ✅ Yes (DeepFilter3) | ❌ No | ❌ No | ❌ No | ❌ No |
| **Video Upscaling (4K)**| ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No |

---

## 💻 Tech Stack & Architecture

```
┌────────────────────────────────────────────────────────┐
│               Meow Kit Desktop App (Tauri 2)            │
│       Native Window • System Tray • Auto Hardware Check │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
   ┌───────────────────────┐   ┌─────────────────────────┐
   │    Desktop Web UI     │   │   Python Micro-Server   │
   │  WebGPU / WASM Worker │   │    Flask + ONNX Runtime │
   │  In-Browser DSP Audio │   │   CUDA / DirectML / CPU │
   └───────────────────────┘   └───────────┬─────────────┘
                                           │
                               ┌───────────┴───────────┐
                               ▼                       ▼
                     ┌──────────────────┐    ┌──────────────────┐
                     │   ONNX Models    │    │  FFmpeg Engine   │
                     │ Real-ESRGAN/LaMa │    │ Lanczos / Filter │
                     │ BiRefNet / DDColor│   │  Audio Remuxing  │
                     └──────────────────┘    └──────────────────┘
```

- **Frontend**: Tauri 2 Shell, HTML5, Vanilla JavaScript, WebGPU, WebAssembly.
- **Backend**: Python 3.12, Flask, ONNX Runtime, OpenCV, PyTorch, Librosa.
- **Media Pipeline**: FFmpeg & FFprobe (GPL-master static).
- **Inference Engines**: ONNX Runtime with execution providers for **CUDA**, **DirectML**, and multi-threaded CPU.

---

## 🚀 Running from Source

### Prerequisites
- **Git**
- **Python 3.10 – 3.12**
- **FFmpeg** on system PATH (or bundled)
- *(Optional)* **Node.js 18+** & **Rust** (only if compiling the desktop shell)

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/meowkit.git
cd meowkit
```

### 2. Set Up Virtual Environment & Dependencies
```bash
# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Linux / macOS (Bash)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Run the Backend & Studio
```bash
python app.py
```
Open your browser at **`http://localhost:5000`** or connect devices on your local network using `http://<your-local-ip>:5000`.

### 4. Build Desktop Binary (Optional)
```bash
npm install
npm run tauri build
```

---

## 🧠 Supported AI Models

| Task | Architecture / Model | Default Provider | License |
| :--- | :--- | :--- | :--- |
| **Image Super-Resolution** | Real-ESRGAN (`realesr-general-x4v3`) | WebGPU / CUDA / CPU | BSD-3-Clause |
| **Background Removal** | BiRefNet / RemBG (RMBG-1.4) / U-2-Net | ONNX Runtime | Apache 2.0 / MIT |
| **Object Inpainting** | LaMa (*Large Mask Inpainting*) | ONNX Runtime | Apache 2.0 |
| **Image Denoising** | SCUNet (*Practical Image Denoising*) | ONNX Runtime | MIT |
| **Image Deblurring** | NAFNet (*Nonlinear Activation Free*) | ONNX Runtime | MIT |
| **Photo Colorization** | DDColor-tiny | ONNX Runtime | Apache 2.0 |
| **Face Restoration** | GFPGAN v1.4 + YuNet | ONNX Runtime | Apache 2.0 |
| **Vocal Stem Splitter** | MDX-Net (*Kim Vocal 2*) | ONNX Runtime | MIT |
| **Speech Denoising** | DeepFilterNet3 | ONNX Runtime | MIT |

> [!NOTE]
> All heavy models are downloaded on-demand upon first use into your local application cache, keeping the initial installer lightweight.

---

## ⚙️ Configuration & Environment

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for the local web server |
| `MEOWKIT_DATA` | System AppData | Storage path for downloaded models, uploads, and outputs |
| `CLEANUP_HOURS`| `24` | Auto-removes temporary cached files older than this duration |
| `FLASK_DEBUG`  | `0` | Set to `1` only for local developer debugging |

---

## 🔒 Privacy & Safety Guarantee

- **Zero Cloud Leakage**: No telemetry, analytics, tracking tokens, or user data collection.
- **Offline First**: Runs seamlessly without internet access once models are downloaded.
- **Your Files Remain Yours**: Source media and generated outputs never leave your storage drives.

---

## 👤 Author & Support

- **Created by**: **NoishiXzen**
- **Email**: [noishixzen@gmail.com](mailto:noishixzen@gmail.com)
- **Web Portfolio**: [aivorygen.netlify.app](https://aivorygen.netlify.app)
- **Bug Reports & Requests**: Please open an issue on the GitHub repository.

---

## 📄 License

Meow Kit is released under the **[MIT License](LICENSE)**. Feel free to use, modify, distribute, and contribute!

<div align="center">
  <sub>© 2026 NoishiXzen. All rights reserved.</sub>
</div>
