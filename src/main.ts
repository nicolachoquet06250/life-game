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
            onStartAuto: () => this.startAutoMode(),
            onStartCustom: () => this.startCustomMode(),
            onToggleRunning: () => this.toggleRunning(),
            onReset: () => this.resetSimulation(),
            onSelectPattern: (p) => this.input.selectedPattern = p,
            onTickRateChange: (rate) => {
                this.tickInterval = 1000 / rate;
            },
            onColorChange: (color) => {
                this.renderer.aliveColor = color;
                this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY);
            },
            onGridToggle: (show) => {
                this.renderer.showGrid = show;
                this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY);
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
                this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY);
            },
            onToricToggle: (isToric) => {
                this.engine.isToric = isToric;
            },
            onExport: () => this.exportGrid(),
            onImport: (json) => this.importGrid(json)
        });

        this.input = new InputHandler(canvas, this.engine, this.renderer, {
            onCameraChange: () => this.checkAndExpandGrid(),
            onToggleCell: (x, y) => this.handleToggleCell(x, y)
        });

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

    startAutoMode() {
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
    }

    startCustomMode() {
        this.running = false;
        this.isCustomMode = true;
        this.generation = 0;
        this.hashHistory = [];
        this.status = 'Normal';
        this.ui.resetStats();
        this.ui.updateRunningStatus(this.running, this.isCustomMode);
        this.ui.createSidebar();
        this.resize();
        this.engine.createGrid(this.appElement.clientWidth, this.appElement.clientHeight, this.input.cellSize, false);
    }

    toggleRunning() {
        if (!this.running) {
            this.hashHistory = [];
            this.status = 'Normal';
        }
        this.running = !this.running;
        this.ui.updateRunningStatus(this.running, this.isCustomMode);
    }

    resetSimulation() {
        this.input.cameraX = 0;
        this.input.cameraY = 0;
        this.generation = 0;
        this.hashHistory = [];
        this.status = 'Normal';
        this.ui.resetStats();
        this.engine.createGrid(this.appElement.clientWidth, this.appElement.clientHeight, this.input.cellSize, !this.isCustomMode);
        this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY);
    }

    handleToggleCell(x: number, y: number) {
        this.hashHistory = [];
        this.status = 'Normal';
        if (this.input.selectedPattern) {
            this.engine.applyPattern(x, y, this.input.selectedPattern);
        } else {
            this.engine.toggleCell(x, y);
        }
        this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY);
    }

    handleKeydown(event: KeyboardEvent): void {
        if (event.code === 'Space') {
            this.toggleRunning();
        }
        if (event.key.toLowerCase() === 'r') {
            this.resetSimulation();
        }
    }

    resize() {
        const width = this.appElement.clientWidth;
        const height = this.appElement.clientHeight;
        this.renderer.setSize(width, height);
        this.checkAndExpandGrid();
        this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY);
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
        this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY);
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
            this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY);
            console.log('Grille importée avec succès');
        } catch (e) {
            console.error('Erreur lors de l\'importation:', e);
            alert('Fichier d\'importation invalide');
        }
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
                this.running = false;
                this.ui.updateRunningStatus(this.running, this.isCustomMode);
            } else {
                this.hashHistory.push(currentHash);
                if (this.hashHistory.length > 1000) {
                    this.hashHistory.shift();
                }
                this.status = 'Normal';
            }

            this.checkAndExpandGrid();
            this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY);
            
            const stats = this.engine.getStats();
            this.ui.updateStats(stats.population, this.generation, stats.density, this.status);
            
            this.lastTick = timestamp;
        } else if (!this.running) {
             // In custom mode or paused, we still want to see the expand effects if we move
             this.renderer.draw(this.engine, this.input.cellSize, this.input.cameraX, this.input.cameraY);
             const stats = this.engine.getStats();
             this.ui.updateStats(stats.population, this.generation, stats.density, this.status);
        }
        requestAnimationFrame((t) => this.loop(t));
    }
}