# PyInstaller spec — builds the Meow Kit Flask backend into a single sidecar binary.
# Bundles templates, static assets, and the small Real-ESRGAN + YuNet models.
import os

datas = [
    ('templates', 'templates'),
    ('static', 'static'),
    ('llms.txt', '.'),
]

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'ai_engine',
        'face_restore',
        'paths',
        'settings_manager',
        'gpu_manager',
        'model_store',
        'bg_remove',
        'restore_engine',
        'audio_engine',
        'video_tools'
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=['matplotlib', 'pytest'],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='meowkit-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
)
