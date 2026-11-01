# Meow Kit 1.2.0 Walkthrough

## Summary of Completed Fixes & Enhancements

### 1. Setup Wizard & Installer Branding
- **Setup Icon**: Explicitly configured `"installerIcon": "icons/icon.ico"` and `"uninstallerIcon": "icons/icon.ico"` in `tauri.conf.json`. `icon.ico` contains all standard icon resolutions (256x256, 128x128, 64x64, 48x48, 32x32, 16x16) generated directly from the official Meow Kit logo.
- **Finish Page Text Color**: Added `!define MUI_FORCECLASSICCONTROLS` in `hooks.nsi`. This instructs NSIS MUI2 to disable the Windows UXTHEME override on the finish page checkboxes ("Run Meow Kit" and "Create Desktop Shortcut"), rendering their text in crisp white (`#FFFFFF`) against the dark purple (`#1E1A2F`) background.
- **Installer Graphics**: Re-generated `sidebar.bmp` and `header.bmp` with the official logo, "MEOW KIT" in clean uppercase font, "AI Media Studio", and removed all external names.

### 2. Hardware & GPU Detection
- **Duplicate Routes Removed**: Deleted duplicate `/api/gpu/*` and `/api/models/*` routes in `app.py` that were previously shadowing the real endpoints and causing `data.gpus` to be undefined.
- **Hardware Detection**: `static/js/settings-app.js` and `static/js/app.js` now properly display detected hardware (e.g., `NVIDIA GeForce RTX 3060`).
- **Status Badge**: Top-right status badge displays `GPU Ready` when dedicated GPU or acceleration is active.

### 3. Image Upscaler Stuck at 0% Resolution
- **Pro Upscaler Timeout**: Reduced worker initialization timeout from 120s to 4s in `pro-upscaler.js`.
- **Automatic Server AI Fallback**: In `static/js/image-app.js`, `runQuickUpscale()`, `runEnhance()`, and batch upscaling now automatically fallback to `runServerUpscale(startTime, 'ai')` if the browser worker or CDN script encounters an issue, ensuring upscaling never hangs at 0%.

### 4. Background Removal: Entire Object Shape Detection
- **Connected Component Analysis**: In `bg_remove.py`, `refine_mask_with_markers` analyzes connected components in the AI mask so that when a user marks an object (Keep or Remove), the **entire object silhouette / shape** is selected rather than only the painted stroke.
- **Edge-Aware Contour Expansion**: Missed objects are detected by expanding keep strokes to Canny/Sobel edges and refined via 4 iterations of OpenCV GrabCut with morphological closing and Gaussian antialiasing.

### 5. Dual / Triple Model Selection
- Added **U-2-Net** as the 3rd model alongside **RemBG (RMBG-1.4)** and **BiRefNet**.
- Model selection buttons are available directly in the Background Remover tab:
  - `RemBG (RMBG-1.4 Precision)`
  - `BiRefNet (Balanced)`
  - `U-2-Net (Classic Salient)`

### 6. Background Color Options
- Added buttons for `Transparent`, `White`, `Black`, and `Custom Color` (with color picker) in both single and batch background removal modes.

### 7. Noise Image Removal
- Denoise tool powered by SCUNet (`scunet_color_real_psnr.onnx`) is available under the **Denoise & Deblur** tab for real-world photo noise removal.

---

## Deliverables
- **NSIS Setup Executable (.exe)**:
  `K:\Meowkit\Installers\exe\Meow Kit_1.2.0_x64-setup.exe` (216 MB)
- **MSI Windows Installer Package (.msi)**:
  `K:\Meowkit\Installers\msi\Meow Kit_1.2.0_x64-setup.msi` (269 MB)
  `K:\Meowkit\Installers\msi\Meow Kit_1.2.0_x64_en-US.msi` (269 MB)
