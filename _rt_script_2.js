
        /* Publish Modal Logic */
        let currentPubType = 'date_short';
        let pubCalMonth = (new Date()).getMonth();
        let pubCalYear = (new Date()).getFullYear();
        const pubMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
            'October', 'November', 'December'];

        function slugifyName(value) {
            const base = String(value || '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            return base || 'bouquet';
        }

        function withTimeout(promise, ms, message) {
            return Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error(message || 'Request timeout')), ms))
            ]);
        }

        async function fetchTakenPublishNames(candidates) {
            if (!supabaseClient || !Array.isArray(candidates) || candidates.length === 0) return new Set();
            try {
                const query = supabaseClient
                    .from('canvases')
                    .select('id')
                    .in('id', candidates);
                const { data, error } = await withTimeout(query, 5000, 'Name check timed out');
                if (error) return new Set();
                return new Set((Array.isArray(data) ? data : []).map((row) => row.id));
            } catch (err) {
                return new Set();
            }
        }

        async function resolveUniquePublishName(rawName) {
            const base = slugifyName(rawName);
            const firstPass = [base];
            for (let n = 10; n <= 100; n += 10) firstPass.push(`${base}${n}`);
            const firstTaken = await fetchTakenPublishNames(firstPass);
            for (const candidate of firstPass) {
                if (!firstTaken.has(candidate)) return candidate;
            }

            for (let start = 110; start <= 10000; start += 100) {
                const batch = [];
                for (let n = start; n < start + 100 && n <= 10000; n += 10) {
                    batch.push(`${base}${n}`);
                }
                const taken = await fetchTakenPublishNames(batch);
                for (const candidate of batch) {
                    if (!taken.has(candidate)) return candidate;
                }
            }
            throw new Error('Unable to generate available name.');
        }

        function setPubType(type) {
            currentPubType = type;
            document.querySelectorAll('#pubTypeTabs .pub-tab').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === type);
            });
            handlePubTypeChange();
        }

        function openPublishModal() {
            document.getElementById('publishModal').style.display = 'flex';
            const toggle = document.getElementById('pubPasswordToggle');
            if (toggle) toggle.checked = true;
            setPubType(currentPubType || 'date_short');
            updatePublishSecurityVisibility();
        }

        function closePublishModal() {
            document.getElementById('publishModal').style.display = 'none';
        }

        function updatePublishSecurityVisibility() {
            const toggle = document.getElementById('pubPasswordToggle');
            const block = document.getElementById('pubSecurityBlock');
            if (!toggle || !block) return;
            block.style.display = toggle.checked ? 'block' : 'none';
        }

        function renderPubDateCalendar() {
            const header = document.getElementById('pubCalHeader');
            const grid = document.getElementById('pubCalGrid');
            const answerInput = document.getElementById('pubAnswer');
            if (!header || !grid || !answerInput) return;

            header.textContent = `${pubMonthNames[pubCalMonth]} ${pubCalYear}`;
            grid.innerHTML = '';

            const firstDay = new Date(pubCalYear, pubCalMonth, 1).getDay();
            const daysInMonth = new Date(pubCalYear, pubCalMonth + 1, 0).getDate();
            const prevMonthDays = new Date(pubCalYear, pubCalMonth, 0).getDate();

            for (let i = 0; i < firstDay; i++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'pub-calendar-day other';
                btn.textContent = String(prevMonthDays - firstDay + i + 1);
                btn.disabled = true;
                grid.appendChild(btn);
            }

            const selected = String(answerInput.value || '').trim();
            for (let day = 1; day <= daysInMonth; day++) {
                const dd = String(day).padStart(2, '0');
                const mm = String(pubCalMonth + 1).padStart(2, '0');
                const val = `${dd}/${mm}`;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'pub-calendar-day';
                if (selected === val) btn.classList.add('selected');
                btn.textContent = String(day);
                btn.onclick = () => {
                    answerInput.value = val;
                    renderPubDateCalendar();
                };
                grid.appendChild(btn);
            }

            const totalCells = firstDay + daysInMonth;
            const tail = (7 - (totalCells % 7)) % 7;
            for (let i = 1; i <= tail; i++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'pub-calendar-day other';
                btn.textContent = String(i);
                btn.disabled = true;
                grid.appendChild(btn);
            }
        }

        function shiftPubMonth(delta) {
            pubCalMonth += delta;
            while (pubCalMonth < 0) {
                pubCalMonth += 12;
                pubCalYear -= 1;
            }
            while (pubCalMonth > 11) {
                pubCalMonth -= 12;
                pubCalYear += 1;
            }
            renderPubDateCalendar();
        }

        function handlePubTypeChange() {
            const type = currentPubType;
            const container = document.getElementById('pubAnswerContainer');
            if (!type || !container) return;

            if (type === 'date_short') {
                container.innerHTML = `
                    <div class="pub-answer-wrap">
                        <input type="text" id="pubAnswer" class="pub-input" placeholder="DD/MM" readonly>
                    </div>
                    <div class="pub-calendar-panel">
                        <div class="pub-calendar">
                            <div class="pub-calendar-header">
                                <h4 id="pubCalHeader"></h4>
                                <div class="pub-calendar-nav">
                                    <button type="button" onclick="shiftPubMonth(-1)">&#8249;</button>
                                    <button type="button" onclick="shiftPubMonth(1)">&#8250;</button>
                                </div>
                            </div>
                            <div class="pub-calendar-days">
                                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                            </div>
                            <div id="pubCalGrid" class="pub-calendar-grid"></div>
                        </div>
                    </div>
                `;
                renderPubDateCalendar();
            } else if (type === 'pin') {
                container.innerHTML = '<input type="number" id="pubAnswer" class="pub-input" placeholder="Enter PIN code (e.g. 1234)">';
            } else if (type === 'sentence') {
                container.innerHTML = '<textarea id="pubAnswer" class="pub-input" placeholder="Enter the exact phrase..." style="height: 80px; resize: none;"></textarea>';
            } else {
                container.innerHTML = '<input type="text" id="pubAnswer" class="pub-input" placeholder="Enter answer...">';
            }
        }

        async function publishCanvasWithName(publishName, securityConfig) {
            if (!supabaseClient) throw new Error('Publishing is unavailable right now.');

            const state = collectCanvasState();
            const { elements, footerText, bgColor } = state;
            const resolvedName = await resolveUniquePublishName(publishName);
            const dataToSave = {
                elements,
                footerText,
                bgColor,
                ...(securityConfig ? { security: securityConfig } : {})
            };

            const writeQuery = supabaseClient
                .from('canvases')
                .upsert({
                    id: resolvedName,
                    canvas_data: dataToSave,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
            const { error } = await withTimeout(writeQuery, 8000, 'Publish timed out');
            if (error) throw new Error(error.message || 'Publish failed.');
            return resolvedName;
        }

        async function confirmPublish() {
            const nameInput = document.getElementById('pubName');
            const questionInput = document.getElementById('pubQuestion');
            const answerInput = document.getElementById('pubAnswer');
            const passwordToggle = document.getElementById('pubPasswordToggle');
            const nameHint = document.getElementById('pubNameHint');

            const rawName = nameInput ? nameInput.value : '';
            const question = questionInput ? questionInput.value.trim() : '';
            const answer = answerInput ? answerInput.value.trim() : '';
            const passwordEnabled = !!(passwordToggle && passwordToggle.checked);
            const type = currentPubType;

            if (!rawName || !rawName.trim()) {
                alert('Please enter a name for the link.');
                return;
            }

            let securityConfig = { type: 'none', question: '', answer: '' };
            if (passwordEnabled) {
                if (!question || !answer) {
                    alert('Please fill in question and answer.');
                    return;
                }
                securityConfig = { type, question, answer };
            }

            const btn = document.querySelector('#publishModalContent button.header-btn');
            const originalText = btn.innerText;
            btn.innerText = 'Publishing...';
            btn.disabled = true;

            try {
                const resolvedName = await publishCanvasWithName(rawName, securityConfig);
                const url = buildPreviewUrl(resolvedName);
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(url).catch(() => { });
                }
                if (nameHint) {
                    nameHint.textContent = resolvedName === slugifyName(rawName)
                        ? `Published as ${resolvedName}`
                        : `Name taken, published as ${resolvedName}`;
                }
                showStatusToast('Published! Link copied to clipboard.');
                closePublishModal();
            } catch (err) {
                alert((err && err.message) ? err.message : 'Publish failed.');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }
        const canvas = document.getElementById('canvas');
        const contentLayer = document.getElementById('contentLayer');
        const workspace = document.getElementById('workspace');
        const contextBar = document.getElementById('contextBar');
        const addMenu = document.getElementById('addMenu');
        const stylesMenu = document.getElementById('stylesMenu');
        const addToggleBtn = document.getElementById('addToggleBtn');
        const stylesToggleBtn = document.getElementById('stylesToggleBtn');
        const saveShareBtn = document.getElementById('saveShareBtn');
        if (saveShareBtn) {
            saveShareBtn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px"></i> Publish';
            saveShareBtn.onclick = openPublishModal;
        }
        const pubTypeTabs = document.getElementById('pubTypeTabs');
        if (pubTypeTabs) {
            pubTypeTabs.addEventListener('click', (event) => {
                const tab = event.target.closest('.pub-tab');
                if (!tab) return;
                setPubType(tab.dataset.type || 'date_short');
            });
        }
        const pubPasswordToggle = document.getElementById('pubPasswordToggle');
        if (pubPasswordToggle) {
            pubPasswordToggle.addEventListener('change', updatePublishSecurityVisibility);
        }
        setPubType(currentPubType);
        updatePublishSecurityVisibility();
        const fileInput = document.createElement('input');
        fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        const bouquetInput = document.createElement('input');
        bouquetInput.type = 'file'; bouquetInput.accept = 'image/*'; bouquetInput.style.display = 'none';
        document.body.appendChild(bouquetInput);

        let selectedEl = null;
        let isDragging = false;
        let isResizing = false;
        let dragMoved = false;
        let suppressOpenOnce = false;
        let startPos = { x: 0, y: 0 };
        let startElPos = { x: 0, y: 0, w: 0, h: 0 };
        let zIndexCounter = 10;
        let currentZoom = 1;
        let panX = 0;
        let panY = 0;
        let editingLetterEl = null;
        const mobileTouchLocks = [];
        let initialRestoreDone = false;
        const LAYOUT_DESKTOP = 'desktop';
        const LAYOUT_MOBILE = 'mobile';
        let lastCanvasState = null;
        let lastAppliedLayoutMode = null;

        function getLayoutMode() {
            return isMobileViewport() ? LAYOUT_MOBILE : LAYOUT_DESKTOP;
        }

        function generateElementId() {
            if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
            return `el-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        }

        function ensureElementId(el) {
            if (!el.dataset.elementId) el.dataset.elementId = generateElementId();
            return el.dataset.elementId;
        }

        function cloneDeep(value) {
            return JSON.parse(JSON.stringify(value));
        }

        function normalizeLayout(layout, fallback = {}) {
            const src = layout || {};
            return {
                left: src.left ?? fallback.left ?? '0px',
                top: src.top ?? fallback.top ?? '0px',
                width: src.width ?? fallback.width ?? '',
                height: src.height ?? fallback.height ?? '',
                zIndex: src.zIndex ?? fallback.zIndex ?? '',
                rotation: src.rotation ?? fallback.rotation ?? '0',
                transform: src.transform ?? fallback.transform ?? ''
            };
        }

        function normalizeElementRecord(raw) {
            const legacyLayout = normalizeLayout({
                left: raw.left,
                top: raw.top,
                width: raw.width,
                height: raw.height,
                zIndex: raw.zIndex,
                rotation: raw.rotation,
                transform: raw.transform
            });
            const layouts = (raw.layouts && typeof raw.layouts === 'object') ? raw.layouts : {};
            const desktopLayout = normalizeLayout(layouts[LAYOUT_DESKTOP], legacyLayout);
            const mobileLayout = normalizeLayout(layouts[LAYOUT_MOBILE], desktopLayout);

            return {
                id: raw.id || raw.elementId || generateElementId(),
                type: raw.type || ((raw.classes || '').match(/el-(\w+)/) || [])[1] || 'image',
                letterText: raw.letterText || '',
                letterBg: raw.letterBg || '#ff69b4',
                letterFontSize: raw.letterFontSize || 'medium',
                letterTextAlign: raw.letterTextAlign || 'center',
                contentHTML: raw.contentHTML || '',
                classes: (raw.classes || '').replace(/\s+/g, ' ').trim(),
                layouts: {
                    [LAYOUT_DESKTOP]: desktopLayout,
                    [LAYOUT_MOBILE]: mobileLayout
                }
            };
        }

        function normalizeCanvasState(state) {
            const source = state && typeof state === 'object' ? state : {};
            const sourceElements = Array.isArray(source.elements) ? source.elements : (Array.isArray(state) ? state : []);
            return {
                elements: sourceElements.map(normalizeElementRecord),
                footerText: source.footerText || '',
                bgColor: source.bgColor || document.body.style.background || ''
            };
        }

        function getLayoutForMode(record, mode) {
            const normalized = normalizeElementRecord(record);
            return normalized.layouts[mode] || normalized.layouts[LAYOUT_DESKTOP] || normalized.layouts[LAYOUT_MOBILE];
        }

        function toLayoutSnapshotFromElement(el) {
            return normalizeLayout({
                left: el.style.left,
                top: el.style.top,
                width: el.style.width,
                height: el.style.height,
                zIndex: el.style.zIndex,
                rotation: el.dataset.rotation || '0',
                transform: el.style.transform
            });
        }

        let editorInitialized = false;
        function initializeEditor() {
            if (editorInitialized) return;
            editorInitialized = true;
            bindFloatingControls();
            updateUndoRedoButtons();
            restoreCanvas();
            window.addEventListener('resize', scheduleViewportFit);
            window.addEventListener('orientationchange', scheduleViewportFit);
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', scheduleViewportFit);
            }
            bindMobileTouchLock();
        }

        async function stabilizeAndRevealContentLayer() {
            fitCanvasToViewport(true);
            initialRestoreDone = true;
        }

        function bindMobileTouchLock() {
            if (!workspace || !canvas) return;
            if (!isMobileViewport()) return;
            if (mobileTouchLocks.length > 0) return;

            const preventTouchMove = (event) => event.preventDefault();
            workspace.addEventListener('touchmove', preventTouchMove, { passive: false });
            canvas.addEventListener('touchmove', preventTouchMove, { passive: false });
            if (contentLayer) contentLayer.addEventListener('touchmove', preventTouchMove, { passive: false });
            mobileTouchLocks.push(preventTouchMove);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeEditor);
            window.addEventListener('load', initializeEditor);
        } else {
            initializeEditor();
        }

        function isMobileViewport() {
            return window.matchMedia('(max-width: 768px)').matches;
        }

        function updateZoomLabel() {
            const zoomLabel = document.getElementById('zoomLevel');
            if (zoomLabel) zoomLabel.textContent = `${Math.round(currentZoom * 100)}%`;
        }

        function applyCanvasTransform() {
            if (!contentLayer) return;
            contentLayer.style.transformOrigin = '0 0';
            contentLayer.style.transform = `translate(${panX}px, ${panY}px) scale(${currentZoom})`;
            updateZoomLabel();
        }

        function resetCanvasViewport() {
            currentZoom = 1;
            panX = 0;
            panY = 0;
            if (contentLayer) {
                contentLayer.style.transformOrigin = '0 0';
                contentLayer.style.transform = 'none';
            }
            updateZoomLabel();
        }

        function getCanvasElementsBounds() {
            const host = contentLayer || canvas;
            const nodes = Array.from(host.querySelectorAll('.canvas-element'));
            const baseWidth = canvas.clientWidth || workspace.clientWidth || window.innerWidth;
            const baseHeight = canvas.clientHeight || workspace.clientHeight || window.innerHeight;
            if (nodes.length === 0 && (!baseWidth || !baseHeight)) return null;

            // Always include the canvas frame itself so mobile never collapses into a tiny cluster.
            let minX = 0;
            let minY = 0;
            let maxX = Math.max(1, baseWidth);
            let maxY = Math.max(1, baseHeight);

            nodes.forEach((el) => {
                const x = parseFloat(el.style.left) || 0;
                const y = parseFloat(el.style.top) || 0;
                const w = el.offsetWidth || parseFloat(el.style.width) || 0;
                const h = el.offsetHeight || parseFloat(el.style.height) || 0;
                // Include nearby off-canvas elements so fit can pull them back into view,
                // while still rejecting extreme corrupted coordinates.
                const minXLimit = -baseWidth;
                const maxXLimit = baseWidth * 2;
                const minYLimit = -baseHeight;
                const maxYLimit = baseHeight * 2;
                const x1 = Math.max(minXLimit, Math.min(maxXLimit, x));
                const y1 = Math.max(minYLimit, Math.min(maxYLimit, y));
                const x2 = Math.max(minXLimit, Math.min(maxXLimit, x + w));
                const y2 = Math.max(minYLimit, Math.min(maxYLimit, y + h));
                if (x2 > x1 && y2 > y1) {
                    minX = Math.min(minX, x1);
                    minY = Math.min(minY, y1);
                    maxX = Math.max(maxX, x2);
                    maxY = Math.max(maxY, y2);
                }
            });

            return {
                minX,
                minY,
                maxX,
                maxY,
                width: Math.max(1, maxX - minX),
                height: Math.max(1, maxY - minY)
            };
        }

        function fitCanvasToViewport(force = false) {
            if (!isMobileViewport()) {
                resetCanvasViewport();
                return;
            }

            const bounds = getCanvasElementsBounds();
            if (!bounds) {
                resetCanvasViewport();
                return;
            }

            const workspaceRect = workspace.getBoundingClientRect();
            const availableW = Math.max(1, workspaceRect.width);
            const availableH = Math.max(1, workspaceRect.height);
            const scaleX = availableW / Math.max(1, bounds.width);
            const scaleY = availableH / Math.max(1, bounds.height);
            currentZoom = Math.min(Math.max(Math.min(scaleX, scaleY, 1), 0.15), 1);
            panX = (availableW - bounds.width * currentZoom) / 2 - bounds.minX * currentZoom;
            panY = (availableH - bounds.height * currentZoom) / 2 - bounds.minY * currentZoom;

            // Clamp horizontal/vertical overflow so off-right/off-bottom content is pushed back in-frame.
            const projectedLeft = bounds.minX * currentZoom + panX;
            const projectedRight = bounds.maxX * currentZoom + panX;
            const projectedTop = bounds.minY * currentZoom + panY;
            const projectedBottom = bounds.maxY * currentZoom + panY;

            if (projectedRight > availableW) panX -= (projectedRight - availableW);
            if (projectedLeft < 0) panX -= projectedLeft;
            if (projectedBottom > availableH) panY -= (projectedBottom - availableH);
            if (projectedTop < 0) panY -= projectedTop;

            // User-requested bias: nudge content left to reveal right-side elements.
            const leftBias = Math.round(availableW * 0.18);
            panX -= leftBias;

            applyCanvasTransform();
        }

        let fitViewportTimeout = null;
        function scheduleViewportFit() {
            if (!initialRestoreDone) return;
            const mode = getLayoutMode();
            if (lastAppliedLayoutMode && mode !== lastAppliedLayoutMode && lastCanvasState) {
                applyCanvasState(lastCanvasState);
                return;
            }
            clearTimeout(fitViewportTimeout);
            fitViewportTimeout = setTimeout(() => fitCanvasToViewport(true), 100);
        }

        function zoomCanvas(factor) {
            // Manual zoom controls were removed; keep as no-op for backward compatibility.
            return;
        }

        function select(el) {
            if (selectedEl) selectedEl.classList.remove('selected');
            selectedEl = el;
            selectedEl.classList.add('selected');
            updateContextBar();
        }

        function createNewElement(type, x, y, w, h) {
            const el = document.createElement('div');
            el.className = `canvas-element el-${type}`;
            el.dataset.elementId = generateElementId();
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.width = w ? (w + 'px') : 'auto';
            el.style.height = h ? (h + 'px') : 'auto';
            el.style.zIndex = zIndexCounter++;
            el.dataset.rotation = 0;

            const handle = document.createElement('div');
            handle.className = 'resize-handle se';
            handle.innerHTML = `<svg class="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
            handle.onmousedown = (e) => { e.stopPropagation(); startResize(e, el); };
            handle.ontouchstart = (e) => { e.stopPropagation(); startResize(e, el); };
            el.appendChild(handle);

            const rotHandle = document.createElement('div');
            rotHandle.className = 'rotate-handle';
            rotHandle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /><polyline points="17 2 21 3.5 19.5 7.5" /></svg>`;
            rotHandle.onmousedown = (e) => { e.stopPropagation(); startRotate(e, el); };
            el.appendChild(rotHandle);

            el.onmousedown = (e) => {
                if (e.target.closest('.resize-handle') || e.target.closest('.rotate-handle') || e.target.closest('.context-bar') || e.target.closest('.media-close-btn') || e.target.closest('.music-drag-handle')) return;
                startDrag(e, el);
            };
            el.ontouchstart = (e) => {
                if (e.target.closest('.resize-handle') || e.target.closest('.rotate-handle') || e.target.closest('.context-bar') || e.target.closest('.media-close-btn') || e.target.closest('.music-drag-handle')) return;
                startDrag(e, el);
            };
            el.onmouseenter = () => { if (!isDragging && !isResizing) select(el); };
            el.onclick = (e) => {
                if (isDragging || isResizing) return;
                if (e.target.closest('.resize-handle') || e.target.closest('.rotate-handle') || e.target.closest('.context-bar') || e.target.closest('.media-close-btn') || e.target.closest('.music-drag-handle')) return;
                if (suppressOpenOnce) { suppressOpenOnce = false; return; }
                if (type === 'image' || type === 'video') openMediaViewer(el);
                else if (type === 'music') { const audio = el.querySelector('audio'); if (audio) { if (audio.paused) audio.play(); else audio.pause(); } }
            };
            if (type === 'letter') { el.ondblclick = () => { if (isDragging || isResizing) return; editSelectedLetter(); }; }

            (contentLayer || canvas).appendChild(el);
            attachMusicDragHandle(el);
            select(el);
            saveCanvas();
            if (isMobileViewport()) scheduleViewportFit();
            return el;
        }


        function deselect() {
            if (selectedEl) selectedEl.classList.remove('selected');
            selectedEl = null;
            contextBar.style.display = 'none';
        }

        function attachRotateEdgeTracking(el) {
            const edgeThreshold = 16;
            el.addEventListener('mousemove', (event) => {
                const rect = el.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                const nearEdge = x <= edgeThreshold || y <= edgeThreshold || x >= rect.width - edgeThreshold
                    || y >= rect.height - edgeThreshold;
                el.classList.toggle('edge-hover', nearEdge);
            });
            el.addEventListener('mouseleave', () => {
                el.classList.remove('edge-hover');
            });
        }

        function attachMediaCloseButton(el) {
            if (!el || (!el.classList.contains('el-video') && !el.classList.contains('el-music'))) return;
            if (el.querySelector('.media-close-btn')) return;

            const closeBtn = document.createElement('button');
            closeBtn.className = 'media-close-btn';
            closeBtn.type = 'button';
            closeBtn.title = 'Close media';
            closeBtn.setAttribute('aria-label', 'Close media');
            closeBtn.textContent = 'Ãƒâ€”';
            closeBtn.onmousedown = (e) => e.stopPropagation();
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                if (selectedEl === el) deselect();
                el.remove();
                saveCanvas();
            };
            el.appendChild(closeBtn);
        }

        function attachMusicDragHandle(el) {
            if (!el || !el.classList.contains('el-music')) return;
            if (el.querySelector('.music-drag-handle')) return;

            const dragHandle = document.createElement('button');
            dragHandle.className = 'music-drag-handle';
            dragHandle.type = 'button';
            dragHandle.title = 'Drag music';
            dragHandle.setAttribute('aria-label', 'Drag music');
            dragHandle.textContent = 'Ã¢â€ â€¢';
            dragHandle.onmousedown = (e) => {
                e.stopPropagation();
                startDrag(e, el);
            };
            dragHandle.ontouchstart = (e) => {
                e.stopPropagation();
                startDrag(e, el);
            };
            el.appendChild(dragHandle);
        }

        workspace.onmousedown = (e) => {
            if (e.target === canvas || e.target === workspace || e.target === contentLayer) {
                deselect();
                addMenu.classList.remove('active');
                stylesMenu.classList.remove('active');
            }
        };

        function updateContextBar() {
            if (!selectedEl) {
                contextBar.style.display = 'none';
                return;
            }
            const isVideo = selectedEl.classList.contains('el-video');
            const isLetter = selectedEl.classList.contains('el-letter');
            if (isVideo) {
                contextBar.style.display = 'none';
                return;
            }
            contextBar.style.display = 'flex';
            selectedEl.appendChild(contextBar);
            const isFramable = selectedEl.classList.contains('el-image') || selectedEl.classList.contains('el-music');
            document.getElementById('btnFrame').style.display = isFramable ? 'flex' : 'none';
            const editBtn = document.getElementById('btnEdit');
            if (editBtn) editBtn.style.display = isLetter ? 'flex' : 'none';
        }

        function editSelectedLetter() {
            if (!selectedEl || !selectedEl.classList.contains('el-letter')) return;
            openModal('letter', {
                element: selectedEl,
                text: selectedEl.dataset.letterText || '',
                bg: selectedEl.dataset.letterBg || '#ff69b4',
                fontSize: selectedEl.dataset.letterFontSize || 'medium',
                textAlign: selectedEl.dataset.letterTextAlign || 'center'
            });
        }

        function setLetterFontSize(size, btn) {
            const sizes = { 'small': '16px', 'medium': '20px', 'big': '26px' };
            const textarea = document.getElementById('letterText');
            if (textarea) {
                textarea.style.fontSize = sizes[size];
                textarea.dataset.fontSize = size;
            }
            btn.parentElement.querySelectorAll('.letter-ctrl-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }

        function setLetterAlign(align, btn) {
            const textarea = document.getElementById('letterText');
            if (textarea) {
                textarea.style.textAlign = align;
                textarea.dataset.textAlign = align;
            }
            btn.parentElement.querySelectorAll('.letter-ctrl-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }

        function toggleSidebar() { /* Sidebar removed */ }
        function toggleStylesMenu(forceOpen) {
            if (!stylesMenu) return;
            const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !stylesMenu.classList.contains('active');
            stylesMenu.classList.toggle('active', shouldOpen);
            if (shouldOpen) addMenu.classList.remove('active');
        }
        function setCanvasBg(color, btn) {
            canvas.style.background = color;
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
            btn.classList.add('active');
            if (isMobileViewport()) scheduleViewportFit();
        }

        function toggleAddMenu(forceOpen) {
            if (!addMenu) return;
            const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !addMenu.classList.contains('active');
            addMenu.classList.toggle('active', shouldOpen);
            if (shouldOpen) stylesMenu.classList.remove('active');
        }

        function bindFloatingControls() {
            const onAddToggle = (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleAddMenu();
            };
            const onStylesToggle = (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleStylesMenu();
            };
            const onButtonKey = (event, action) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                action(event);
            };

            if (addToggleBtn) {
                addToggleBtn.addEventListener('click', onAddToggle);
                addToggleBtn.addEventListener('keydown', (event) => onButtonKey(event, onAddToggle));
            }

            if (stylesToggleBtn) {
                stylesToggleBtn.addEventListener('click', onStylesToggle);
                stylesToggleBtn.addEventListener('keydown', (event) => onButtonKey(event, onStylesToggle));
            }

            document.addEventListener('click', (event) => {
                const target = event.target;
                if (addMenu && addMenu.classList.contains('active') && !addMenu.contains(target) && (!addToggleBtn ||
                    !addToggleBtn.contains(target))) {
                    toggleAddMenu(false);
                }
                if (stylesMenu && stylesMenu.classList.contains('active') && !stylesMenu.contains(target) && (!stylesToggleBtn
                    || !stylesToggleBtn.contains(target))) {
                    toggleStylesMenu(false);
                }
            });
        }

        function showStatusToast(message) {
            const existing = document.querySelector('.status-toast');
            if (existing) existing.remove();
            const toast = document.createElement('div');
            toast.className = 'status-toast';
            toast.textContent = message;
            document.body.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 180);
            }, 1800);
        }

        function getEventClientPoint(event) {
            if (event.touches && event.touches.length) return { x: event.touches[0].clientX, y: event.touches[0].clientY };
            if (event.changedTouches && event.changedTouches.length) return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
            return { x: event.clientX, y: event.clientY };
        }

        function startDrag(e, el) {
            const isTouch = !!(e.touches || e.changedTouches);
            if (isTouch) e.preventDefault();
            isDragging = true; select(el);
            dragMoved = false;
            document.body.style.cursor = 'var(--cursor-drag), grabbing';
            canvas.style.cursor = 'var(--cursor-drag), grabbing';
            const p0 = getEventClientPoint(e);
            startPos = { x: p0.x, y: p0.y };
            startElPos = { x: parseInt(el.style.left), y: parseInt(el.style.top) };
            const move = (evt) => {
                if (isTouch) evt.preventDefault();
                const p = getEventClientPoint(evt);
                const dx = (p.x - startPos.x) / currentZoom;
                const dy = (p.y - startPos.y) / currentZoom;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
                el.style.left = (startElPos.x + dx) + 'px';
                el.style.top = (startElPos.y + dy) + 'px';
            };
            const end = () => {
                isDragging = false;
                suppressOpenOnce = dragMoved;
                document.body.style.cursor = '';
                canvas.style.cursor = '';
                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', end);
                window.removeEventListener('touchmove', move);
                window.removeEventListener('touchend', end);
                window.removeEventListener('touchcancel', end);
                saveCanvas();
            };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', end);
            window.addEventListener('touchmove', move, { passive: false });
            window.addEventListener('touchend', end, { passive: false });
            window.addEventListener('touchcancel', end, { passive: false });
        }

        function startResize(e, el) {
            const isTouch = !!(e.touches || e.changedTouches);
            if (isTouch) e.preventDefault();
            e.stopPropagation(); isResizing = true;
            const p0 = getEventClientPoint(e);
            startPos = { x: p0.x, y: p0.y };
            startElPos = { w: el.offsetWidth, h: el.offsetHeight };
            const move = (evt) => {
                if (isTouch) evt.preventDefault();
                const p = getEventClientPoint(evt);
                const dx = (p.x - startPos.x) / currentZoom;
                el.style.width = (startElPos.w + dx) + 'px';
                el.style.height = (startElPos.h + (p.y - startPos.y) / currentZoom) + 'px';
            };
            const end = () => {
                isResizing = false; window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', end);
                window.removeEventListener('touchmove', move);
                window.removeEventListener('touchend', end);
                window.removeEventListener('touchcancel', end);
                saveCanvas();
                if (isMobileViewport()) scheduleViewportFit();
            };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', end);
            window.addEventListener('touchmove', move, { passive: false });
            window.addEventListener('touchend', end, { passive: false });
            window.addEventListener('touchcancel', end, { passive: false });
        }

        function startRotate(e, el) {
            if (isMobileViewport()) return;
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
            const currentRotation = parseInt(el.dataset.rotation) || 0;

            const move = (e) => {
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                const delta = (angle - startAngle) * (180 / Math.PI);
                const newRotation = Math.round(currentRotation + delta);
                el.dataset.rotation = newRotation;
                el.style.transform = `rotate(${newRotation}deg)`;
            };
            const end = () => {
                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', end);
                saveCanvas();
                if (isMobileViewport()) scheduleViewportFit();
            };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', end);
        }

        function deleteSelected() {
            selectedEl.remove();
            deselect();
            saveCanvas();
            if (isMobileViewport()) scheduleViewportFit();
        }

        const frames = ['none', 'frame-polaroid-pin', 'frame-red-gallery', 'frame-classic-polaroid'];
        function cycleFrame() {
            if (!selectedEl) return;
            let curr = frames.find(f => selectedEl.classList.contains(f)) || 'none';
            let next = frames[(frames.indexOf(curr) + 1) % frames.length];
            selectedEl.classList.remove(...frames.filter(f => f !== 'none'));
            if (next !== 'none') selectedEl.classList.add(next);
            saveCanvas();
        }

        function addImage() {
            fileInput.onchange = (e) => {
                const selectedFile = e.target.files && e.target.files[0];
                if (!selectedFile) return;
                const reader = new FileReader();
                reader.onload = (re) => {
                    const src = re.target.result;
                    createImageCanvasElement(src, {
                        x: 300, y: 200, maxWidth: 360, maxHeight: 300, fallbackWidth: 280,
                        fallbackHeight: 220
                    });
                    addMenu.classList.remove('active');
                };
                reader.readAsDataURL(selectedFile);
                e.target.value = '';
            };
            fileInput.value = '';
            fileInput.click();
        }

        function changeBouquet() {
            bouquetInput.onchange = (e) => {
                const reader = new FileReader();
                reader.onload = (re) => {
                    document.querySelector('#fixedBouquet img').src = re.target.result;
                };
                reader.readAsDataURL(e.target.files[0]);
            };
            bouquetInput.click();
        }

        function addSticker(s) {
            const el = createNewElement('sticker', 1400, 800);
            const d = document.createElement('div'); d.className = 'el-content'; d.textContent = s;
            el.appendChild(d);
            addMenu.classList.remove('active');
        }

        function addVideoFile() {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'video/*,.mov';
            input.onchange = (e) => {
                const selectedFile = e.target.files && e.target.files[0];
                if (!selectedFile) return;
                const reader = new FileReader();
                reader.onload = (re) => {
                    const src = re.target.result;
                    createVideoCanvasElement(src, {
                        x: 300, y: 200, maxWidth: 420, maxHeight: 300, fallbackWidth: 320,
                        fallbackHeight: 180
                    });
                    addMenu.classList.remove('active');
                    closeModal();
                };
                reader.readAsDataURL(selectedFile);
                e.target.value = '';
            };
            input.value = '';
            input.click();
        }

        function addMusicFile() {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'audio/*';
            input.onchange = (e) => {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const el = createNewElement('music', 300, 400, 280, 80);
                    el.innerHTML += `<audio class="el-content" src="${re.target.result}" controls style="width:100%"></audio>`;
                    addMenu.classList.remove('active');
                    closeModal();
                };
                reader.readAsDataURL(e.target.files[0]);
            };
            input.click();
        }

        function openModal(type, options = {}) {
            const overlay = document.getElementById('modalOverlay');
            const content = document.getElementById('modalContent');
            overlay.style.display = 'flex';

            if (type === 'letter') {
                const initialBg = options.bg || '#ff69b4';
                const initialText = options.text || '';
                editingLetterEl = options.element || null;
                content.innerHTML = `
        <div class="letter-editor-fullscreen" id="letterEditorBg" style="background:${initialBg};">
            <!-- Close button -->
            <button
                style="position:absolute; top:16px; left:16px; width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.3); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:18px; color:#fff; z-index:10"
                onclick="closeModal()">Ã¢Å“â€¢</button>
            <!-- Color dots to change bg -->
            <div class="letter-color-dots" style="position:absolute; top:20px; right:20px;">
                <div class="letter-color-dot" style="background:#ff69b4"
                    onclick="document.getElementById('letterEditorBg').style.background='#ff69b4'"></div>
                <div class="letter-color-dot" style="background:#ff1493"
                    onclick="document.getElementById('letterEditorBg').style.background='#ff1493'"></div>
                <div class="letter-color-dot" style="background:#e91e63"
                    onclick="document.getElementById('letterEditorBg').style.background='#e91e63'"></div>
                <div class="letter-color-dot" style="background:#9c27b0"
                    onclick="document.getElementById('letterEditorBg').style.background='#9c27b0'"></div>
                <div class="letter-color-dot" style="background:#f48fb1"
                    onclick="document.getElementById('letterEditorBg').style.background='#f48fb1'"></div>
                <div class="letter-color-dot" style="background:#ce93d8"
                    onclick="document.getElementById('letterEditorBg').style.background='#ce93d8'"></div>
            </div>
            <!-- Font size & alignment controls on pink bg -->
            <div
                style="position:absolute; bottom:28px; left:50%; transform:translateX(-50%); display:flex; gap:16px; align-items:center; z-index:10;">
                <div
                    style="display:flex; gap:4px; background:rgba(255,255,255,0.15); border-radius:12px; padding:4px; backdrop-filter:blur(4px);">
                    <button type="button"
                        class="letter-ctrl-btn ${(options.fontSize || 'medium') === 'small' ? 'active' : ''}"
                        onclick="setLetterFontSize('small',this)" style="font-size:12px">S</button>
                    <button type="button"
                        class="letter-ctrl-btn ${(options.fontSize || 'medium') === 'medium' ? 'active' : ''}"
                        onclick="setLetterFontSize('medium',this)" style="font-size:14px">M</button>
                    <button type="button"
                        class="letter-ctrl-btn ${(options.fontSize || 'medium') === 'big' ? 'active' : ''}"
                        onclick="setLetterFontSize('big',this)" style="font-size:16px">L</button>
                </div>
                <div
                    style="display:flex; gap:4px; background:rgba(255,255,255,0.15); border-radius:12px; padding:4px; backdrop-filter:blur(4px);">
                    <button type="button"
                        class="letter-ctrl-btn ${(options.textAlign || 'center') === 'left' ? 'active' : ''}"
                        onclick="setLetterAlign('left',this)" title="Left">&#9776;</button>
                    <button type="button"
                        class="letter-ctrl-btn ${(options.textAlign || 'center') === 'center' ? 'active' : ''}"
                        onclick="setLetterAlign('center',this)" title="Center">&#9776;</button>
                    <button type="button"
                        class="letter-ctrl-btn ${(options.textAlign || 'center') === 'right' ? 'active' : ''}"
                        onclick="setLetterAlign('right',this)" title="Right">&#9776;</button>
                </div>
            </div>
            <!-- Letter paper -->
            <div class="letter-paper-card">
                <div class="texture"></div>
                <textarea class="letter-textarea" id="letterText" placeholder="Write something sweet..."
                    style="font-size:${({ 'small': '16px', 'medium': '20px', 'big': '26px' })[options.fontSize || 'medium']}; text-align:${options.textAlign || 'center'}"></textarea>
                <!-- Actions inside the card -->
                <div class="letter-actions" style="display:flex; justify-content:flex-end; gap:12px; margin-top:16px;">
                    <button class="btn-m btn-m-secondary"
                        onclick="document.getElementById('letterText').value=''">Clear</button>
                    <button class="btn-m btn-m-primary" onclick="confirmLetter()">Save Letter</button>
                </div>
            </div>
        </div>
        `;
                const textarea = document.getElementById('letterText');
                if (textarea) textarea.value = initialText;
            } else if (type === 'video') {
                editingLetterEl = null;
                content.innerHTML = `
        <div
            style="background:#fff; padding:32px; border-radius:32px; width:440px; box-shadow:0 20px 60px rgba(0,0,0,0.1)">
            <h3 style="margin-bottom:8px; font-weight:500">Add Video</h3>
            <p style="color:#86868b; font-size:14px; margin-bottom:20px">Upload a file or paste a YouTube link</p>
            <div class="upload-dropzone" id="videoDropzone" onclick="addVideoFile()">
                <div style="font-size:40px; margin-bottom:8px">Ã°Å¸Å½Â¬</div>
                <div style="font-weight:500; margin-bottom:4px">Click to upload or drag video here</div>
                <div style="color:#86868b; font-size:13px">MP4, MOV, WebM</div>
            </div>
            <div class="or-divider">or</div>
            <input type="text" id="modalInput" placeholder="Paste YouTube link..."
                style="width:100%; padding:14px; border-radius:14px; border:1px solid #ddd; font-family:inherit">
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px">
                <button class="btn-m btn-m-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn-m btn-m-primary" onclick="confirmGeneric('video')">Embed</button>
            </div>
        </div>
        `;
                setupDropzone('videoDropzone', 'video');
            } else if (type === 'music') {
                editingLetterEl = null;
                content.innerHTML = `
        <div
            style="background:#fff; padding:32px; border-radius:32px; width:440px; box-shadow:0 20px 60px rgba(0,0,0,0.1)">
            <h3 style="margin-bottom:8px; font-weight:500">Add Music</h3>
            <p style="color:#86868b; font-size:14px; margin-bottom:20px">Upload a file or paste a streaming link</p>
            <div class="upload-dropzone" id="musicDropzone" onclick="addMusicFile()">
                <div style="font-size:40px; margin-bottom:8px">Ã°Å¸Å½Âµ</div>
                <div style="font-weight:500; margin-bottom:4px">Click to upload or drag audio here</div>
                <div style="color:#86868b; font-size:13px">MP3, WAV, OGG</div>
            </div>
            <div class="or-divider">or</div>
            <input type="text" id="modalInput" placeholder="Paste Spotify, YouTube Music, or other link..."
                style="width:100%; padding:14px; border-radius:14px; border:1px solid #ddd; font-family:inherit">
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px">
                <button class="btn-m btn-m-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn-m btn-m-primary" onclick="confirmGeneric('music')">Embed</button>
            </div>
        </div>
        `;
                setupDropzone('musicDropzone', 'music');
            }
        }

        function setLetterFontSize(size, btn) {
            const textarea = document.getElementById('letterText');
            if (!textarea) return;
            const sizes = { 'small': '16px', 'medium': '20px', 'big': '26px' };
            textarea.style.fontSize = sizes[size];
            textarea.dataset.fontSize = size;
            btn.parentElement.querySelectorAll('.letter-ctrl-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }

        function setLetterAlign(align, btn) {
            const textarea = document.getElementById('letterText');
            if (!textarea) return;
            textarea.style.textAlign = align;
            textarea.dataset.textAlign = align;
            btn.parentElement.querySelectorAll('.letter-ctrl-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }

        function setCanvasBg(color, dot) {
            document.body.style.background = color;
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
            if (dot) dot.classList.add('active');
            saveCanvas();
        }

        function showStatusToast(msg) {
            let t = document.querySelector('.status-toast');
            if (!t) {
                t = document.createElement('div');
                t.className = 'status-toast';
                document.body.appendChild(t);
            }
            t.textContent = msg;
            t.classList.add('active');
            setTimeout(() => t.classList.remove('active'), 3000);
        }

        function setupDropzone(id, type) {
            const zone = document.getElementById(id);
            if (!zone) return;
            zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('dragover'); };
            zone.ondragleave = () => zone.classList.remove('dragover');
            zone.ondrop = (e) => {
                e.preventDefault(); zone.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file) {
                    if (type === 'video') handleVideoFile(file);
                    else handleMusicFile(file);
                }
            };
        }

        function handleVideoFile(file) {
            const reader = new FileReader();
            reader.onload = (re) => {
                const src = re.target.result;
                createVideoCanvasElement(src, {
                    x: 1300, y: 800, maxWidth: 420, maxHeight: 300, fallbackWidth: 320,
                    fallbackHeight: 180
                });
                addMenu.classList.remove('active');
            };
            reader.readAsDataURL(file);
            closeModal();
        }

        function handleMusicFile(file) {
            const reader = new FileReader();
            reader.onload = (re) => {
                const el = createNewElement('music', 1300, 800, 280, 80);
                el.innerHTML += `<audio class="el-content" src="${re.target.result}" controls style="width:100%"></audio>`;
                addMenu.classList.remove('active');
            };
            reader.readAsDataURL(file);
            closeModal();
        }

        function openLetterViewer(text, bgColor, fontSize, textAlign) {
            const viewer = document.getElementById('letterViewer');
            const safeBg = bgColor || '#ff69b4';
            const safeText = escapeHtml(text || '').replace(/\n/g, '<br>');
            const fSize = ({ 'small': '16px', 'medium': '20px', 'big': '26px' })[fontSize || 'medium'];
            const tAlign = textAlign || 'center';
            viewer.innerHTML = `
        <div class="letter-editor-fullscreen" style="background:${safeBg};">
            <button
                style="position:absolute; top:16px; left:16px; width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.3); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:18px; color:#fff; z-index:10"
                onclick="closeLetterViewer()">Ã¢Å“â€¢</button>
            <div class="letter-paper-card">
                <div class="texture"></div>
                <div class="letter-textarea"
                    style="white-space:pre-wrap; overflow:auto; pointer-events:auto; font-size:${fSize}; text-align:${tAlign}">
                    ${safeText || '<span style="opacity:.45">No letter text</span>'}</div>
            </div>
        </div>
        `;
            viewer.classList.add('active');
        }

        function openMediaViewer(el) {
            const viewer = document.getElementById('mediaViewer');
            if (!viewer || !el) return;
            const mediaNode = el.querySelector('.el-content');
            if (!mediaNode) return;

            let mediaHtml = '';
            if (mediaNode.tagName === 'IMG') {
                mediaHtml = `<img src="${mediaNode.src}" alt="Preview image" />`;
            } else if (mediaNode.tagName === 'VIDEO') {
                mediaHtml = `<video src="${mediaNode.currentSrc || mediaNode.src}" controls autoplay></video>`;
            } else if (mediaNode.tagName === 'IFRAME') {
                mediaHtml = `<iframe src="${mediaNode.src}" allow="${mediaNode.allow || 'autoplay; encrypted-media'}"
            allowfullscreen></iframe>`;
            } else if (mediaNode.tagName === 'AUDIO') {
                mediaHtml = `<audio src="${mediaNode.currentSrc || mediaNode.src}" controls autoplay></audio>`;
            } else {
                return;
            }

            viewer.innerHTML = `
        <div class="media-viewer-card">
            <button class="letter-viewer-close" onclick="closeMediaViewer()">Ã¢Å“â€¢</button>
            <div class="media-viewer-body">${mediaHtml}</div>
        </div>
        `;
            viewer.classList.add('active');
        }

        function closeMediaViewer() {
            const viewer = document.getElementById('mediaViewer');
            if (!viewer) return;
            viewer.innerHTML = '';
            viewer.classList.remove('active');
        }

        function closeLetterViewer() {
            document.getElementById('letterViewer').innerHTML = '';
            document.getElementById('letterViewer').classList.remove('active');
        }

        function escapeHtml(value) {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function closeModal() {
            editingLetterEl = null;
            document.getElementById('modalOverlay').style.display = 'none';
        }

        function confirmLetter() {
            const text = document.getElementById('letterText').value;
            const editorBg = document.getElementById('letterEditorBg');
            const bg = (editorBg && editorBg.style && editorBg.style.background) ? editorBg.style.background : '#ff69b4';
            const textarea = document.getElementById('letterText');
            // Fix: Read from textarea dataset which is updated by setLetterFontSize/Align
            const fontSize = textarea ? (textarea.dataset.fontSize || 'medium') : 'medium';
            const textAlign = textarea ? (textarea.dataset.textAlign || 'center') : 'center';

            if (editingLetterEl) {
                editingLetterEl.dataset.letterText = text;
                editingLetterEl.dataset.letterBg = bg;
                editingLetterEl.dataset.letterFontSize = fontSize;
                editingLetterEl.dataset.letterTextAlign = textAlign;

                // FORCE SAVE - ensure we wait/check
                console.log('Saving letter:', { text, bg, fontSize, textAlign });
                saveCanvas();
                closeModal();
                addMenu.classList.remove('active');
                return;
            }
            const el = createNewElement('letter', 300, 200, 320, 240);
            el.dataset.letterText = text;
            el.dataset.letterBg = bg;
            el.dataset.letterFontSize = fontSize;
            el.dataset.letterTextAlign = textAlign;
            el.innerHTML += `<div class="envelope-view"></div>`;
            closeModal();
            addMenu.classList.remove('active');
        }

        function confirmGeneric(type) {
            const val = document.getElementById('modalInput').value;
            if (!val) return;
            if (type === 'video') {
                const sourceUrl = extractEmbedSourceFromInput(val);
                const videoId = sourceUrl.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]+)/);
                if (videoId) {
                    createVideoCanvasElement(`https://www.youtube.com/embed/${videoId[1]}`, {
                        x: 300, y: 200, maxWidth: 420, maxHeight: 300, fallbackWidth: 320, fallbackHeight: 180, embed: true
                    });
                }
            }
            if (type === 'music') {
                const el = createNewElement(type, 300, 200, 320, 200);
                const embed = resolveMusicEmbed(val);
                if (embed) appendEmbedIframe(el, embed.src, embed.allow, false);
            }
            closeModal();
            addMenu.classList.remove('active');
        }

        function createImageCanvasElement(src, options) {
            const imgProbe = new Image();
            imgProbe.onload = () => {
                const fitted = getFittedMediaSize(imgProbe.naturalWidth, imgProbe.naturalHeight, options.maxWidth,
                    options.maxHeight);
                const el = createNewElement('image', options.x, options.y, fitted.width, fitted.height);
                const img = document.createElement('img');
                img.src = src;
                img.className = 'el-content';
                img.style.objectFit = 'contain';
                el.appendChild(img);
            };
            imgProbe.onerror = () => {
                const el = createNewElement('image', options.x, options.y, options.fallbackWidth, options.fallbackHeight);
                const img = document.createElement('img');
                img.src = src;
                img.className = 'el-content';
                img.style.objectFit = 'contain';
                el.appendChild(img);
            };
            imgProbe.src = src;
        }

        function createVideoCanvasElement(src, options) {
            const setVideoElement = (width, height) => {
                const el = createNewElement('video', options.x, options.y, width, height);
                if (options.embed) {
                    appendEmbedIframe(el, src, 'autoplay; encrypted-media', true);
                } else {
                    el.innerHTML += `
                        <video class="el-content" src="${src}" controls style="width:100%;height:100%;object-fit:contain;border-radius:12px" onloadeddata="this.currentTime=5;"></video>
                        <div class="video-play-btn" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 64px; height: 64px; background: #ff3355; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(255, 51, 85, 0.4); pointer-events: none;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                    `;
                }
            };

            if (options.embed) {
                const fitted = getFittedMediaSize(16, 9, options.maxWidth, options.maxHeight);
                setVideoElement(fitted.width, fitted.height);
                return;
            }

            const probe = document.createElement('video');
            probe.preload = 'metadata';
            probe.onloadedmetadata = () => {
                const fitted = getFittedMediaSize(probe.videoWidth || 16, probe.videoHeight || 9, options.maxWidth,
                    options.maxHeight);
                setVideoElement(fitted.width, fitted.height);
            };
            probe.onerror = () => {
                setVideoElement(options.fallbackWidth, options.fallbackHeight);
            };
            probe.src = src;
        }

        function extractEmbedSourceFromInput(input) {
            const raw = String(input || '').trim();
            const srcMatch = raw.match(/src\s*=\s*["']([^"']+)["']/i);
            if (srcMatch && srcMatch[1]) return srcMatch[1].trim();
            const urlMatch = raw.match(/https?:\/\/[^\s"'<>]+/i);
            if (urlMatch && urlMatch[0]) return urlMatch[0].trim();
            return raw.replace(/^["']|["']$/g, '').trim();
        }

        function resolveMusicEmbed(input) {
            const source = extractEmbedSourceFromInput(input);
            if (!source) return null;

            if (source.includes('spotify.com')) {
                let normalized = source.replace('open.spotify.com/', 'open.spotify.com/embed/');
                if (!normalized.includes('/embed/')) normalized = normalized.replace('spotify.com/', 'spotify.com/embed/');
                // Ensure no double embed
                normalized = normalized.replace('/embed/embed/', '/embed/');
                return {
                    src: normalized,
                    allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
                };
            }

            if (source.includes('music.youtube.com') || source.includes('youtube.com') || source.includes('youtu.be')) {
                const videoId = source.match(/(?:v=|youtu\.be\/|embed\/)([\w-]+)/);
                if (videoId && videoId[1]) {
                    return { src: `https://www.youtube.com/embed/${videoId[1]}`, allow: 'autoplay; encrypted-media' };
                }
            }

            return { src: source, allow: 'autoplay; encrypted-media' };
        }

        function appendEmbedIframe(container, src, allow, allowFullscreen) {
            const iframe = document.createElement('iframe');
            iframe.className = 'el-content';
            iframe.src = src;
            iframe.allow = allow || 'autoplay; encrypted-media';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.borderRadius = '12px';
            if (allowFullscreen) iframe.allowFullscreen = true;
            container.appendChild(iframe);
        }

        function getFittedMediaSize(sourceWidth, sourceHeight, maxWidth, maxHeight) {
            const safeWidth = Math.max(1, Number(sourceWidth) || 1);
            const safeHeight = Math.max(1, Number(sourceHeight) || 1);
            const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1);
            return {
                width: Math.max(140, Math.round(safeWidth * scale)),
                height: Math.max(100, Math.round(safeHeight * scale))
            };
        }


        // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â SUPABASE Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â(Restored)
        const SUPABASE_URL = 'https://yahblufnafnyqoligtlw.supabase.co';
        const SUPABASE_KEY =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaGJsdWZuYWZueXFvbGlndGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTQ0NjYsImV4cCI6MjA4NjU3MDQ2Nn0.ZV0aMjzTMHWThE-0x2LIoq2WxcubL67pBVNiyQPosV0';
        const supabaseClient = (window.supabase && window.supabase.createClient)
            ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
            : null;

        function getCanvasIdFromUrl() {
            const params = new URLSearchParams(window.location.search);
            const fromName = params.get('name');
            if (fromName && fromName.trim()) return fromName.trim();
            const fromId = params.get('id');
            return fromId ? fromId.trim() : '';
        }

        // Canvas ID Ã¢â‚¬â€ shared through URL when available, otherwise local persistent draft
        function getCanvasId() {
            const urlId = getCanvasIdFromUrl();
            if (urlId) {
                localStorage.setItem('pinkBouquetCanvasId', urlId);
                return urlId;
            }

            let id = localStorage.getItem('pinkBouquetCanvasId');
            if (!id) {
                id = crypto.randomUUID();
                localStorage.setItem('pinkBouquetCanvasId', id);
            }
            return id;
        }
        const canvasId = getCanvasId();
        const localCanvasKey = `pinkBouquetCanvas:${canvasId}`;
        const legacyLocalCanvasKey = 'pinkBouquetCanvas';
        const editorDbName = 'pinkBouquetEditor';
        const editorDbStore = 'canvasSnapshots';

        function openEditorDb() {
            return new Promise((resolve, reject) => {
                if (!window.indexedDB) {
                    reject(new Error('IndexedDB unavailable'));
                    return;
                }
                const request = window.indexedDB.open(editorDbName, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(editorDbStore)) {
                        db.createObjectStore(editorDbStore, { keyPath: 'id' });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
            });
        }

        async function saveCanvasToIndexedDb(id, state) {
            const normalized = normalizeCanvasState(state);
            const db = await openEditorDb();
            await new Promise((resolve, reject) => {
                const tx = db.transaction(editorDbStore, 'readwrite');
                const store = tx.objectStore(editorDbStore);
                store.put({ id, state: normalized, elements: normalized.elements, footerText: normalized.footerText, updatedAt: Date.now() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error || new Error('Failed to save IndexedDB canvas'));
            });
            db.close();
        }

        async function loadCanvasFromIndexedDb(id) {
            const db = await openEditorDb();
            const record = await new Promise((resolve, reject) => {
                const tx = db.transaction(editorDbStore, 'readonly');
                const store = tx.objectStore(editorDbStore);
                const req = store.get(id);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error || new Error('Failed to load IndexedDB canvas'));
            });
            db.close();
            if (!record) return null;
            if (record.state && typeof record.state === 'object') return normalizeCanvasState(record.state);
            if (Array.isArray(record.elements)) return normalizeCanvasState({ elements: record.elements, footerText: record.footerText || '' });
            return null;
        }

        async function loadLatestCanvasFromIndexedDb() {
            const db = await openEditorDb();
            const latestRecord = await new Promise((resolve, reject) => {
                const tx = db.transaction(editorDbStore, 'readonly');
                const store = tx.objectStore(editorDbStore);
                const req = store.openCursor();
                let latest = null;
                req.onsuccess = () => {
                    const cursor = req.result;
                    if (!cursor) {
                        resolve(latest);
                        return;
                    }
                    const value = cursor.value || {};
                    if (!latest || (Number(value.updatedAt) || 0) > (Number(latest.updatedAt) || 0)) {
                        latest = value;
                    }
                    cursor.continue();
                };
                req.onerror = () => reject(req.error || new Error('Failed to scan IndexedDB canvases'));
            });
            db.close();
            if (!latestRecord) return null;
            if (latestRecord.state && typeof latestRecord.state === 'object') return normalizeCanvasState(latestRecord.state);
            if (Array.isArray(latestRecord.elements)) return normalizeCanvasState({ elements: latestRecord.elements, footerText: latestRecord.footerText || '' });
            return null;
        }

        // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â PERSISTENCE Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

        const historyStack = [];
        const redoStack = [];
        let isApplyingHistory = false;

        function buildPreviewUrl(id) {
            const url = new URL(window.location.origin);
            const safeId = String(id || '').trim();
            if (safeId) {
                url.pathname = `/${encodeURIComponent(safeId)}`;
            } else {
                url.pathname = '/';
            }
            return url.toString();
        }


        // Removed broken duplicate code for collectCanvasState/saveCanvasNow
        // Relies on simpler implementation later in file.

        function pushHistorySnapshot(snapshot) {
            const serialized = JSON.stringify(snapshot);
            const last = historyStack[historyStack.length - 1];
            if (last && JSON.stringify(last) === serialized) return;
            historyStack.push(JSON.parse(serialized));
            if (historyStack.length > 100) historyStack.shift();
            redoStack.length = 0;
        }

        function updateUndoRedoButtons() {
            const undoBtn = document.getElementById('undoBtn');
            const redoBtn = document.getElementById('redoBtn');
            if (undoBtn) undoBtn.disabled = historyStack.length <= 1 || isApplyingHistory;
            if (redoBtn) redoBtn.disabled = redoStack.length === 0 || isApplyingHistory;
        }



        function applyCanvasState(state) {
            const normalizedState = normalizeCanvasState(state);
            lastCanvasState = cloneDeep(normalizedState);
            const mode = getLayoutMode();
            const nextElements = normalizedState.elements;
            (contentLayer || canvas).querySelectorAll('.canvas-element').forEach(el => el.remove());
            deselect();

            if (normalizedState.footerText !== undefined) {
                const ftEl = document.getElementById('footerText');
                if (ftEl) ftEl.innerText = normalizedState.footerText;
            }

            if (normalizedState.bgColor) {
                document.body.style.background = normalizedState.bgColor;
                document.querySelectorAll('.color-dot').forEach(dot => {
                    if (dot.style.background === normalizedState.bgColor) dot.classList.add('active');
                    else dot.classList.remove('active');
                });
            }

            nextElements.forEach(data => {
                const normalized = normalizeElementRecord(data);
                const resolvedType = normalized.type;
                const layout = getLayoutForMode(normalized, mode);
                const el = document.createElement('div');
                el.className = normalized.classes || `canvas-element el-${resolvedType}`;
                el.dataset.elementId = normalized.id;
                el.style.left = layout.left || '0px';
                el.style.top = layout.top || '0px';
                el.style.width = layout.width || '';
                el.style.height = layout.height || '';
                el.style.zIndex = layout.zIndex || String(zIndexCounter++);
                el.style.transform = layout.transform || '';
                el.dataset.rotation = layout.rotation || '0';
                if (normalized.letterText) el.dataset.letterText = normalized.letterText;
                if (normalized.letterBg) el.dataset.letterBg = normalized.letterBg;
                if (normalized.letterFontSize) el.dataset.letterFontSize = normalized.letterFontSize;
                if (normalized.letterTextAlign) el.dataset.letterTextAlign = normalized.letterTextAlign;

                el.innerHTML = normalized.contentHTML || '';

                const handle = document.createElement('div');
                handle.className = 'resize-handle se';
                handle.innerHTML = `<svg class="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
                handle.onmousedown = (e) => { e.stopPropagation(); startResize(e, el); };
                handle.ontouchstart = (e) => { e.stopPropagation(); startResize(e, el); };
                el.appendChild(handle);

                const rotHandle = document.createElement('div');
                rotHandle.className = 'rotate-handle';
                rotHandle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /><polyline points="17 2 21 3.5 19.5 7.5" /></svg>`;
                rotHandle.onmousedown = (e) => { e.stopPropagation(); startRotate(e, el); };
                el.appendChild(rotHandle);

                el.onmousedown = (e) => {
                    if (e.target.closest('.resize-handle') || e.target.closest('.rotate-handle') || e.target.closest('.context-bar') ||
                        e.target.closest('.media-close-btn') || e.target.closest('.music-drag-handle')) return;
                    startDrag(e, el);
                };
                el.ontouchstart = (e) => {
                    if (e.target.closest('.resize-handle') || e.target.closest('.rotate-handle') || e.target.closest('.context-bar') ||
                        e.target.closest('.media-close-btn') || e.target.closest('.music-drag-handle')) return;
                    startDrag(e, el);
                };
                el.onmouseenter = () => { if (!isDragging && !isResizing) select(el); };

                attachRotateEdgeTracking(el);
                attachMediaCloseButton(el);
                attachMusicDragHandle(el);

                if (resolvedType === 'image' || resolvedType === 'video') {
                    el.onclick = (e) => {
                        if (isDragging || isResizing) return;
                        if (e.target.closest('.resize-handle') || e.target.closest('.rotate-handle') || e.target.closest('.context-bar') ||
                            e.target.closest('.media-close-btn') || e.target.closest('.music-drag-handle')) return;
                        if (suppressOpenOnce) { suppressOpenOnce = false; return; }
                        openMediaViewer(el);
                    };
                }
                if (resolvedType === 'music') {
                    el.onclick = (e) => {
                        if (isDragging || isResizing) return;
                        if (e.target.closest('.resize-handle') || e.target.closest('.rotate-handle') || e.target.closest('.context-bar') ||
                            e.target.closest('.media-close-btn') || e.target.closest('.music-drag-handle')) return;
                        if (suppressOpenOnce) { suppressOpenOnce = false; return; }
                        const audio = el.querySelector('audio');
                        if (audio) if (audio.paused) audio.play(); else audio.pause();
                    };
                }
                if (resolvedType === 'letter') {
                    el.ondblclick = () => { if (isDragging || isResizing) return; editSelectedLetter(); };
                }

                (contentLayer || canvas).appendChild(el);
                const z = parseInt(el.style.zIndex) || 10;
                if (z >= zIndexCounter) zIndexCounter = z + 1;
            });
            lastAppliedLayoutMode = mode;
        }

        function normalizeElementRecord(r) {
            return {
                id: r.id || r.elementId || Date.now().toString(36) + Math.random().toString(36).substr(2),
                type: r.type,
                left: r.left || '0px',
                top: r.top || '0px',
                width: r.width,
                height: r.height,
                zIndex: r.zIndex,
                transform: r.transform,
                rotation: r.rotation,
                contentHTML: r.contentHTML,
                src: r.src,
                classes: r.classes,
                letterText: r.letterText,
                letterBg: r.letterBg,
                letterFontSize: r.letterFontSize,
                letterTextAlign: r.letterTextAlign
            };
        }

        function collectCanvasState() {
            const elements = [];
            document.querySelectorAll('.canvas-element').forEach(el => {
                const type = el.classList.contains('el-image') ? 'image' :
                    el.classList.contains('el-video') ? 'video' :
                        el.classList.contains('el-music') ? 'music' :
                            el.classList.contains('el-letter') ? 'letter' :
                                el.classList.contains('el-sticker') ? 'sticker' : 'unknown';

                let content = {};
                if (type === 'image') {
                    const img = el.querySelector('img');
                    if (img) content.src = img.src;
                } else if (type === 'video') {
                    const vid = el.querySelector('video, iframe');
                    if (vid) content.src = vid.src;
                } else if (type === 'music') {
                    const audio = el.querySelector('audio');
                    if (audio) content.src = audio.src;
                } else if (type === 'letter') {
                    content.letterText = el.dataset.letterText;
                    content.letterBg = el.dataset.letterBg;
                    content.letterFontSize = el.dataset.letterFontSize;
                    content.letterTextAlign = el.dataset.letterTextAlign;
                } else if (type === 'sticker') {
                    content.contentHTML = el.innerHTML;
                }

                elements.push({
                    id: el.dataset.elementId,
                    type,
                    left: el.style.left,
                    top: el.style.top,
                    width: el.style.width,
                    height: el.style.height,
                    zIndex: el.style.zIndex,
                    transform: el.style.transform,
                    rotation: el.dataset.rotation,
                    classes: el.className,
                    ...content
                });
            });

            return {
                elements,
                footerText: document.getElementById('footerText')?.innerText,
                bgColor: canvas.style.background
            };
        }

        let saveTimeout;
        function saveCanvas(forcePublish = false, securityConfig = null) {
            const state = collectCanvasState();
            if (securityConfig) state.security = securityConfig;

            localStorage.setItem(localCanvasKey, JSON.stringify(state.elements));
            saveCanvasToIndexedDb(canvasId, state).catch(e => console.error(e));

            if (forcePublish) {
                saveCanvasNow(securityConfig);
                return;
            }

            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                saveCanvasNow();
            }, 2000);
        }

        async function saveCanvasNow(securityConfig = null) {
            const state = collectCanvasState();

            if (!isApplyingHistory) {
                pushHistorySnapshot(state);
            }
            updateUndoRedoButtons();

            if (securityConfig) state.security = securityConfig;

            if (!supabaseClient) return;

            try {
                const { error } = await supabaseClient
                    .from('canvases')
                    .upsert({
                        id: canvasId,
                        canvas_data: state,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                if (error) {
                    console.warn('Supabase save failed:', error.message);
                } else if (securityConfig) {
                    const baseUrl = window.location.origin;
                    const url = `${baseUrl}/${canvasId}`;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(url).then(() => showStatusToast('Published! Link copied.'));
                    } else {
                        alert('Published! Link:\n' + url);
                    }
                }
            } catch (err) {
                console.warn('Supabase save failed:', err);
            }
        }

        async function undoAction() {
            if (historyStack.length <= 1 || isApplyingHistory) return;
            const current = historyStack.pop();
            redoStack.push(current);
            const previous = historyStack[historyStack.length - 1];
            if (!previous) return;

            isApplyingHistory = true;
            applyCanvasState(previous);
            await saveCanvasNow();
            isApplyingHistory = false;
            updateUndoRedoButtons();
        }

        async function redoAction() {
            if (redoStack.length === 0 || isApplyingHistory) return;
            const next = redoStack.pop();
            historyStack.push(next);

            isApplyingHistory = true;
            applyCanvasState(next);
            await saveCanvasNow();
            isApplyingHistory = false;
            updateUndoRedoButtons();
        }

        async function restoreCanvas() {
            let restoredState = null;
            try {
                const loaded = await loadCanvasFromIndexedDb(canvasId);
                if (loaded) {
                    restoredState = normalizeCanvasState(loaded);
                }
            } catch (err) {
                console.warn('IndexedDB restore failed, trying localStorage:', (err && err.message) || err);
            }

            if (!restoredState) {
                const saved = localStorage.getItem(localCanvasKey);
                if (saved) {
                    try { restoredState = normalizeCanvasState({ elements: JSON.parse(saved) }); } catch (e) { }
                }
                if (!restoredState) {
                    const legacySaved = localStorage.getItem(legacyLocalCanvasKey);
                    if (legacySaved) {
                        try {
                            const legacyElements = JSON.parse(legacySaved);
                            if (Array.isArray(legacyElements)) {
                                restoredState = normalizeCanvasState({ elements: legacyElements });
                                localStorage.setItem(localCanvasKey, JSON.stringify(restoredState.elements));
                            }
                        } catch (e) { }
                    }
                }
            }

            // If there's no explicit URL id and current key has no data,
            // fall back to the most recently edited local canvas snapshot.
            if (!restoredState && !getCanvasIdFromUrl()) {
                try {
                    restoredState = await loadLatestCanvasFromIndexedDb();
                } catch (err) {
                    console.warn('Latest IndexedDB restore failed:', (err && err.message) || err);
                }
            }

            // Also try Supabase if needed (omitted for brevity unless essential, assuming local/IDB is primary)
            // Added supabase restore logic just in case:
            if (!restoredState && supabaseClient) {
                try {
                    const { data } = await supabaseClient
                        .from('canvases')
                        .select('canvas_data')
                        .eq('id', canvasId)
                        .single();
                    if (data && data.canvas_data) {
                        restoredState = normalizeCanvasState(data.canvas_data);
                    }
                } catch (err) { }
            }

            if (restoredState && Array.isArray(restoredState.elements)) {
                try { localStorage.setItem(localCanvasKey, JSON.stringify(restoredState.elements)); } catch (e) { }
                try { await saveCanvasToIndexedDb(canvasId, restoredState); } catch (e) { }
            }

            if (restoredState && restoredState.footerText !== null && restoredState.footerText !== undefined) {
                const ftEl = document.getElementById('footerText');
                if (ftEl) ftEl.innerText = restoredState.footerText;
            }

            if (!restoredState || !Array.isArray(restoredState.elements)) {
                pushHistorySnapshot(collectCanvasState());
                updateUndoRedoButtons();
                await stabilizeAndRevealContentLayer();
                return;
            }

            applyCanvasState(restoredState);
            pushHistorySnapshot(collectCanvasState());
            updateUndoRedoButtons();
            await stabilizeAndRevealContentLayer();
        }
        async function previewPage() {
            if (!saveShareBtn) return;
            const originalText = saveShareBtn.textContent;
            saveShareBtn.disabled = true;
            saveShareBtn.textContent = 'Saving...';

            try {
                await saveCanvasNow();

                const previewUrl = buildPreviewUrl(canvasId);
                let copied = false;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    try {
                        await navigator.clipboard.writeText(previewUrl);
                        copied = true;
                    } catch (error) {
                        copied = false;
                    }
                }

                showStatusToast(copied ? 'Saved. Preview link copied.' : 'Saved.');
            } catch (error) {
                console.error('Save failed:', error);
                showStatusToast('Save failed. Please try again.');
            } finally {
                saveShareBtn.disabled = false;
                saveShareBtn.textContent = originalText;
            }
        }

        window.onkeydown = (e) => {
            const isInput = e.target.tagName === 'INPUT' || e.target.contentEditable === 'true';
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isInput) {
                e.preventDefault();
                if (e.shiftKey) redoAction();
                else undoAction();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !isInput) {
                e.preventDefault();
                redoAction();
                return;
            }
            if (!selectedEl || isInput) return;
            if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); }
            if (e.key.startsWith('Arrow')) {
                e.preventDefault();
                let dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
                let dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
                selectedEl.style.left = (parseInt(selectedEl.style.left) + dx) + 'px';
                selectedEl.style.top = (parseInt(selectedEl.style.top) + dy) + 'px';
                saveCanvas();
            }
        };

        // Missing helper for restoreCanvas
        function stabilizeAndRevealContentLayer() {
            return new Promise(resolve => setTimeout(resolve, 50));
        }

        // INITIALIZATION
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Editor initializing...');

            // Explicitly define global variables if needed (polyfill for existing logic)
            window.addToggleBtn = document.getElementById('addToggleBtn');
            window.stylesToggleBtn = document.getElementById('stylesToggleBtn');
            window.addMenu = document.getElementById('addMenu');
            window.stylesMenu = document.getElementById('stylesMenu');

            // Initialize controls
            if (typeof bindFloatingControls === 'function') bindFloatingControls();

            // Enforce publish modal binding at init.
            const saveShareBtn = document.getElementById('saveShareBtn');
            if (saveShareBtn) {
                saveShareBtn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px"></i> Publish';
                saveShareBtn.onclick = openPublishModal;
            }

            // Restore previous state
            if (typeof restoreCanvas === 'function') restoreCanvas();
        });
    
