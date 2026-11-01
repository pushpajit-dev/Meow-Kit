/**
 * Meow Kit — Background remover controller.
 * BiRefNet runs on the server; the model downloads once on first use.
 * Single mode: one image, pick a background, compare panels.
 * Batch mode: multiple images, per-item progress, zip download.
 */
(function () {
    'use strict';

    const bgState = {
        taskId: null,
        file: null,
        originalUrl: null,
        background: 'transparent',
        engine: 'rembg',
        processing: false,
        cancelRequested: false,
        markerMode: 'keep',
        brushSize: 20,
        hasStrokes: false,
    };

    const bgBatch = {
        items: [],       // { file, url, status, taskId, el }
        running: false,
        background: 'transparent',
        engine: 'rembg',
        cancelRequested: false,
        currentTaskId: null,
    };

    const $ = (sel) => document.querySelector(sel);
    const NGU_TOKEN = document.querySelector('meta[name="ngu-token"]')?.content || '';
    const setupSection = $('#bg-setup-section');
    const uploadSection = $('#bg-upload-section');
    const appSection = $('#bg-app-section');
    const batchSection = $('#bg-batch-section');
    const dropzone = $('#bg-dropzone');
    const fileInput = $('#bg-file-input');
    const originalImg = $('#bg-original');
    const resultImg = $('#bg-result');
    const outputPlaceholder = $('#bg-output-placeholder');
    const startBtn = $('#bg-start-btn');
    const progressSection = $('#bg-progress-section');
    const progressFill = $('#bg-progress-fill');
    const progressMessage = $('#bg-progress-message');
    const progressPercent = $('#bg-progress-percent');
    const downloadSection = $('#bg-download-section');
    const newRow = $('#bg-new-row');

    const markerCanvas = $('#bg-marker-canvas');
    const markerCtx = markerCanvas ? markerCanvas.getContext('2d') : null;
    const keepCanvas = document.createElement('canvas');
    const keepCtx = keepCanvas.getContext('2d');
    const removeCanvas = document.createElement('canvas');
    const removeCtx = removeCanvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    init();

    async function init() {
        bindEvents();
        initMarkerCanvas();
        try {
            const [sRembg, sBiref, sU2net] = await Promise.all([
                fetch('/api/bg/model?engine=rembg').then((r) => r.json()).catch(() => ({ available: false })),
                fetch('/api/bg/model?engine=birefnet').then((r) => r.json()).catch(() => ({ available: false })),
                fetch('/api/bg/model?engine=u2net').then((r) => r.json()).catch(() => ({ available: false }))
            ]);

            if (sRembg.available) {
                bgState.engine = 'rembg';
                showPanel(true);
            } else if (sBiref.available) {
                bgState.engine = 'birefnet';
                showPanel(true);
            } else if (sU2net.available) {
                bgState.engine = 'u2net';
                showPanel(true);
            } else {
                showPanel(false);
                if (sRembg.status === 'downloading' || sBiref.status === 'downloading' || sU2net.status === 'downloading') {
                    if (sBiref.status === 'downloading') bgState.engine = 'birefnet';
                    else if (sU2net.status === 'downloading') bgState.engine = 'u2net';
                    resumeModelUI();
                }
            }
        } catch {
            showPanel(false);
        }
    }

    function showPanel(modelReady) {
        setupSection.classList.toggle('hidden', modelReady);
        uploadSection.classList.toggle('hidden', !modelReady);
    }

    function bindEvents() {
        $('#bg-model-btn').addEventListener('click', startModelDownload);

        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('drag-over');
        });
        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-over');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                handleFiles(e.dataTransfer.files);
            }
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) handleFiles(fileInput.files);
        });

        bindChoiceButtons('#bg-choice-buttons', '[data-bgchoice]', '#bg-color-picker',
            (v) => { bgState.background = v; });
        bindChoiceButtons('#bg-batch-choice-buttons', '[data-bgbatchchoice]', '#bg-batch-color-picker',
            (v) => { bgBatch.background = v; });

        // Engine choice buttons
        document.querySelectorAll('#bg-engine-buttons [data-bgengine]').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#bg-engine-buttons [data-bgengine]').forEach((b) => b.classList.remove('selected'));
                btn.classList.add('selected');
                bgState.engine = btn.dataset.bgengine;
            });
        });

        // Marker controls
        document.querySelectorAll('.marker-btn[data-mode]').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.marker-btn[data-mode]').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                bgState.markerMode = btn.dataset.mode;
            });
        });

        const brushSlider = $('#marker-brush-size');
        const brushVal = $('#marker-size-val');
        if (brushSlider) {
            brushSlider.addEventListener('input', () => {
                bgState.brushSize = parseInt(brushSlider.value, 10) || 20;
                if (brushVal) brushVal.textContent = `${bgState.brushSize}px`;
            });
        }

        const clearBtn = $('#marker-clear-btn');
        if (clearBtn) clearBtn.addEventListener('click', clearMarkers);

        const refineBtn = $('#bg-refine-btn');
        if (refineBtn) refineBtn.addEventListener('click', startRemoval);

        startBtn.addEventListener('click', startRemoval);
        $('#bg-cancel-btn').addEventListener('click', cancelJob);
        $('#bg-download-btn').addEventListener('click', downloadResult);
        $('#bg-new-btn').addEventListener('click', resetSingle);

        $('#bg-batch-start-btn').addEventListener('click', startBatch);
        $('#bg-batch-zip-btn').addEventListener('click', downloadBatchZip);
        $('#bg-batch-reset-btn').addEventListener('click', resetBatch);
    }

    function initMarkerCanvas() {
        if (!markerCanvas) return;

        function getCanvasCoords(e) {
            const rect = markerCanvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const scaleX = markerCanvas.width / (rect.width || 1);
            const scaleY = markerCanvas.height / (rect.height || 1);
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        }

        function startStroke(e) {
            if (!bgState.file || bgState.processing) return;
            isDrawing = true;
            const pos = getCanvasCoords(e);
            lastX = pos.x;
            lastY = pos.y;
            drawStroke(pos.x, pos.y);
            if (e.cancelable) e.preventDefault();
        }

        function moveStroke(e) {
            if (!isDrawing) return;
            const pos = getCanvasCoords(e);
            drawStroke(pos.x, pos.y);
            lastX = pos.x;
            lastY = pos.y;
            if (e.cancelable) e.preventDefault();
        }

        function stopStroke() {
            isDrawing = false;
        }

        function drawStroke(x, y) {
            bgState.hasStrokes = true;
            const size = bgState.brushSize;

            if (bgState.markerMode === 'keep') {
                // Visual canvas (Green)
                markerCtx.globalCompositeOperation = 'source-over';
                markerCtx.strokeStyle = 'rgba(0, 230, 118, 0.65)';
                markerCtx.lineWidth = size;
                markerCtx.lineCap = 'round';
                markerCtx.lineJoin = 'round';
                markerCtx.beginPath();
                markerCtx.moveTo(lastX, lastY);
                markerCtx.lineTo(x, y);
                markerCtx.stroke();

                // Keep mask (White)
                keepCtx.globalCompositeOperation = 'source-over';
                keepCtx.strokeStyle = '#ffffff';
                keepCtx.lineWidth = size;
                keepCtx.lineCap = 'round';
                keepCtx.lineJoin = 'round';
                keepCtx.beginPath();
                keepCtx.moveTo(lastX, lastY);
                keepCtx.lineTo(x, y);
                keepCtx.stroke();

                // Erase from remove mask
                removeCtx.globalCompositeOperation = 'destination-out';
                removeCtx.lineWidth = size;
                removeCtx.lineCap = 'round';
                removeCtx.lineJoin = 'round';
                removeCtx.beginPath();
                removeCtx.moveTo(lastX, lastY);
                removeCtx.lineTo(x, y);
                removeCtx.stroke();
            } else if (bgState.markerMode === 'remove') {
                // Visual canvas (Red)
                markerCtx.globalCompositeOperation = 'source-over';
                markerCtx.strokeStyle = 'rgba(255, 23, 68, 0.65)';
                markerCtx.lineWidth = size;
                markerCtx.lineCap = 'round';
                markerCtx.lineJoin = 'round';
                markerCtx.beginPath();
                markerCtx.moveTo(lastX, lastY);
                markerCtx.lineTo(x, y);
                markerCtx.stroke();

                // Remove mask (White)
                removeCtx.globalCompositeOperation = 'source-over';
                removeCtx.strokeStyle = '#ffffff';
                removeCtx.lineWidth = size;
                removeCtx.lineCap = 'round';
                removeCtx.lineJoin = 'round';
                removeCtx.beginPath();
                removeCtx.moveTo(lastX, lastY);
                removeCtx.lineTo(x, y);
                removeCtx.stroke();

                // Erase from keep mask
                keepCtx.globalCompositeOperation = 'destination-out';
                keepCtx.lineWidth = size;
                keepCtx.lineCap = 'round';
                keepCtx.lineJoin = 'round';
                keepCtx.beginPath();
                keepCtx.moveTo(lastX, lastY);
                keepCtx.lineTo(x, y);
                keepCtx.stroke();
            } else if (bgState.markerMode === 'erase') {
                [markerCtx, keepCtx, removeCtx].forEach((ctx) => {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.lineWidth = size;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    ctx.moveTo(lastX, lastY);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                });
            }
        }

        markerCanvas.addEventListener('mousedown', startStroke);
        window.addEventListener('mousemove', moveStroke);
        window.addEventListener('mouseup', stopStroke);

        markerCanvas.addEventListener('touchstart', startStroke, { passive: false });
        window.addEventListener('touchmove', moveStroke, { passive: false });
        window.addEventListener('touchend', stopStroke);
    }

    function clearMarkers() {
        if (markerCanvas && markerCtx) {
            markerCtx.clearRect(0, 0, markerCanvas.width, markerCanvas.height);
        }
        if (keepCtx) keepCtx.clearRect(0, 0, keepCanvas.width, keepCanvas.height);
        if (removeCtx) removeCtx.clearRect(0, 0, removeCanvas.width, removeCanvas.height);
        bgState.hasStrokes = false;
    }

    // Transparent / White / Custom (color picker) selector
    function bindChoiceButtons(groupSel, btnSel, pickerSel, onChange) {
        const picker = $(pickerSel);
        const buttons = document.querySelectorAll(groupSel + ' ' + btnSel);
        buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
                buttons.forEach((b) => b.classList.remove('selected'));
                btn.classList.add('selected');
                const choice = btn.dataset.bgchoice || btn.dataset.bgbatchchoice;
                if (choice === 'custom') {
                    picker.classList.remove('hidden');
                    onChange(picker.value);
                    picker.click();
                } else {
                    picker.classList.add('hidden');
                    onChange(choice);
                }
            });
        });
        picker.addEventListener('input', () => onChange(picker.value));
    }

    // --- Model download ---

    async function startModelDownload() {
        try {
            await fetch(`/api/bg/model?engine=${bgState.engine}`, { method: 'POST' });
            resumeModelUI();
        } catch {
            showToast('Could not start the model download — are you online?');
        }
    }

    function resumeModelUI() {
        const btn = $('#bg-model-btn');
        const track = $('#bg-model-track');
        const fill = $('#bg-model-fill');
        const status = $('#bg-model-status');
        btn.disabled = true;
        btn.textContent = 'Downloading...';
        track.classList.remove('hidden');

        const iv = setInterval(async () => {
            try {
                const s = await (await fetch(`/api/bg/model?engine=${bgState.engine}`)).json();
                if (s.available) {
                    clearInterval(iv);
                    status.textContent = '';
                    showToast('Model installed — background removal is ready.');
                    showPanel(true);
                    return;
                }
                if (s.status === 'error') {
                    clearInterval(iv);
                    btn.disabled = false;
                    btn.textContent = 'Retry Download';
                    status.textContent = 'Download failed: ' + (s.error || 'unknown error');
                    return;
                }
                fill.style.width = (s.progress || 0) + '%';
                status.textContent = `Downloading model... ${s.progress || 0}%`;
            } catch { /* transient — keep polling */ }
        }, 1000);
    }

    // --- File intake ---

    function isValidImage(file) {
        return (file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|webp|bmp|tiff?)$/i))
            && file.size <= 50 * 1024 * 1024;
    }

    function handleFiles(fileList) {
        const files = Array.from(fileList).filter(isValidImage);
        if (!files.length) {
            showToast('Please select image files under 50MB.');
            return;
        }
        if (files.length === 1) enterSingle(files[0]);
        else enterBatch(files);
    }

    // --- Single image ---

    function enterSingle(file) {
        bgState.file = file;
        bgState.taskId = null;
        if (bgState.originalUrl) URL.revokeObjectURL(bgState.originalUrl);
        bgState.originalUrl = URL.createObjectURL(file);
        originalImg.src = bgState.originalUrl;
        originalImg.onload = () => {
            $('#bg-original-res').textContent = `${originalImg.naturalWidth}x${originalImg.naturalHeight}`;
            if (markerCanvas) {
                markerCanvas.width = originalImg.naturalWidth;
                markerCanvas.height = originalImg.naturalHeight;
            }
            keepCanvas.width = originalImg.naturalWidth;
            keepCanvas.height = originalImg.naturalHeight;
            removeCanvas.width = originalImg.naturalWidth;
            removeCanvas.height = originalImg.naturalHeight;
            clearMarkers();
        };

        uploadSection.classList.add('hidden');
        batchSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        newRow.classList.remove('hidden');
        downloadSection.classList.add('hidden');
        resultImg.classList.add('hidden');
        resultImg.src = '';
        outputPlaceholder.classList.remove('hidden');
        startBtn.disabled = false;
    }

    async function startRemoval() {
        if (bgState.processing || !bgState.file) return;
        bgState.processing = true;
        bgState.cancelRequested = false;
        startBtn.disabled = true;
        progressSection.classList.remove('hidden');
        downloadSection.classList.add('hidden');
        newRow.classList.add('hidden');

        try {
            updateProgress(5, 'Uploading image...');
            const keepMask = bgState.hasStrokes ? keepCanvas.toDataURL('image/png') : null;
            const removeMask = bgState.hasStrokes ? removeCanvas.toDataURL('image/png') : null;

            const taskId = await uploadAndRemove(bgState.file, bgState.background, bgState.engine, keepMask, removeMask,
                (pct, msg) => updateProgress(pct, msg),
                () => bgState.cancelRequested,
                (id) => { bgState.taskId = id; });

            const url = `/api/image/download/${taskId}?t=${Date.now()}`;
            resultImg.src = url;
            resultImg.classList.remove('hidden');
            outputPlaceholder.classList.add('hidden');
            resultImg.onload = () => {
                $('#bg-result-res').textContent = `${resultImg.naturalWidth}x${resultImg.naturalHeight}`;
            };
            $('#bg-download-details').textContent = bgState.background === 'transparent'
                ? `Transparent PNG (${bgState.engine.toUpperCase()}), ready for design work`
                : `PNG on ${bgState.background} background (${bgState.engine.toUpperCase()})`;

            bgState.processing = false;
            progressSection.classList.add('hidden');
            downloadSection.classList.remove('hidden');
            newRow.classList.remove('hidden');
            startBtn.disabled = false;
        } catch (err) {
            bgState.processing = false;
            progressSection.classList.add('hidden');
            newRow.classList.remove('hidden');
            startBtn.disabled = false;
            if (bgState.cancelRequested || (err && err.message === 'cancelled')) {
                showToast('Cancelled — adjust and try again.');
            } else {
                showToast('Background removal failed: ' + err.message);
            }
        }
    }

    // Upload + start + poll. Shared by single and batch paths.
    async function uploadAndRemove(file, background, engine, keepMask, removeMask, onProgress, isCancelled, onTaskId) {
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch('/api/image/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        if (onTaskId) onTaskId(data.task_id);
        if (isCancelled && isCancelled()) throw new Error('cancelled');

        const rmRes = await fetch('/api/bg/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_id: data.task_id,
                background,
                engine: engine || 'rembg',
                keep_mask: keepMask,
                remove_mask: removeMask
            }),
        });
        if (!rmRes.ok) {
            const err = await rmRes.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to start');
        }

        await new Promise((resolve, reject) => {
            const iv = setInterval(async () => {
                if (isCancelled && isCancelled()) {
                    clearInterval(iv);
                    reject(new Error('cancelled'));
                    return;
                }
                try {
                    const s = await (await fetch(`/api/image/status/${data.task_id}`)).json();
                    if (onProgress) onProgress(s.progress || 50, s.message || 'Processing...');
                    if (s.status === 'completed') { clearInterval(iv); resolve(); }
                    else if (s.status === 'cancelled') { clearInterval(iv); reject(new Error('cancelled')); }
                    else if (s.status === 'error') { clearInterval(iv); reject(new Error(s.message || 'Server error')); }
                } catch {
                    clearInterval(iv);
                    reject(new Error('Connection lost'));
                }
            }, 500);
        });
        return data.task_id;
    }

    function updateProgress(pct, msg) {
        progressFill.style.width = pct + '%';
        progressPercent.textContent = pct + '%';
        progressMessage.textContent = msg;
    }

    function cancelJob() {
        if (!bgState.processing) return;
        bgState.cancelRequested = true;
        if (bgState.taskId) {
            fetch(`/api/image/cancel/${bgState.taskId}`, { method: 'POST' }).catch(() => {});
        }
    }

    function downloadResult() {
        if (!bgState.taskId) return;
        const stem = bgState.file ? bgState.file.name.replace(/\.[^.]+$/, '') : 'image';
        saveServerResult(bgState.taskId, `${stem}_nobg.png`);
    }

    function resetSingle() {
        bgState.taskId = null;
        bgState.file = null;
        bgState.processing = false;
        clearMarkers();
        appSection.classList.add('hidden');
        progressSection.classList.add('hidden');
        downloadSection.classList.add('hidden');
        newRow.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        originalImg.src = '';
        resultImg.src = '';
        resultImg.classList.add('hidden');
        outputPlaceholder.classList.remove('hidden');
        fileInput.value = '';
    }

    // --- Batch ---

    function enterBatch(files) {
        bgBatch.items.forEach((i) => { if (i.url) URL.revokeObjectURL(i.url); });
        bgBatch.items = files.map((file) => ({
            file, url: URL.createObjectURL(file), status: 'pending', taskId: null, el: null,
        }));
        bgBatch.running = false;
        bgBatch.cancelRequested = false;

        uploadSection.classList.add('hidden');
        appSection.classList.add('hidden');
        batchSection.classList.remove('hidden');

        $('#bg-batch-title').textContent = `Batch: ${bgBatch.items.length} images`;
        $('#bg-batch-sub').textContent = 'Pick a background, then start';
        $('#bg-batch-progress-label').textContent = '—';
        $('#bg-batch-zip-btn').classList.add('hidden');
        $('#bg-batch-start-btn').disabled = false;
        $('#bg-batch-reset-btn').textContent = 'Cancel';

        const grid = $('#bg-batch-grid');
        grid.innerHTML = '';
        bgBatch.items.forEach((item) => {
            const div = document.createElement('div');
            div.className = 'batch-item';
            const img = document.createElement('img');
            img.src = item.url;
            const info = document.createElement('div');
            info.className = 'batch-item-info';
            const name = document.createElement('span');
            name.className = 'batch-item-name';
            name.textContent = item.file.name;
            const status = document.createElement('span');
            status.className = 'batch-status pending';
            status.textContent = 'queued';
            info.append(name, status);
            div.append(img, info);
            grid.appendChild(div);
            item.el = { status, info, img };
        });
    }

    function setItemStatus(item, cls, text) {
        item.el.status.className = 'batch-status ' + cls;
        item.el.status.textContent = text;
    }

    async function startBatch() {
        if (bgBatch.running || !bgBatch.items.length) return;
        bgBatch.running = true;
        bgBatch.cancelRequested = false;
        $('#bg-batch-start-btn').disabled = true;
        $('#bg-batch-zip-btn').classList.add('hidden');
        $('#bg-batch-reset-btn').textContent = 'Cancel';
        $('#bg-batch-sub').textContent = 'Removing backgrounds on the server';

        let done = 0;
        for (const item of bgBatch.items) {
            if (bgBatch.cancelRequested) break;
            $('#bg-batch-progress-label').textContent = `${done + 1} / ${bgBatch.items.length}`;
            setItemStatus(item, 'working', '0%');
            try {
                const taskId = await uploadAndRemove(item.file, bgBatch.background,
                    (pct) => setItemStatus(item, 'working', pct + '%'),
                    () => bgBatch.cancelRequested,
                    (id) => { bgBatch.currentTaskId = id; });
                item.taskId = taskId;
                item.status = 'completed';
                bgBatch.currentTaskId = null;
                setItemStatus(item, 'done', 'done');
                addItemSaveLink(item);
                item.el.img.src = `/api/image/download/${taskId}?t=${Date.now()}`;
            } catch (e) {
                if (bgBatch.cancelRequested || (e && e.message === 'cancelled')) {
                    setItemStatus(item, 'failed', 'cancelled');
                    break;
                }
                console.error('bg batch item failed', e);
                setItemStatus(item, 'failed', 'failed');
            }
            done++;
        }

        const finished = bgBatch.items.filter((i) => i.status === 'completed');
        if (bgBatch.cancelRequested) {
            $('#bg-batch-progress-label').textContent = 'Cancelled';
            $('#bg-batch-sub').textContent = `Cancelled — ${finished.length} finished before stopping`;
        } else {
            $('#bg-batch-progress-label').textContent = 'Complete';
            $('#bg-batch-sub').textContent = `${finished.length} of ${bgBatch.items.length} succeeded`;
        }
        if (finished.length) $('#bg-batch-zip-btn').classList.remove('hidden');

        bgBatch.running = false;
        bgBatch.currentTaskId = null;
        bgBatch.cancelRequested = false;
        $('#bg-batch-start-btn').disabled = false;
        $('#bg-batch-reset-btn').textContent = 'Close';
    }

    function addItemSaveLink(item) {
        const a = document.createElement('a');
        a.textContent = 'save';
        a.href = '#';
        const name = item.file.name.replace(/\.[^.]+$/, '') + '_nobg.png';
        a.addEventListener('click', (e) => {
            e.preventDefault();
            saveServerResult(item.taskId, name);
        });
        item.el.info.appendChild(a);
    }

    async function downloadBatchZip() {
        const ids = bgBatch.items.filter((i) => i.status === 'completed').map((i) => i.taskId);
        if (!ids.length) return;
        const btn = $('#bg-batch-zip-btn');
        btn.disabled = true;
        btn.textContent = 'Zipping...';
        try {
            const res = await fetch('/api/zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_ids: ids }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Zip failed');
            await saveServerResult(data.zip_id, 'nobg_images.zip', `/api/zip/${data.zip_id}`);
        } catch (e) {
            showToast('Zip failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Download All (.zip)';
        }
    }

    function resetBatch() {
        if (bgBatch.running) {
            bgBatch.cancelRequested = true;
            if (bgBatch.currentTaskId) {
                fetch(`/api/image/cancel/${bgBatch.currentTaskId}`, { method: 'POST' }).catch(() => {});
            }
            $('#bg-batch-sub').textContent = 'Cancelling...';
            return;
        }
        bgBatch.items.forEach((i) => { if (i.url) URL.revokeObjectURL(i.url); });
        bgBatch.items = [];
        $('#bg-batch-grid').innerHTML = '';
        batchSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        fileInput.value = '';
    }

    // --- Saving (same logic as everywhere else: native dialog on desktop,
    // "Save As" dialog in Chrome/Edge, normal download elsewhere) ---

    function desktopDialog() {
        return (window.__TAURI__ && window.__TAURI__.dialog) ? window.__TAURI__.dialog : null;
    }

    async function browserSaveAs(suggestedName, getBlob) {
        if (!window.showSaveFilePicker) return false;
        let handle;
        try {
            handle = await window.showSaveFilePicker({ suggestedName });
        } catch (e) {
            if (e && e.name === 'AbortError') return true; // user closed the dialog
            return false; // API blocked here — use the fallback
        }
        try {
            const blob = await getBlob();
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            showToast('Saved ' + suggestedName);
        } catch (e) {
            showToast('Save failed: ' + e.message);
        }
        return true;
    }

    async function saveServerResult(taskId, suggestedName, browserUrl) {
        const dlg = desktopDialog();
        if (dlg) {
            try {
                const path = await dlg.save({ defaultPath: suggestedName });
                if (!path) return;
                const res = await fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-NGU-Token': NGU_TOKEN },
                    body: JSON.stringify({ task_id: taskId, path }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'save failed');
                showToast('Saved to ' + data.path);
            } catch (e) {
                showToast('Save failed: ' + e.message);
            }
            return;
        }
        const url = browserUrl || `/api/image/download/${taskId}`;
        if (await browserSaveAs(suggestedName, async () => {
            const r = await fetch(url);
            if (!r.ok) throw new Error('download failed');
            return r.blob();
        })) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function showToast(msg) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
})();
