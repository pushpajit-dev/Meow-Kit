// Settings, GPU Acceleration, and Model Manager for Meow Kit
(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    let catalogPollTimer = null;
    let gpuPollTimer = null;

    // --- Initialization ---
    document.addEventListener('DOMContentLoaded', () => {
        initSettingsModal();
        initStorageSettings();
        initGpuSettings();
        initModelManager();
    });

    // --- Modal Controls ---
    function initSettingsModal() {
        const btn = $('#settings-btn');
        const overlay = $('#settings-overlay');
        const closeBtn = $('#settings-close');

        if (!btn || !overlay) return;

        btn.addEventListener('click', () => {
            overlay.classList.remove('hidden');
            loadAllSettings();
            loadGpuInfo();
            loadModelCatalog();
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                overlay.classList.add('hidden');
                stopPolling();
            });
        }

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
                stopPolling();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
                overlay.classList.add('hidden');
                stopPolling();
            }
        });

        // Tab Switching
        $$('.settings-tab-btn').forEach((tab) => {
            tab.addEventListener('click', () => {
                $$('.settings-tab-btn').forEach((t) => t.classList.remove('active'));
                $$('.settings-tab-pane').forEach((p) => p.classList.remove('active'));

                tab.classList.add('active');
                const target = $('#' + tab.dataset.target);
                if (target) target.classList.add('active');
            });
        });
    }

    function stopPolling() {
        if (catalogPollTimer) {
            clearInterval(catalogPollTimer);
            catalogPollTimer = null;
        }
        if (gpuPollTimer) {
            clearInterval(gpuPollTimer);
            gpuPollTimer = null;
        }
    }

    // --- Storage & Paths ---
    function initStorageSettings() {
        const browseMediaBtn = $('#browse-media-btn');
        const browseModelBtn = $('#browse-model-btn');
        const saveStorageBtn = $('#save-storage-btn');
        const mediaInput = $('#media-save-dir');
        const modelInput = $('#model-save-dir');
        const storageStatus = $('#storage-status');

        if (browseMediaBtn && mediaInput) {
            browseMediaBtn.addEventListener('click', async () => {
                browseMediaBtn.disabled = true;
                browseMediaBtn.textContent = 'Selecting...';
                try {
                    const res = await fetch('/api/settings/browse', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'media' })
                    });
                    const data = await res.json();
                    if (data.status === 'ok' && data.path) {
                        mediaInput.value = data.path;
                    }
                } catch (e) {
                    console.error('Browse error:', e);
                } finally {
                    browseMediaBtn.disabled = false;
                    browseMediaBtn.textContent = 'Browse...';
                }
            });
        }

        if (browseModelBtn && modelInput) {
            browseModelBtn.addEventListener('click', async () => {
                browseModelBtn.disabled = true;
                browseModelBtn.textContent = 'Selecting...';
                try {
                    const res = await fetch('/api/settings/browse', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'model' })
                    });
                    const data = await res.json();
                    if (data.status === 'ok' && data.path) {
                        modelInput.value = data.path;
                    }
                } catch (e) {
                    console.error('Browse error:', e);
                } finally {
                    browseModelBtn.disabled = false;
                    browseModelBtn.textContent = 'Browse...';
                }
            });
        }

        if (saveStorageBtn) {
            saveStorageBtn.addEventListener('click', async () => {
                saveStorageBtn.disabled = true;
                saveStorageBtn.textContent = 'Saving...';
                if (storageStatus) storageStatus.textContent = '';
                try {
                    const res = await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            media_save_dir: mediaInput ? mediaInput.value.trim() : null,
                            model_save_dir: modelInput ? modelInput.value.trim() : null
                        })
                    });
                    const data = await res.json();
                    if (data.status === 'ok') {
                        if (storageStatus) {
                            storageStatus.textContent = 'Paths saved successfully!';
                            storageStatus.className = 'status-msg success';
                        }
                        loadModelCatalog();
                    }
                } catch (e) {
                    if (storageStatus) {
                        storageStatus.textContent = 'Failed to save settings: ' + e.message;
                        storageStatus.className = 'status-msg error';
                    }
                } finally {
                    saveStorageBtn.disabled = false;
                    saveStorageBtn.textContent = 'Save Storage Settings';
                }
            });
        }
    }

    async function loadAllSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();

            const mediaInput = $('#media-save-dir');
            const modelInput = $('#model-save-dir');
            const gpuCheck = $('#gpu-enabled-check');
            const hybridCheck = $('#hybrid-enabled-check');

            if (mediaInput && data.media_save_dir) mediaInput.value = data.media_save_dir;
            if (modelInput && data.model_save_dir) modelInput.value = data.model_save_dir;
            if (gpuCheck) gpuCheck.checked = !!data.gpu_enabled;
            if (hybridCheck) hybridCheck.checked = !!data.hybrid_enabled;
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }

    // --- Hardware & GPU Settings ---
    function initGpuSettings() {
        const gpuCheck = $('#gpu-enabled-check');
        const hybridCheck = $('#hybrid-enabled-check');
        const setupBtn = $('#setup-gpu-btn');

        if (gpuCheck) {
            gpuCheck.addEventListener('change', async () => {
                await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gpu_enabled: gpuCheck.checked })
                });
                loadGpuInfo();
            });
        }

        if (hybridCheck) {
            hybridCheck.addEventListener('change', async () => {
                await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hybrid_enabled: hybridCheck.checked })
                });
                loadGpuInfo();
            });
        }

        if (setupBtn) {
            setupBtn.addEventListener('click', async () => {
                setupBtn.disabled = true;
                setupBtn.textContent = 'Starting Setup...';
                const statusBox = $('#gpu-setup-status');
                if (statusBox) {
                    statusBox.classList.remove('hidden');
                    statusBox.textContent = 'Initializing GPU acceleration setup...';
                }
                try {
                    await fetch('/api/gpu/setup', { method: 'POST' });
                    startGpuStatusPolling();
                } catch (e) {
                    if (statusBox) statusBox.textContent = 'Error starting setup: ' + e.message;
                    setupBtn.disabled = false;
                    setupBtn.textContent = 'Setup / Fix GPU Acceleration';
                }
            });
        }
    }

    async function loadGpuInfo() {
        const nameEl = $('#gpu-device-name');
        const providerEl = $('#gpu-active-provider');
        const noteEl = $('#gpu-status-note');

        try {
            const res = await fetch('/api/gpu/info');
            const data = await res.json();
            const gpus = data.gpus || data.detected_gpus || [];

            if (nameEl) {
                if (gpus.length > 0) {
                    nameEl.textContent = gpus.map((g) => typeof g === 'string' ? g : (g.name || JSON.stringify(g))).join(', ');
                } else {
                    nameEl.textContent = 'No dedicated GPU detected (CPU mode)';
                }
            }

            if (providerEl) {
                const providers = data.providers || data.available_providers || [];
                const active = data.active_providers || [];
                if (active.includes('DmlExecutionProvider') || providers.includes('DmlExecutionProvider')) {
                    providerEl.textContent = 'DirectML (Hardware Accelerated)';
                    providerEl.className = 'provider-tag dml';
                } else if (active.includes('CUDAExecutionProvider') || providers.includes('CUDAExecutionProvider')) {
                    providerEl.textContent = 'CUDA (NVIDIA Hardware Accelerated)';
                    providerEl.className = 'provider-tag cuda';
                } else if (gpus.length > 0) {
                    providerEl.textContent = 'GPU Detected (CPU mode - click Setup to enable DirectML)';
                    providerEl.className = 'provider-tag cpu';
                } else {
                    providerEl.textContent = 'CPU (Standard Execution)';
                    providerEl.className = 'provider-tag cpu';
                }
            }

            if (noteEl) {
                noteEl.textContent = data.status_summary || (gpus.length > 0 ? `Detected: ${gpus.join(', ')}` : '');
            }
        } catch (e) {
            console.error('Failed to load GPU info:', e);
        }
    }

    function startGpuStatusPolling() {
        const setupBtn = $('#setup-gpu-btn');
        const statusBox = $('#gpu-setup-status');

        if (gpuPollTimer) clearInterval(gpuPollTimer);

        gpuPollTimer = setInterval(async () => {
            try {
                const res = await fetch('/api/gpu/status');
                const data = await res.json();

                if (statusBox) {
                    statusBox.textContent = `${data.message || 'Working...'} (${data.progress || 0}%)`;
                }

                if (!data.running) {
                    clearInterval(gpuPollTimer);
                    gpuPollTimer = null;
                    if (setupBtn) {
                        setupBtn.disabled = false;
                        setupBtn.textContent = 'Setup / Fix GPU Acceleration';
                    }
                    if (statusBox) {
                        if (data.success) {
                            statusBox.textContent = '✓ Acceleration ready! ' + (data.message || '');
                            statusBox.className = 'gpu-setup-box success';
                        } else {
                            statusBox.textContent = 'Setup completed: ' + (data.message || data.error || '');
                            statusBox.className = 'gpu-setup-box';
                        }
                    }
                    loadGpuInfo();
                }
            } catch (e) {
                console.error('Error polling GPU status:', e);
            }
        }, 1500);
    }

    // --- Open-Source Model Manager ---
    let activeFilter = 'all';

    function initModelManager() {
        const searchInput = $('#model-search-input');
        const customUrlInput = $('#custom-model-url');
        const customNameInput = $('#custom-model-filename');
        const customCatSelect = $('#custom-model-category');
        const customDownloadBtn = $('#custom-model-download-btn');
        const customStatus = $('#custom-model-status');

        function filterModels() {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            $$('.model-catalog-card').forEach((card) => {
                const text = card.textContent.toLowerCase();
                const cardCat = card.dataset.category || '';
                const isInstalled = card.dataset.installed === 'true';
                const matchesQuery = !query || text.includes(query);
                let matchesCat = false;
                if (activeFilter === 'all') {
                    matchesCat = true;
                } else if (activeFilter === 'downloaded') {
                    matchesCat = isInstalled;
                } else {
                    matchesCat = cardCat.includes(activeFilter) || activeFilter.includes(cardCat);
                }
                card.style.display = (matchesQuery && matchesCat) ? 'flex' : 'none';
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', filterModels);
        }

        $$('.model-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                $$('.model-chip').forEach((c) => c.classList.remove('active'));
                chip.classList.add('active');
                activeFilter = chip.dataset.filter || 'all';
                filterModels();
            });
        });

        if (customDownloadBtn) {
            customDownloadBtn.addEventListener('click', async () => {
                const url = customUrlInput ? customUrlInput.value.trim() : '';
                const filename = customNameInput ? customNameInput.value.trim() : '';
                const category = customCatSelect ? customCatSelect.value : 'custom';

                if (!url || !filename) {
                    if (customStatus) {
                        customStatus.textContent = 'Please enter both a valid URL and filename (.onnx)';
                        customStatus.className = 'status-msg error';
                    }
                    return;
                }

                customDownloadBtn.disabled = true;
                customDownloadBtn.textContent = 'Starting...';
                if (customStatus) customStatus.textContent = '';

                try {
                    const res = await fetch('/api/models/download', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, filename, category })
                    });
                    const data = await res.json();
                    if (data.status === 'downloading') {
                        if (customStatus) {
                            customStatus.textContent = 'Download started!';
                            customStatus.className = 'status-msg success';
                        }
                        if (customUrlInput) customUrlInput.value = '';
                        if (customNameInput) customNameInput.value = '';
                        loadModelCatalog();
                        startCatalogPolling();
                    } else {
                        if (customStatus) {
                            customStatus.textContent = data.error || 'Failed to start download';
                            customStatus.className = 'status-msg error';
                        }
                    }
                } catch (e) {
                    if (customStatus) {
                        customStatus.textContent = 'Error: ' + e.message;
                        customStatus.className = 'status-msg error';
                    }
                } finally {
                    customDownloadBtn.disabled = false;
                    customDownloadBtn.textContent = 'Download Model';
                }
            });
        }
    }

    async function loadModelCatalog() {
        const container = $('#model-catalog-list');
        if (!container) return;

        try {
            const res = await fetch('/api/models/catalog');
            const data = await res.json();

            const catalog = data.catalog || [];
            const activeModels = data.active_models || {};
            let hasActiveDownloads = false;

            const existingCards = {};
            container.querySelectorAll('.model-catalog-card').forEach((card) => {
                existingCards[card.dataset.key] = card;
            });

            catalog.forEach((item) => {
                const isDownloading = item.status === 'downloading';
                if (isDownloading) hasActiveDownloads = true;

                const sizeMb = item.size ? (item.size / (1024 * 1024)).toFixed(1) + ' MB' : '';
                const isInstalled = !!item.available;
                const isActive = activeModels[item.category] === item.filename || activeModels[item.category] === item.key;
                const card = existingCards[item.key];

                if (card) {
                    // Update in-place to avoid flickering
                    card.dataset.installed = isInstalled ? 'true' : 'false';
                    card.dataset.category = item.category || 'general';

                    const statusEl = card.querySelector('.model-status-text');
                    if (statusEl) {
                        statusEl.className = `model-status-text ${isInstalled ? 'installed' : isDownloading ? 'downloading' : ''}`;
                        statusEl.textContent = isInstalled ? '✓ Installed' : isDownloading ? `Downloading (${item.progress}%)` : 'Not Installed';
                    }

                    let progBar = card.querySelector('.model-progress-bar');
                    if (isDownloading) {
                        if (!progBar) {
                            const infoDiv = card.querySelector('.model-info');
                            if (infoDiv) {
                                progBar = document.createElement('div');
                                progBar.className = 'model-progress-bar';
                                progBar.innerHTML = `<div class="model-progress-fill" style="width: ${item.progress}%"></div>`;
                                infoDiv.appendChild(progBar);
                            }
                        } else {
                            const fill = progBar.querySelector('.model-progress-fill');
                            if (fill) fill.style.width = `${item.progress}%`;
                        }
                    } else if (progBar) {
                        progBar.remove();
                    }

                    // Update actions if state changed
                    const actionsDiv = card.querySelector('.model-actions');
                    if (actionsDiv) {
                        const curBtn = actionsDiv.querySelector('button');
                        const needsRebuild = (isDownloading && !actionsDiv.querySelector('.stop-btn')) ||
                                             (isInstalled && !actionsDiv.querySelector('.delete-btn')) ||
                                             (!isDownloading && !isInstalled && !actionsDiv.querySelector('.download-btn'));
                        if (needsRebuild) {
                            actionsDiv.innerHTML = isDownloading
                                ? `<button class="model-btn stop-btn" data-key="${item.key}">Stop</button>`
                                : isInstalled
                                ? `
                                <button class="model-btn select-btn ${isActive ? 'active' : ''}" data-key="${item.key}" data-cat="${item.category}" data-file="${item.filename}">
                                    ${isActive ? 'Selected' : 'Use for ' + item.category.toUpperCase()}
                                </button>
                                <button class="model-btn delete-btn" data-key="${item.key}">Delete</button>
                            `
                                : `<button class="model-btn download-btn" data-key="${item.key}">Download</button>`;
                            bindSingleCardActions(actionsDiv);
                        }
                    }
                } else {
                    // Create new card
                    const newCard = document.createElement('div');
                    newCard.className = 'model-catalog-card';
                    newCard.dataset.key = item.key;
                    newCard.dataset.category = item.category || 'general';
                    newCard.dataset.installed = isInstalled ? 'true' : 'false';

                    newCard.innerHTML = `
                        <div class="model-info">
                            <div class="model-title-row">
                                <span class="model-title">${escapeHtml(item.label || item.key)}</span>
                                <span class="model-cat-tag ${escapeHtml(item.category)}">${escapeHtml(item.category.toUpperCase())}</span>
                                ${isActive ? '<span class="model-active-badge">Active</span>' : ''}
                            </div>
                            ${item.description ? `<div class="model-desc">${escapeHtml(item.description)}</div>` : ''}
                            <div class="model-meta">
                                <span>File: ${escapeHtml(item.filename || item.key)}</span>
                                ${sizeMb ? `<span>Size: ${sizeMb}</span>` : ''}
                                <span class="model-status-text ${isInstalled ? 'installed' : isDownloading ? 'downloading' : ''}">
                                    ${isInstalled ? '✓ Installed' : isDownloading ? `Downloading (${item.progress}%)` : 'Not Installed'}
                                </span>
                            </div>
                            ${
                                isDownloading
                                    ? `
                                <div class="model-progress-bar">
                                    <div class="model-progress-fill" style="width: ${item.progress}%"></div>
                                </div>
                            `
                                    : ''
                            }
                        </div>
                        <div class="model-actions">
                            ${
                                isDownloading
                                    ? `<button class="model-btn stop-btn" data-key="${item.key}">Stop</button>`
                                    : isInstalled
                                    ? `
                                    <button class="model-btn select-btn ${isActive ? 'active' : ''}" data-key="${item.key}" data-cat="${item.category}" data-file="${item.filename}">
                                        ${isActive ? 'Selected' : 'Use for ' + item.category.toUpperCase()}
                                    </button>
                                    <button class="model-btn delete-btn" data-key="${item.key}">Delete</button>
                                `
                                    : `<button class="model-btn download-btn" data-key="${item.key}">Download</button>`
                            }
                        </div>
                    `;

                    container.appendChild(newCard);
                    const actionsDiv = newCard.querySelector('.model-actions');
                    if (actionsDiv) bindSingleCardActions(actionsDiv);
                }
            });

            // Re-apply filter and search query
            const searchInput = $('#model-search-input');
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            container.querySelectorAll('.model-catalog-card').forEach((card) => {
                const text = card.textContent.toLowerCase();
                const cardCat = card.dataset.category || '';
                const isInstalled = card.dataset.installed === 'true';
                const matchesQuery = !query || text.includes(query);
                let matchesCat = false;
                if (activeFilter === 'all') {
                    matchesCat = true;
                } else if (activeFilter === 'downloaded') {
                    matchesCat = isInstalled;
                } else {
                    matchesCat = cardCat.includes(activeFilter) || activeFilter.includes(cardCat);
                }
                card.style.display = (matchesQuery && matchesCat) ? 'flex' : 'none';
            });

            if (hasActiveDownloads) {
                startCatalogPolling();
            } else if (catalogPollTimer) {
                clearInterval(catalogPollTimer);
                catalogPollTimer = null;
            }
        } catch (e) {
            console.error('Failed to load model catalog:', e);
        }
    }

    function bindSingleCardActions(container) {
        container.querySelectorAll('.download-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const key = btn.dataset.key;
                btn.disabled = true;
                btn.textContent = 'Fetching...';
                const card = btn.closest('.model-catalog-card');
                if (card) {
                    const statusText = card.querySelector('.model-status-text');
                    if (statusText) {
                        statusText.textContent = 'Starting download...';
                        statusText.className = 'model-status-text downloading';
                    }
                    let progBar = card.querySelector('.model-progress-bar');
                    if (!progBar) {
                        const infoDiv = card.querySelector('.model-info');
                        if (infoDiv) {
                            progBar = document.createElement('div');
                            progBar.className = 'model-progress-bar';
                            progBar.innerHTML = `<div class="model-progress-fill" style="width: 5%"></div>`;
                            infoDiv.appendChild(progBar);
                        }
                    }
                }
                try {
                    await fetch('/api/models/download', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key })
                    });
                } catch (err) {
                    console.error('Download start error:', err);
                }
                startCatalogPolling();
                loadModelCatalog();
            });
        });

        container.querySelectorAll('.stop-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const key = btn.dataset.key;
                btn.disabled = true;
                btn.textContent = 'Stopping...';
                await fetch('/api/models/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key })
                });
                loadModelCatalog();
            });
        });

        container.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const key = btn.dataset.key;
                if (!confirm(`Are you sure you want to delete this model?`)) return;
                btn.disabled = true;
                btn.textContent = 'Deleting...';
                await fetch('/api/models/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key })
                });
                loadModelCatalog();
            });
        });

        container.querySelectorAll('.select-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const tool = btn.dataset.cat;
                const filename = btn.dataset.file || btn.dataset.key;
                btn.disabled = true;
                await fetch('/api/models/select', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tool, filename })
                });
                loadModelCatalog();
            });
        });
    }

    function startCatalogPolling() {
        if (catalogPollTimer) return;
        catalogPollTimer = setInterval(loadModelCatalog, 2000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
})();
