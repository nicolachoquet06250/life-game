import './style.css'
import { registerSW } from 'virtual:pwa-register'
import { GameEngine } from './engine'
import { Renderer } from './renderer'
import { UI } from './ui'
import { InputHandler } from './input'
import { TICK_RATE, INITIAL_CELL_SIZE } from './constants'

registerSW({ immediate: true })

new class {
    engine: GameEngine;
    renderer: Renderer;
    ui: UI;
    input: InputHandler;
    appElement: HTMLDivElement;
    
    running = false;
    isCustomMode = false;
    lastTick = 0;
    generation = 0;
    tickInterval = 1000 / TICK_RATE;
    hashHistory: string[] = [];
    status: string = 'Normal';

    constructor() {
        const el = document.getElementById('app');
        if (!el) throw new Error('#app introuvable');
        this.appElement = el as HTMLDivElement;

        this.setupAppElement();

        const canvas = document.createElement('canvas');
        this.engine = new GameEngine();
        this.renderer = new Renderer(canvas);
        this.ui = new UI(this.appElement, {
            onStartAuto: (birth, survival) => this.startAutoMode(birth, survival),
            onStartCustom: (birth, survival) => this.startCustomMode(birth, survival),
            onStartMultiState: () => this.startMultiStateMode(),
            onToggleRunning: () => this.toggleRunning(),
            onReset: () => this.resetSimulation(),
            onNextStep: () => this.nextStep(),
            onPreviousStep: () => this.previousStep(),
            onSelectPattern: (p) => {
                this.input.selectedPattern = p;
                if (p) {
                    this.input.mouseMoved = false;
                }
            },
            onUpdateSelectedPattern: (p) => {
                this.input.selectedPattern = p;
            },
            onTickRateChange: (rate) => {
                this.tickInterval = 1000 / rate;
            },
            onColorChange: (color) => {
                this.renderer.aliveColor = color;
                this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
            },
            onGridToggle: (show) => {
                this.renderer.showGrid = show;
                this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
            },
            onBlurChange: (blur) => {
                this.renderer.motionBlur = blur;
            },
            onCellSizeChange: (size) => {
                const oldSize = this.input.cellSize;
                this.input.cellSize = size;
                
                // Adjust camera to keep center of the viewport fixed in "world" coordinates
                const centerX = this.appElement.clientWidth / 2;
                const centerY = this.appElement.clientHeight / 2;
                
                const worldCenterX = (centerX + this.input.cameraX) / oldSize;
                const worldCenterY = (centerY + this.input.cameraY) / oldSize;
                
                this.input.cameraX = worldCenterX * size - centerX;
                this.input.cameraY = worldCenterY * size - centerY;

                this.checkAndExpandGrid();
                this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
            },
            onToricToggle: (isToric) => {
                this.engine.isToric = isToric;
            },
            onExport: () => this.exportGrid(),
            onImport: (json) => this.importGrid(json),
            onRotatePattern: () => this.rotateSelectedPattern(),
            onMirrorHorizontal: () => this.mirrorSelectedPatternHorizontal(),
            onMirrorVertical: () => this.mirrorSelectedPatternVertical(),
            onCopy: () => this.copySelection(),
            onCut: () => this.cutSelection(),
            onPaste: () => this.pasteSelection(),
            onDuplicate: () => this.duplicateSelection(),
            onDelete: () => this.deleteSelection(),
            onGoToMenu: () => {
                this.running = false;
                this.engine.resetSimulation();
                this.generation = 0;
                this.ui.resetStats();
                this.ui.updateRunningStatus(this.running, this.isCustomMode);
                this.ui.createMenuOverlay();
                this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
            },
            onSelectionModeToggle: (isSelectionMode) => {
                this.input.isSelectionMode = isSelectionMode;
            },
            onRulesChange: (birth, survival) => {
                this.engine.birthRules = new Set(birth);
                this.engine.survivalRules = new Set(survival);
                // Si on est en pause, on redessine
                if (!this.running) {
                    this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
                }
                console.log(`Règles mises à jour : B${birth.join('')}/S${survival.join('')}`);
            }
        });

        this.input = new InputHandler(canvas, this.engine, this.renderer, {
            onCameraChange: () => this.checkAndExpandGrid(),
            onToggleCell: (x: number, y: number) => this.handleToggleCell(x, y),
            onSelectionComplete: (start: {x: number, y: number}, end: {x: number, y: number}) => this.handleSelectionComplete(start, end),
            onDragSelection: (dx: number, dy: number, isFinished: boolean) => this.handleDragSelection(dx, dy, isFinished),
            onDelete: () => this.deleteSelection()
        } as any);

        this.appElement.appendChild(canvas);
        
        // Initial setup for canvas and engine
        this.renderer.setSize(this.appElement.clientWidth, this.appElement.clientHeight);
        // We don't initialize the grid here anymore, it's done when choosing the mode

        this.ui.createControls();
        this.ui.createSettingsPanel(TICK_RATE, INITIAL_CELL_SIZE);
        this.ui.createMenuOverlay();

        this.appElement.id = 'app';

        window.addEventListener('resize', () => this.resize());
        
        const observer = new ResizeObserver(() => this.resize());
        observer.observe(this.appElement);

        window.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Context menu and other global listeners
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        requestAnimationFrame((t) => this.loop(t));
    }

    setupAppElement() {
        this.appElement.style.position = 'fixed';
        this.appElement.style.inset = '0';
        this.appElement.style.overflow = 'hidden';
        this.appElement.style.background = '#050505';
    }

    startAutoMode(birth?: number[], survival?: number[]) {
        this.engine.numStates = 2;
        if (birth) this.engine.birthRules = new Set(birth);
        if (survival) this.engine.survivalRules = new Set(survival);
        this.running = true;
        this.isCustomMode = false;
        this.generation = 0;
        this.hashHistory = [];
        this.status = 'Normal';
        this.ui.resetStats();
        this.engine.createGrid(this.appElement.clientWidth, this.appElement.clientHeight, this.input.cellSize, true);
        this.ui.updateRunningStatus(this.running, this.isCustomMode);
        this.ui.onSelectPattern(null);
        this.resize();
        this.updateNavigationUI();
    }

    startCustomMode(birth?: number[], survival?: number[]) {
        this.engine.numStates = 2;
        if (birth) this.engine.birthRules = new Set(birth);
        if (survival) this.engine.survivalRules = new Set(survival);
        this.running = false;
        this.isCustomMode = true;
        this.generation = 0;
        this.hashHistory = [];
        this.status = 'Normal';
        this.ui.resetStats();
        this.ui.updateRunningStatus(this.running, this.isCustomMode);
        this.ui.createSidebar(birth ? Array.from(birth) : undefined, survival ? Array.from(survival) : undefined);
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            // Force reflow
            sidebar.offsetHeight;
            sidebar.classList.add('visible');
            const controls = document.getElementById('controls');
            if (controls) {
                controls.classList.remove('no-sidebar');
            }
        }
        this.resize();
        this.engine.createGrid(this.appElement.clientWidth, this.appElement.clientHeight, this.input.cellSize, false);
        this.updateNavigationUI();
    }

    startMultiStateMode() {
        // Mode "Star Wars" (Generations)
        // B2/S345/4 states
        this.engine.numStates = 4;
        this.engine.birthRules = new Set([2]);
        this.engine.survivalRules = new Set([3, 4, 5]);
        
        this.running = true;
        this.isCustomMode = false;
        this.generation = 0;
        this.hashHistory = [];
        this.status = 'Multi-états';
        this.ui.resetStats();
        this.engine.createGrid(this.appElement.clientWidth, this.appElement.clientHeight, this.input.cellSize, true);
        this.ui.updateRunningStatus(this.running, this.isCustomMode);
        this.ui.onSelectPattern(null);
        this.resize();
        this.updateNavigationUI();
    }

    toggleRunning() {
        if (!this.running) {
            this.hashHistory = [];
            this.status = 'Normal';
        }
        this.running = !this.running;
        this.ui.updateRunningStatus(this.running, this.isCustomMode);
        this.updateNavigationUI();
    }

    nextStep() {
        if (this.running) {
            return;
        }
        this.engine.nextGeneration();
        this.generation++;
        this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
        const stats = this.engine.getStats();
        this.ui.updateStats(stats.population, this.generation, stats.density, this.status);
        this.updateNavigationUI();
    }

    previousStep() {
        if (this.running) {
            return;
        }
        if (this.engine.previousGeneration()) {
            this.generation--;
            this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
            const stats = this.engine.getStats();
            this.ui.updateStats(stats.population, this.generation, stats.density, this.status);
        }
        this.updateNavigationUI();
    }

    resetSimulation() {
        this.input.cameraX = 0;
        this.input.cameraY = 0;
        this.generation = 0;
        this.hashHistory = [];
        this.status = 'Normal';
        this.ui.resetStats();
        this.engine.resetSimulation();
        this.engine.createGrid(this.appElement.clientWidth, this.appElement.clientHeight, this.input.cellSize, !this.isCustomMode);
        this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
        this.updateNavigationUI();
    }

    private updateNavigationUI() {
        this.ui.updateNavigationButtons(
            !this.running && this.engine.history.length > 0,
            !this.running && !this.engine.isStable()
        );
    }

    handleToggleCell(x: number, y: number) {
        this.hashHistory = [];
        this.status = 'Normal';
        if (this.input.selectedPattern) {
            this.engine.applyPattern(x, y, this.input.selectedPattern);
        } else {
            this.engine.toggleCell(x, y);
        }
        this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
        this.updateNavigationUI();
    }

    handleKeydown(event: KeyboardEvent): void {
        if (event.code === 'Space') {
            this.toggleRunning();
        }
        if (event.key === 'ArrowRight') {
            this.nextStep();
        }
        if (event.key === 'ArrowLeft') {
            this.previousStep();
        }
        if (event.key.toLowerCase() === 'c' && (event.ctrlKey || event.metaKey)) {
            this.copySelection();
        }
        if (event.key.toLowerCase() === 'x' && (event.ctrlKey || event.metaKey)) {
            this.cutSelection();
        }
        if (event.key.toLowerCase() === 'v' && (event.ctrlKey || event.metaKey)) {
            this.pasteSelection();
        }
        if (event.key.toLowerCase() === 'd' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            this.duplicateSelection();
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
            this.deleteSelection();
        }
        if (event.key.toLowerCase() === 'r') {
            if (this.input.selectedPattern) {
                this.rotateSelectedPattern();
            } else if (this.getSelection()) {
                this.rotateSelection();
            } else {
                this.resetSimulation();
            }
        }
        if (event.key.toLowerCase() === 'h') {
            if (this.input.selectedPattern) {
                this.mirrorSelectedPatternHorizontal();
            } else if (this.getSelection()) {
                this.mirrorSelectionHorizontal();
            }
        }
        if (event.key.toLowerCase() === 'v') {
            if (this.input.selectedPattern) {
                this.mirrorSelectedPatternVertical();
            } else if (this.getSelection()) {
                this.mirrorSelectionVertical();
            }
        }
    }

    rotateSelectedPattern() {
        if (this.input.selectedPattern) {
            this.input.selectedPattern = this.engine.rotatePattern(this.input.selectedPattern);
            this.ui.onUpdateSelectedPattern?.(this.input.selectedPattern);
        }
    }

    mirrorSelectedPatternHorizontal() {
        if (this.input.selectedPattern) {
            this.input.selectedPattern = this.engine.mirrorHorizontal(this.input.selectedPattern);
            this.ui.onUpdateSelectedPattern?.(this.input.selectedPattern);
        }
    }

    mirrorSelectedPatternVertical() {
        if (this.input.selectedPattern) {
            this.input.selectedPattern = this.engine.mirrorVertical(this.input.selectedPattern);
            this.ui.onUpdateSelectedPattern?.(this.input.selectedPattern);
        }
    }

    rotateSelection() {
        const selection = this.getSelection();
        if (selection) {
            const x1 = selection.start.x;
            const y1 = selection.start.y;
            const x2 = selection.end.x;
            const y2 = selection.end.y;
            const pattern = this.engine.copyPattern(x1, y1, x2, y2);
            this.engine.clearArea(x1, y1, x2, y2, pattern);
            const rotated = this.engine.rotatePattern(pattern);
            this.engine.applyPattern(x1, y1, rotated, false);
            this.input.selectionEnd.x = x1 + rotated[0].length - 1;
            this.input.selectionEnd.y = y1 + rotated.length - 1;
            this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
        }
    }

    mirrorSelectionHorizontal() {
        const selection = this.getSelection();
        if (selection) {
            const x1 = selection.start.x;
            const y1 = selection.start.y;
            const x2 = selection.end.x;
            const y2 = selection.end.y;
            const pattern = this.engine.copyPattern(x1, y1, x2, y2);
            const mirrored = this.engine.mirrorHorizontal(pattern);
            this.engine.applyPattern(x1, y1, mirrored, true);
            this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
        }
    }

    mirrorSelectionVertical() {
        const selection = this.getSelection();
        if (selection) {
            const x1 = selection.start.x;
            const y1 = selection.start.y;
            const x2 = selection.end.x;
            const y2 = selection.end.y;
            const pattern = this.engine.copyPattern(x1, y1, x2, y2);
            const mirrored = this.engine.mirrorVertical(pattern);
            this.engine.applyPattern(x1, y1, mirrored, true);
            this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
        }
    }

    handleSelectionComplete(start: {x: number, y: number}, end: {x: number, y: number}) {
        const x1 = Math.min(start.x, end.x);
        const y1 = Math.min(start.y, end.y);
        const x2 = Math.max(start.x, end.x);
        const y2 = Math.max(start.y, end.y);

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let found = false;

        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                if (this.engine.grid[this.engine.index(x, y)] === 1) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }

        if (found) {
            this.input.selectionStart = { x: minX, y: minY };
            this.input.selectionEnd = { x: maxX, y: maxY };
        } else {
            // No living cells found, clear selection
            this.input.selectionStart = { x: 0, y: 0 };
            this.input.selectionEnd = { x: 0, y: 0 };
        }
        this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
    }

    handleDragSelection(dx: number, dy: number, isFinished: boolean) {
        if (!isFinished) {
            this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
            return;
        }

        const x1 = Math.min(this.input.selectionStart.x, this.input.selectionEnd.x);
        const y1 = Math.min(this.input.selectionStart.y, this.input.selectionEnd.y);
        const x2 = Math.max(this.input.selectionStart.x, this.input.selectionEnd.x);
        const y2 = Math.max(this.input.selectionStart.y, this.input.selectionEnd.y);

        const pattern = this.engine.copyPattern(x1, y1, x2, y2);
        this.engine.clearArea(x1, y1, x2, y2, pattern);
        
        this.input.selectionStart.x += dx;
        this.input.selectionStart.y += dy;
        this.input.selectionEnd.x += dx;
        this.input.selectionEnd.y += dy;

        const nx1 = Math.min(this.input.selectionStart.x, this.input.selectionEnd.x);
        const ny1 = Math.min(this.input.selectionStart.y, this.input.selectionEnd.y);

        this.engine.applyPattern(nx1, ny1, pattern, false);
        this.hashHistory = [];
        this.status = 'Normal';
        this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
    }

    copySelection() {
        if (this.input.isSelecting || (this.input.selectionStart.x === this.input.selectionEnd.x && this.input.selectionStart.y === this.input.selectionEnd.y)) {
            // If currently selecting, we might wait for mouseUp, 
            // but usually we want to copy what's currently defined by start/end
        }
        const pattern = this.engine.copyPattern(
            this.input.selectionStart.x, this.input.selectionStart.y,
            this.input.selectionEnd.x, this.input.selectionEnd.y
        );
        if (pattern.length > 0) {
            this.input.clipboard = pattern;
            console.log('Copié !');
        }
    }

    cutSelection() {
        this.copySelection();
        this.deleteSelection();
    }

    deleteSelection() {
        this.engine.clearArea(
            this.input.selectionStart.x, this.input.selectionStart.y,
            this.input.selectionEnd.x, this.input.selectionEnd.y
        );
        this.hashHistory = [];
        this.status = 'Normal';
        this.renderer.draw(
            this.engine, 
            this.input.cellSize, 
            this.input.cameraX, 
            this.input.cameraY,
            this.input.isSelecting || (this.input.selectionStart.x !== this.input.selectionEnd.x || this.input.selectionStart.y !== this.input.selectionEnd.y) 
                ? { start: this.input.selectionStart, end: this.input.selectionEnd } 
                : undefined
        );
    }

    pasteSelection() {
        if (this.input.clipboard) {
            this.input.selectedPattern = this.input.clipboard;
            this.input.mouseMoved = false; // Show preview at center
        }
    }

    duplicateSelection() {
        this.copySelection();
        this.pasteSelection();
    }

    resize() {
        const width = this.appElement.clientWidth;
        const height = this.appElement.clientHeight;
        this.renderer.setSize(width, height);
        this.checkAndExpandGrid();
        this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
        this.updateNavigationUI();
    }

    checkAndExpandGrid() {
        const { cameraX, cameraY, cellSize } = this.input;
        const { width, height } = this.renderer.canvas;
        const margin = 5;
        
        let addLeft = 0, addRight = 0, addTop = 0, addBottom = 0;

        if (cameraX < margin * cellSize) {
            addLeft = Math.ceil(Math.abs(cameraX) / cellSize) + margin;
        }
        if (cameraX + width > (this.engine.cols - margin) * cellSize) {
            addRight = Math.ceil((cameraX + width - (this.engine.cols - margin) * cellSize) / cellSize) + margin;
        }
        if (cameraY < margin * cellSize) {
            addTop = Math.ceil(Math.abs(cameraY) / cellSize) + margin;
        }
        if (cameraY + height > (this.engine.rows - margin) * cellSize) {
            addBottom = Math.ceil((cameraY + height - (this.engine.rows - margin) * cellSize) / cellSize) + margin;
        }

        if (addLeft > 0 || addRight > 0 || addTop > 0 || addBottom > 0) {
            this.engine.expandGrid(addLeft, addRight, addTop, addBottom);
            this.input.cameraX += addLeft * cellSize;
            this.input.cameraY += addTop * cellSize;
        }
        this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
    }

    exportGrid() {
        const json = this.engine.serialize();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `life-game-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importGrid(json: string) {
        try {
            this.engine.deserialize(json);
            this.generation = 0;
            this.hashHistory = [];
            this.status = 'Normal';
            this.ui.resetStats();
            this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
            this.updateNavigationUI();
            console.log('Grille importée avec succès');
        } catch (e) {
            console.error('Erreur lors de l\'importation:', e);
            alert('Fichier d\'importation invalide');
        }
    }

    getSelection() {
        if (this.input.isSelecting || (this.input.selectionStart.x !== this.input.selectionEnd.x || this.input.selectionStart.y !== this.input.selectionEnd.y)) {
            return { 
                start: this.input.selectionStart, 
                end: this.input.selectionEnd,
                offset: this.input.isDraggingSelection ? this.input.dragOffset : undefined
            };
        }
        return undefined;
    }

    loop(timestamp: number) {
        if (this.running && timestamp - this.lastTick >= this.tickInterval) {
            this.engine.nextGeneration();
            this.generation++;
            
            const currentHash = this.engine.getHash();
            const cycleIndex = this.hashHistory.indexOf(currentHash);
            
            if (cycleIndex !== -1) {
                const cycleLength = this.hashHistory.length - cycleIndex;
                this.status = cycleLength === 1 ? 'Stable' : `Cycle (${cycleLength})`;
                // Don't stop simulation even if stable/cycle detected
                // this.running = false;
                // this.ui.updateRunningStatus(this.running, this.isCustomMode);
            } else {
                this.hashHistory.push(currentHash);
                if (this.hashHistory.length > 1000) {
                    this.hashHistory.shift();
                }
                this.status = 'Normal';
            }

            this.checkAndExpandGrid();
            this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
            
            const stats = this.engine.getStats();
            this.ui.updateStats(stats.population, this.generation, stats.density, this.status);
            
            this.lastTick = timestamp;
        } else if (!this.running) {
             // In custom mode or paused, we still want to see the expand effects if we move
             this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, this.getSelection());
             
             if (this.input.selectedPattern) {
                 let mouseX, mouseY;
                 if (this.input.mouseMoved) {
                     const rect = this.renderer.canvas.getBoundingClientRect();
                     mouseX = this.input.lastMouseX - rect.left;
                     mouseY = this.input.lastMouseY - rect.top;
                 } else {
                     // Center of the viewport (canvas)
                     mouseX = this.renderer.canvas.width / 2;
                     mouseY = this.renderer.canvas.height / 2;
                     
                     // Adjust to center the pattern itself
                     const patternWidth = this.input.selectedPattern[0].length * this.input.cellSize;
                     const patternHeight = this.input.selectedPattern.length * this.input.cellSize;
                     mouseX -= patternWidth / 2;
                     mouseY -= patternHeight / 2;
                 }
                 this.renderer.drawPatternPreview(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY, mouseX, mouseY, this.input.selectedPattern);
             }

             if (this.input.isSelecting) {
                 this.renderer.drawSelection(this.input.cellSize, this.input.cameraX, this.input.cameraY, this.input.selectionStart, this.input.selectionEnd);
             }

             const stats = this.engine.getStats();
             this.ui.updateStats(stats.population, this.generation, stats.density, this.status);
        }
        requestAnimationFrame((t) => this.loop(t));
    }
}