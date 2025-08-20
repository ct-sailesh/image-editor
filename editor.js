const MyImageEditor = (function() {

    // --- Private State ---
    let editorInstance = null;
    let isInitialized = false;

    // --- HTML Template for the Editor ---
    const HTML_TEMPLATE = `
        <div id="imageEditorModal" class="image-editor-modal">
            <div class="editor-container">
                <div class="editor-header">
                    <h2 class="editor-title">Image Editor</h2>
                    <button class="close-btn" onclick="MyImageEditor.close()">&times;</button>
                </div>
                
                <div class="editor-toolbar">
                    <button class="tool-btn" data-tool="crop">📐 Crop</button>
                    <button class="tool-btn" data-tool="blur">🌀 Blur</button>
                    <button class="tool-btn" data-tool="logo">🖼️ Logo</button>
                    <div class="divider"></div>
                    <div id="logoUploadContainer" class="tool-options">
                        <div class="upload-area" id="logoUpload">
                            Click or drop new logo
                            <input type="file" class="file-input" id="logoInput" accept="image/*">
                        </div>
                    </div>
                    <div id="blurToolOptions" class="tool-options">
                        <label for="blurStrength">Strength:</label>
                        <input type="range" id="blurStrength" min="2" max="30" value="10" step="1">
                    </div>
                </div>

                <div class="editor-body">
                    <div class="canvas-container" id="canvasContainer">
                        <canvas id="mainCanvas"></canvas>
                        <div id="cropOverlay"></div>
                    </div>

                    <div class="preview-section">
                        <h3 class="preview-title">Preview</h3>
                        <div class="preview-container"><canvas id="previewCanvas"></canvas></div>
                        <div class="action-buttons">
                            <button class="btn btn-primary" onclick="MyImageEditor.download()">Download Image</button>
                            <button class="tool-btn" id="undoBtn" disabled style="justify-content: center;">↶ Undo</button>
                            <button class="tool-btn" id="resetBtn" style="justify-content: center;">🔄 Reset All</button>
                            <button class="btn btn-secondary" onclick="MyImageEditor.close()">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- CSS Styles for the Editor ---
    const CSS_STYLES = `
        :root {
            --primary-color: #4f46e5; --primary-hover: #4338ca; --border-color: #e5e7eb;
            --bg-light: #f9fafb; --bg-main: #f3f4f6; --text-dark: #111827; --text-light: #4b5563;
        }
        .image-editor-modal {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.8); z-index: 10000; backdrop-filter: blur(8px);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .image-editor-modal.active { display: flex; align-items: center; justify-content: center; }
        .image-editor-modal * { box-sizing: border-box; }
        .editor-container {
            width: 95vw; height: 90vh; background: white; border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); overflow: hidden; display: flex; flex-direction: column;
        }
        .editor-header {
            padding: 12px 24px; border-bottom: 1px solid var(--border-color); display: flex; 
            justify-content: space-between; align-items: center; background: white; flex-shrink: 0;
        }
        .editor-title { font-size: 18px; font-weight: 600; color: var(--text-dark); }
        .close-btn {
            background: none; border: none; color: var(--text-light); width: 32px; height: 32px; border-radius: 50%; 
            cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; font-size: 24px;
        }
        .close-btn:hover { background-color: var(--bg-main); }
        .editor-toolbar {
            padding: 8px 16px; border-bottom: 1px solid var(--border-color); background: var(--bg-light);
            display: flex; flex-wrap: wrap; align-items: center; gap: 8px; flex-shrink: 0;
        }
        .tool-btn {
            padding: 8px 14px; border: 1px solid transparent; background: none; border-radius: 8px; cursor: pointer;
            transition: all 0.2s; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 8px; color: var(--text-light);
        }
        .tool-btn:hover { background: #eef2ff; color: var(--primary-color); }
        .tool-btn.active { background: var(--primary-color); color: white; }
        .tool-btn:disabled { background: #e5e7eb; color: #9ca3af; cursor: not-allowed; }
        .divider { width: 1px; height: 24px; background: var(--border-color); margin: 0 8px; }
        .tool-options { display: none; align-items: center; gap: 8px; }
        .tool-options label { font-size: 14px; color: var(--text-light); }
        .tool-options input[type="range"] { accent-color: var(--primary-color); }
        .upload-area {
            border: 2px dashed var(--border-color); border-radius: 8px; padding: 12px; text-align: center;
            cursor: pointer; transition: all 0.2s; color: var(--text-light);
        }
        .upload-area:hover, .upload-area.dragover { border-color: var(--primary-color); background: #eef2ff; }
        .file-input { display: none; }
        .editor-body { display: flex; flex: 1; min-height: 0; background: var(--bg-main); }
        .canvas-container { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; padding: 20px; overflow: hidden; }
        #mainCanvas {
            max-width: 100%; max-height: 100%; border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
            background: white; cursor: default;
        }
        #cropOverlay {
            display: none; position: absolute; border: 1px solid white;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5); pointer-events: none;
        }
        .preview-section {
            width: 280px; background: white; border-left: 1px solid var(--border-color); padding: 24px;
            display: flex; flex-direction: column; flex-shrink: 0;
        }
        .preview-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--text-dark); }
        .preview-container {
            flex: 1; background: var(--bg-main); border-radius: 8px; padding: 10px;
            display: flex; align-items: center; justify-content: center; margin-bottom: 24px;
        }
        #previewCanvas { max-width: 100%; max-height: 100%; border-radius: 4px; }
        .action-buttons { display: flex; flex-direction: column; gap: 12px; margin-top: auto; }
        .btn { padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 14px; }
        .btn-primary { background: var(--primary-color); color: white; }
        .btn-primary:hover { background: var(--primary-hover); }
        .btn-secondary { background: #e5e7eb; color: #374151; }
        .btn-secondary:hover { background: #d1d5db; }
    `;

    // --- Core Image Editor Class (Internal) ---
    class ImageEditor {
        constructor() {
            // DOM element references are set in the `connectToDOM` method
            this.connectToDOM();
            this.initInternalState();
            this.setupEventListeners();
        }

        connectToDOM() {
            this.canvas = document.getElementById('mainCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.editCanvas = document.createElement('canvas');
            this.editCtx = this.editCanvas.getContext('2d');
            this.previewCanvas = document.getElementById('previewCanvas');
            this.previewCtx = this.previewCanvas.getContext('2d');
            this.logoUploadContainer = document.getElementById('logoUploadContainer');
            this.blurToolOptions = document.getElementById('blurToolOptions');
        }

        initInternalState() {
            this.originalImage = null; this.currentImage = null;
            this.history = []; this.historyIndex = -1; this.maxHistory = 20;
            this.currentTool = null; this.isDrawing = false; this.isMovingLogo = false; this.isResizingLogo = false;
            this.startX = 0; this.startY = 0;
            this.blurAreas = []; this.blurStrength = 10;
            this.logos = []; this.selectedLogo = null; this.resizeHandleSize = 12;
        }
        
        // ... (All methods from the previous ImageEditor class are pasted here) ...
        // Note: No changes are needed inside the class itself.
        // It's self-contained and will work once connected to the DOM.

        setupEventListeners() {
            document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => btn.addEventListener('click', (e) => this.selectTool(e.currentTarget.dataset.tool)));
            this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
            window.addEventListener('mousemove', this.handleMouseMove.bind(this));
            window.addEventListener('mouseup', this.handleMouseUp.bind(this));
            this.canvas.addEventListener('mouseleave', () => this.updateCursor('default'));
            const logoUpload = document.getElementById('logoUpload');
            const logoInput = document.getElementById('logoInput');
            logoUpload.addEventListener('click', () => logoInput.click());
            logoUpload.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); });
            logoUpload.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('dragover'));
            logoUpload.addEventListener('drop', this.handleLogoDrop.bind(this));
            logoInput.addEventListener('change', this.handleLogoUpload.bind(this));
            document.getElementById('blurStrength').addEventListener('input', (e) => { this.blurStrength = parseInt(e.target.value, 10); });
            document.getElementById('resetBtn').addEventListener('click', this.resetImage.bind(this));
            document.getElementById('undoBtn').addEventListener('click', this.undo.bind(this));
            document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); this.undo(); } });
        }
        loadImage(imageSrc) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => { this.originalImage = img; this.setImage(img, true); resolve(); };
                img.onerror = reject;
                img.src = imageSrc;
            });
        }
        setImage(image, isInitialLoad = false) {
            this.currentImage = image;
            if (isInitialLoad) { this.blurAreas = []; this.logos = []; this.selectedLogo = null; }
            this.setupCanvases();
            if (isInitialLoad) this.saveState();
        }
        setImageAfterCrop(croppedImg) {
            this.currentImage = croppedImg;
            this.editCanvas.width = croppedImg.width; this.editCanvas.height = croppedImg.height;
            this.blurAreas = []; this.logos = [];
            this.setupCanvases(); this.saveState();
        }
        resetImage() { if (confirm('Are you sure you want to discard all changes?')) this.setImage(this.originalImage, true); }
        setupCanvases() {
            this.editCanvas.width = this.currentImage.width; this.editCanvas.height = this.currentImage.height;
            const container = document.getElementById('canvasContainer');
            const containerRect = container.getBoundingClientRect();
            const maxWidth = containerRect.width - 40; const maxHeight = containerRect.height - 40;
            const imgAspect = this.currentImage.width / this.currentImage.height;
            let canvasWidth = maxWidth; let canvasHeight = maxWidth / imgAspect;
            if (canvasHeight > maxHeight) { canvasHeight = maxHeight; canvasWidth = maxHeight * imgAspect; }
            this.canvas.width = canvasWidth; this.canvas.height = canvasHeight;
            this.redraw();
        }
        redraw() {
            this.editCtx.clearRect(0, 0, this.editCanvas.width, this.editCanvas.height);
            this.editCtx.drawImage(this.currentImage, 0, 0);
            const scaleX = this.editCanvas.width / this.canvas.width; const scaleY = this.editCanvas.height / this.canvas.height;
            this.blurAreas.forEach(area => this.applyBlur(this.editCtx, { x: area.x * scaleX, y: area.y * scaleY, width: area.width * scaleX, height: area.height * scaleY }, area.strength));
            this.logos.forEach(logo => this.editCtx.drawImage(logo.image, logo.x * scaleX, logo.y * scaleY, logo.width * scaleX, logo.height * scaleY));
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.editCanvas, 0, 0, this.canvas.width, this.canvas.height);
            if (this.currentTool === 'logo' && this.selectedLogo) this.drawLogoSelection(this.selectedLogo);
            this.updatePreview();
        }
        selectTool(tool) {
            const isSameTool = this.currentTool === tool;
            if (this.currentTool) document.querySelector(`.tool-btn[data-tool="${this.currentTool}"]`).classList.remove('active');
            this.logoUploadContainer.style.display = 'none'; this.blurToolOptions.style.display = 'none';
            this.canvas.style.cursor = 'default'; this.selectedLogo = null; this.hideOverlays();
            this.currentTool = isSameTool ? null : tool;
            if (this.currentTool) {
                document.querySelector(`.tool-btn[data-tool="${this.currentTool}"]`).classList.add('active');
                if (this.currentTool === 'logo') this.logoUploadContainer.style.display = 'flex';
                if (this.currentTool === 'blur') this.blurToolOptions.style.display = 'flex';
                if (this.currentTool === 'crop') this.canvas.style.cursor = 'crosshair';
            }
            this.redraw();
        }
        handleMouseDown(e) {
            if (e.target !== this.canvas || !this.currentTool) return;
            const rect = this.canvas.getBoundingClientRect();
            this.startX = e.clientX - rect.left; this.startY = e.clientY - rect.top;
            this.isDrawing = true;
            if (this.currentTool === 'crop') this.showCropOverlay();
            else if (this.currentTool === 'logo') {
                if (this.selectedLogo) {
                    const handle = this.getResizeHandleRect(this.selectedLogo);
                    if (this.isPointInRect(this.startX, this.startY, handle)) { this.isResizingLogo = true; return; }
                }
                let clickedOnLogo = false;
                for (let i = this.logos.length - 1; i >= 0; i--) {
                    if (this.isPointInRect(this.startX, this.startY, this.logos[i])) {
                        this.selectedLogo = this.logos[i]; this.isMovingLogo = true; clickedOnLogo = true;
                        this.redraw(); return;
                    }
                }
                if (!clickedOnLogo) { this.selectedLogo = null; this.redraw(); }
            }
        }
        handleMouseMove(e) {
            const rect = this.canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left; const currentY = e.clientY - rect.top;
            if (this.isDrawing) {
                if (this.isResizingLogo) this.resizeSelectedLogo(currentX, currentY);
                else if (this.isMovingLogo) {
                    const deltaX = currentX - this.startX; const deltaY = currentY - this.startY;
                    this.moveSelectedLogo(deltaX, deltaY);
                    this.startX = currentX; this.startY = currentY;
                } else if (this.currentTool === 'crop') this.updateCropOverlay(this.startX, this.startY, currentX, currentY);
                else if (this.currentTool === 'blur') {
                    this.redraw();
                    const rect = { x: this.startX, y: this.startY, width: currentX - this.startX, height: currentY - this.startY };
                    this.ctx.fillStyle = 'rgba(79, 70, 229, 0.3)'; this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
                    this.ctx.strokeStyle = 'rgba(79, 70, 229, 0.8)'; this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
                }
            } else this.updateCursor(currentX, currentY);
        }
        handleMouseUp(e) {
            if (!this.isDrawing) return;
            this.isDrawing = false;
            if (this.isResizingLogo || this.isMovingLogo) this.saveState();
            this.isMovingLogo = false; this.isResizingLogo = false;
            const rect = this.canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left; const endY = e.clientY - rect.top;
            if (this.currentTool === 'crop') this.applyCrop(this.startX, this.startY, endX, endY);
            else if (this.currentTool === 'blur') this.addBlurArea(this.startX, this.startY, endX, endY);
        }
        updateCursor(x, y) {
            if (this.isDrawing) return;
            let cursor = 'default';
            if (this.currentTool === 'crop') cursor = 'crosshair';
            else if (this.currentTool === 'logo') {
                if (this.selectedLogo) {
                    const handle = this.getResizeHandleRect(this.selectedLogo);
                    if (this.isPointInRect(x, y, handle)) cursor = 'se-resize';
                }
                if (cursor === 'default') {
                    for (let i = this.logos.length - 1; i >= 0; i--) { if (this.isPointInRect(x, y, this.logos[i])) { cursor = 'move'; break; } }
                }
            }
            this.canvas.style.cursor = cursor;
        }
        showCropOverlay() { document.getElementById('cropOverlay').style.display = 'block'; }
        hideOverlays() { document.getElementById('cropOverlay').style.display = 'none'; }
        updateCropOverlay(x1, y1, x2, y2) {
            const overlay = document.getElementById('cropOverlay');
            overlay.style.left = this.canvas.offsetLeft + Math.min(x1, x2) + 'px';
            overlay.style.top = this.canvas.offsetTop + Math.min(y1, y2) + 'px';
            overlay.style.width = Math.abs(x2 - x1) + 'px';
            overlay.style.height = Math.abs(y2 - y1) + 'px';
        }
        applyCrop(x1, y1, x2, y2) {
            this.hideOverlays();
            const rect = { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
            if (rect.width < 10 || rect.height < 10) return;
            const scaleX = this.editCanvas.width / this.canvas.width; const scaleY = this.editCanvas.height / this.canvas.height;
            let sourceX = Math.floor(rect.x * scaleX); let sourceY = Math.floor(rect.y * scaleY);
            let sourceWidth = Math.floor(rect.width * scaleX); let sourceHeight = Math.floor(rect.height * scaleY);
            if (sourceX < 0) sourceX = 0; if (sourceY < 0) sourceY = 0;
            if (sourceX + sourceWidth > this.editCanvas.width) sourceWidth = this.editCanvas.width - sourceX;
            if (sourceY + sourceHeight > this.editCanvas.height) sourceHeight = this.editCanvas.height - sourceY;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = sourceWidth; tempCanvas.height = sourceHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(this.editCanvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
            const croppedImage = new Image();
            croppedImage.onload = () => this.setImageAfterCrop(croppedImage);
            croppedImage.src = tempCanvas.toDataURL();
        }
        addBlurArea(x1, y1, x2, y2) {
            const area = { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1), strength: this.blurStrength };
            if (area.width < 5 || area.height < 5) { this.redraw(); return; }
            this.blurAreas.push(area); this.redraw(); this.saveState();
        }
        applyBlur(ctx, area, strength) {
            if (area.width <= 0 || area.height <= 0) return;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = area.width; tempCanvas.height = area.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(this.editCanvas, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
            tempCtx.filter = `blur(${strength}px)`;
            tempCtx.drawImage(tempCanvas, 0, 0);
            ctx.drawImage(tempCanvas, area.x, area.y);
        }
        handleLogoDrop(e) { e.preventDefault(); e.currentTarget.classList.remove('dragover'); if (e.dataTransfer.files.length) this.processLogoFile(e.dataTransfer.files[0]); }
        handleLogoUpload(e) { if (e.target.files.length) this.processLogoFile(e.target.files[0]); e.target.value = ''; }
        processLogoFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const logoSize = Math.min(150, this.canvas.width / 4); const aspectRatio = img.height / img.width;
                    const newLogo = { image: img, x: 20, y: 20, width: logoSize, height: logoSize * aspectRatio, aspectRatio };
                    this.logos.push(newLogo); this.selectedLogo = newLogo;
                    this.redraw(); this.saveState();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
        drawLogoSelection(logo) {
            this.ctx.strokeStyle = 'var(--primary-color)'; this.ctx.lineWidth = 2;
            this.ctx.strokeRect(logo.x, logo.y, logo.width, logo.height);
            const handle = this.getResizeHandleRect(logo);
            this.ctx.fillStyle = 'var(--primary-color)'; this.ctx.fillRect(handle.x, handle.y, handle.width, handle.height);
        }
        moveSelectedLogo(dx, dy) {
            if (!this.selectedLogo) return;
            this.selectedLogo.x += dx; this.selectedLogo.y += dy;
            this.selectedLogo.x = Math.max(0, Math.min(this.selectedLogo.x, this.canvas.width - this.selectedLogo.width));
            this.selectedLogo.y = Math.max(0, Math.min(this.selectedLogo.y, this.canvas.height - this.selectedLogo.height));
            this.redraw();
        }
        resizeSelectedLogo(mouseX, mouseY) {
            if (!this.selectedLogo) return;
            const minSize = 20; let newWidth = Math.max(minSize, mouseX - this.selectedLogo.x);
            if (this.selectedLogo.x + newWidth > this.canvas.width) newWidth = this.canvas.width - this.selectedLogo.x;
            this.selectedLogo.width = newWidth; this.selectedLogo.height = newWidth * this.selectedLogo.aspectRatio;
            this.redraw();
        }
        isPointInRect(x, y, rect) { return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height; }
        getResizeHandleRect(logo) { const s = this.resizeHandleSize; return { x: logo.x + logo.width - s/2, y: logo.y + logo.height - s/2, width: s, height: s }; }
        updatePreview() {
            const size = 250;
            this.previewCanvas.width = size; this.previewCanvas.height = size * (this.editCanvas.height / this.editCanvas.width);
            this.previewCtx.drawImage(this.editCanvas, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
        }
        saveState() {
            if (this.historyIndex < this.history.length - 1) this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push({
                imageSrc: this.currentImage.src,
                blurAreas: JSON.parse(JSON.stringify(this.blurAreas)),
                logos: this.logos.map(l => ({ ...l, imageSrc: l.image.src }))
            });
            if (this.history.length > this.maxHistory) { this.history.shift(); }
            this.historyIndex = this.history.length - 1;
            this.updateUndoButton();
        }
        async undo() {
            if (this.historyIndex <= 0) return;
            this.historyIndex--;
            await this.loadState(this.history[this.historyIndex]);
        }
        async loadState(state) {
            const image = await new Promise(res => { const i = new Image(); i.crossOrigin="anonymous"; i.onload = () => res(i); i.src = state.imageSrc; });
            const logos = await Promise.all(state.logos.map(l => new Promise(res => { const i = new Image(); i.crossOrigin="anonymous"; i.onload = () => res({ ...l, image: i }); i.src = l.imageSrc; })));
            this.currentImage = image; this.blurAreas = JSON.parse(JSON.stringify(state.blurAreas)); this.logos = logos;
            this.setupCanvases(); this.updateUndoButton();
        }
        updateUndoButton() { document.getElementById('undoBtn').disabled = this.historyIndex <= 0; }
        downloadImage() {
            const link = document.createElement('a'); link.download = 'edited-image.png';
            link.href = this.editCanvas.toDataURL('image/png'); link.click();
        }
        resetForNewLoad() {
            if (this.currentTool) this.selectTool(this.currentTool);
            this.history = []; this.historyIndex = -1;
            this.updateUndoButton();
        }
    }

    // --- Private Initialization Method ---
    function _init() {
        if (isInitialized) return;

        // Inject CSS
        const styleElement = document.createElement('style');
        styleElement.textContent = CSS_STYLES;
        document.head.appendChild(styleElement);

        // Inject HTML
        const editorWrapper = document.createElement('div');
        editorWrapper.innerHTML = HTML_TEMPLATE;
        document.body.appendChild(editorWrapper.firstElementChild);

        // Create the single editor instance
        editorInstance = new ImageEditor();

        isInitialized = true;
    }

    // --- Public API ---
    return {
        open: function(imageUrl) {
            _init(); // Ensures DOM and CSS are ready
            const modal = document.getElementById('imageEditorModal');
            modal.classList.add('active');

            editorInstance.resetForNewLoad();
            editorInstance.loadImage(imageUrl).catch(err => {
                console.error('Failed to load image:', err);
                alert('Failed to load the image. Please check the URL and browser console.');
                this.close();
            });
        },

        close: function() {
            if (!isInitialized) return;
            const modal = document.getElementById('imageEditorModal');
            modal.classList.remove('active');
        },

        download: function() {
            if (editorInstance) {
                editorInstance.downloadImage();
            }
        }
    };
})();