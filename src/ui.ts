import { PATTERNS } from "./constants";
import { GameEngine } from "./engine";
import { Renderer } from "./renderer";

export class UI {
    app: HTMLDivElement;
    onStartAuto: () => void;
    onStartCustom: () => void;
    onToggleRunning: () => void;
    onReset: () => void;
    onSelectPattern: (pattern: number[][] | null) => void;
    onTickRateChange: (tickRate: number) => void;
    onColorChange: (color: string) => void;
    onGridToggle: (show: boolean) => void;
    onBlurChange: (blur: number) => void;
    onCellSizeChange: (size: number) => void;
    onToricToggle: (isToric: boolean) => void;
    onExport: () => void;
    onImport: (json: string) => void;
    onRotatePattern?: () => void;
    onMirrorHorizontal?: () => void;
    onMirrorVertical?: () => void;
    onCopy?: () => void;
    onCut?: () => void;
    onPaste?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    onSelectionModeToggle?: (isSelectionMode: boolean) => void;
    
    private menuEngine?: GameEngine;
    private menuRenderer?: Renderer;
    private menuLoopId?: number;
    private currentTickRate: number = 12;
    private initialCellSize: number = 8;
    private currentCellSize: number = 8;
    private currentColor: string = '#00ff88';
    private currentBlur: number = 1.0;
    private currentShowGrid: boolean = false;
    private currentIsToric: boolean = true;
    private populationHistory: number[] = [];
    private chartCanvas?: HTMLCanvasElement;

    constructor(
        app: HTMLDivElement,
        callbacks: {
            onStartAuto: () => void,
            onStartCustom: () => void,
            onToggleRunning: () => void,
            onReset: () => void,
            onSelectPattern: (pattern: number[][] | null) => void,
            onTickRateChange: (tickRate: number) => void,
            onColorChange: (color: string) => void,
            onGridToggle: (show: boolean) => void,
            onBlurChange: (blur: number) => void,
            onCellSizeChange: (size: number) => void,
            onToricToggle: (isToric: boolean) => void,
            onExport: () => void,
            onImport: (json: string) => void,
            onRotatePattern?: () => void,
            onMirrorHorizontal?: () => void,
            onMirrorVertical?: () => void,
            onCopy?: () => void,
            onCut?: () => void,
            onPaste?: () => void,
            onDuplicate?: () => void,
            onDelete?: () => void,
            onSelectionModeToggle?: (isSelectionMode: boolean) => void
        }
    ) {
        this.app = app;
        this.onStartAuto = callbacks.onStartAuto;
        this.onStartCustom = callbacks.onStartCustom;
        this.onToggleRunning = callbacks.onToggleRunning;
        this.onReset = callbacks.onReset;
        this.onSelectPattern = callbacks.onSelectPattern;
        this.onTickRateChange = callbacks.onTickRateChange;
        this.onColorChange = callbacks.onColorChange;
        this.onGridToggle = callbacks.onGridToggle;
        this.onBlurChange = callbacks.onBlurChange;
        this.onCellSizeChange = callbacks.onCellSizeChange;
        this.onToricToggle = callbacks.onToricToggle;
        this.onExport = callbacks.onExport;
        this.onImport = callbacks.onImport;
        this.onRotatePattern = callbacks.onRotatePattern;
        this.onMirrorHorizontal = callbacks.onMirrorHorizontal;
        this.onMirrorVertical = callbacks.onMirrorVertical;
        this.onCopy = (callbacks as any).onCopy;
        this.onCut = (callbacks as any).onCut;
        this.onPaste = (callbacks as any).onPaste;
        this.onDuplicate = (callbacks as any).onDuplicate;
        this.onDelete = (callbacks as any).onDelete;
        this.onSelectionModeToggle = (callbacks as any).onSelectionModeToggle;
    }

    createMenuOverlay(): void {
        const overlay = document.createElement('div')
        overlay.id = 'menu-overlay'
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: '100',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            color: 'white',
            maxHeight: '100%',
            overflowY: 'auto',
            padding: '40px 20px',
            boxSizing: 'border-box'
        })

        const title = document.createElement('h1')
        title.textContent = 'Jeu de la Vie'
        Object.assign(title.style, {
            flexShrink: '0',
            margin: '20px 0'
        })
        overlay.appendChild(title)

        const rulesContainer = document.createElement('div')
        rulesContainer.id = 'rules-container'
        Object.assign(rulesContainer.style, {
            maxWidth: '600px',
            width: '100%',
            textAlign: 'center',
            fontSize: '16px',
            lineHeight: '1.5',
            color: '#ccc',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: '0',
            boxSizing: 'border-box'
        })

        const backgroundCanvas = document.createElement('canvas')
        backgroundCanvas.id = 'rules-background-canvas'
        Object.assign(backgroundCanvas.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '0', // Change from -1 to 0 to ensure it's visible relative to rulesContainer
            opacity: '0.3',
            pointerEvents: 'none',
            objectFit: 'contain' // Prevent deformation
        })
        rulesContainer.appendChild(backgroundCanvas)

        const rulesTitle = document.createElement('h2')
        rulesTitle.textContent = 'Règles du jeu'
        Object.assign(rulesTitle.style, {
            fontSize: '20px',
            color: '#00ff88',
            marginTop: '0',
            marginBottom: '10px',
            position: 'relative',
            zIndex: '1'
        })
        rulesContainer.appendChild(rulesTitle)

        const rulesList = document.createElement('ul')
        Object.assign(rulesList.style, {
            listStyleType: 'none',
            padding: '0',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            position: 'relative',
            zIndex: '1'
        })

        const rules = [
            'Une cellule vivante avec moins de deux voisins vivants meurt (sous-population).',
            'Une cellule vivante avec deux ou trois voisins vivants survit.',
            'Une cellule vivante avec plus de trois voisins vivants meurt (surpopulation).',
            'Une cellule morte avec exactement trois voisins vivants devient vivante (reproduction).'
        ]

        rules.forEach(ruleText => {
            const li = document.createElement('li')
            li.textContent = ruleText
            rulesList.appendChild(li)
        })

        rulesContainer.appendChild(rulesList)
        overlay.appendChild(rulesContainer)

        const btnContainer = document.createElement('div')
        btnContainer.id = 'btn-container'
        Object.assign(btnContainer.style, {
            display: 'flex',
            gap: '20px',
            flexShrink: '0',
            margin: '20px 0',
            flexWrap: 'wrap',
            justifyContent: 'center'
        })

        const autoBtn = this.createButton('Mode Automatique', '#007bff', () => {
            this.stopMenuBackgroundSimulation()
            overlay.remove()
            this.onStartAuto()
        })
        const customBtn = this.createButton('Mode Personnalisé', '#28a745', () => {
            this.stopMenuBackgroundSimulation()
            overlay.remove()
            this.onStartCustom()
        })

        btnContainer.appendChild(autoBtn)
        btnContainer.appendChild(customBtn)
        overlay.appendChild(btnContainer)
        document.body.appendChild(overlay)

        this.startMenuBackgroundSimulation(backgroundCanvas)
    }

    private startMenuBackgroundSimulation(canvas: HTMLCanvasElement): void {
        this.menuEngine = new GameEngine()
        this.menuEngine.isToric = this.currentIsToric;
        this.menuRenderer = new Renderer(canvas)
        this.menuRenderer.aliveColor = this.currentColor;
        this.menuRenderer.motionBlur = this.currentBlur;
        this.menuRenderer.showGrid = this.currentShowGrid;
        
        const updateSize = () => {
            const width = canvas.clientWidth
            const height = canvas.clientHeight
            if (width === 0 || height === 0) return

            this.menuRenderer?.setSize(width, height)
            if (this.menuEngine && (this.menuEngine.cols === 0 || this.menuEngine.rows === 0)) {
                this.menuEngine.createGrid(width, height, this.currentCellSize, true)
            }
        }

        // Initial size
        updateSize()

        // Handle resize of the container
        const resizeObserver = new ResizeObserver(() => {
            updateSize()
        })
        resizeObserver.observe(canvas.parentElement || canvas)
        
        let lastTick = 0

        const loop = (timestamp: number) => {
            if (!this.menuLoopId) {
                resizeObserver.disconnect()
                return;
            }

            const tickInterval = 1000 / this.currentTickRate;

            if (timestamp - lastTick >= tickInterval) {
                this.menuEngine?.nextGeneration()
                this.menuRenderer?.draw(this.menuEngine!, this.currentCellSize, 0, 0)
                lastTick = timestamp
            }
            this.menuLoopId = requestAnimationFrame(loop)
        }
        this.menuLoopId = requestAnimationFrame(loop)
    }

    private stopMenuBackgroundSimulation(): void {
        if (this.menuLoopId) {
            cancelAnimationFrame(this.menuLoopId)
            this.menuLoopId = undefined
        }
        this.menuEngine = undefined
        this.menuRenderer = undefined
    }

    private createButton(text: string, background: string, onClick: () => void): HTMLButtonElement {
        const btn = document.createElement('button')
        btn.textContent = text
        Object.assign(btn.style, {
            padding: '15px 30px',
            fontSize: '18px',
            cursor: 'pointer',
            background: background,
            color: 'white',
            border: 'none',
            borderRadius: '8px'
        })
        btn.addEventListener('click', onClick);
        return btn
    }

    createControls(): void {
        const controls = document.createElement('div')
        controls.id = 'controls'
        Object.assign(controls.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '10px',
            borderRadius: '8px',
            backdropFilter: 'blur(4px)',
            zIndex: '10'
        })

        const switchBtn = document.createElement('button')
        switchBtn.id = 'sidebar-switch'
        switchBtn.textContent = 'Patterns'
        Object.assign(switchBtn.style, {
            padding: '8px 16px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'none'
        })
        switchBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar')
            if (sidebar) {
                sidebar.remove()
                controls.classList.add('no-sidebar')
            } else {
                this.createSidebar()
            }
        });

        const pauseBtn = document.createElement('button')
        pauseBtn.id = 'pause-btn'
        pauseBtn.textContent = '▶ Play'
        Object.assign(pauseBtn.style, {
            padding: '8px 16px',
            background: '#00ff88',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
        })
        pauseBtn.addEventListener('click', this.onToggleRunning)

        const resetBtn = document.createElement('button')
        resetBtn.textContent = '⟲ Reset'
        Object.assign(resetBtn.style, {
            padding: '8px 16px',
            background: '#444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
        })
        resetBtn.addEventListener('click', this.onReset)

        const status = document.createElement('div')
        status.id = 'status'
        status.textContent = 'PAUSED'
        Object.assign(status.style, {
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            padding: '0 10px',
            minWidth: '60px'
        })

        controls.appendChild(switchBtn)
        controls.appendChild(pauseBtn)
        controls.appendChild(resetBtn)
        controls.appendChild(status)
        controls.classList.add('no-sidebar')
        this.app.appendChild(controls)
    }

    private createPatternPreview(pattern: number[][]): HTMLCanvasElement {
        const canvas = document.createElement('canvas')
        const cellSize = 4
        const padding = 2
        const rows = pattern.length
        const cols = pattern[0].length
        
        canvas.width = cols * cellSize + padding * 2
        canvas.height = rows * cellSize + padding * 2
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.fillStyle = '#00ff88'
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if (pattern[y][x] === 1) {
                        ctx.fillRect(x * cellSize + padding, y * cellSize + padding, cellSize - 1, cellSize - 1)
                    }
                }
            }
        }
        
        Object.assign(canvas.style, {
            display: 'block',
            margin: '0 auto 10px auto',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '2px'
        })
        
        return canvas
    }

    createSidebar(): void {
        const existing = document.getElementById('sidebar');
        if (existing) return;

        const sidebar = document.createElement('div')
        sidebar.id = 'sidebar'
        // On ne met pas 'visible' tout de suite pour permettre l'animation de slide-up en mobile
        Object.assign(sidebar.style, {
            position: 'fixed',
            right: '0',
            top: '0',
            bottom: '0',
            width: '240px',
            background: '#1a1a1a',
            borderLeft: '1px solid #333',
            color: 'white',
            padding: '20px 0 20px 20px',
            zIndex: '15',
            overflowY: 'hidden'
        })

        const controls = document.getElementById('controls');
        if (controls) {
            controls.classList.remove('no-sidebar');
        }

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.id = 'sidebar-close';
        Object.assign(closeBtn.style, {
            position: 'absolute',
            right: '10px',
            top: '10px',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '5px'
        });
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('visible');
            const onTransitionEnd = (e: TransitionEvent) => {
                if (e.propertyName === 'transform') {
                    sidebar.remove();
                    if (controls) {
                        controls.classList.add('no-sidebar');
                    }
                    sidebar.removeEventListener('transitionend', onTransitionEnd);
                }
            };
            sidebar.addEventListener('transitionend', onTransitionEnd);
            
            // Sécurité si pas de transition (desktop par exemple si on change le style)
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) {
                sidebar.remove();
                if (controls) {
                    controls.classList.add('no-sidebar');
                }
            }
        });
        sidebar.appendChild(closeBtn);
        
        const sidebarTitle = document.createElement('h2');
        sidebarTitle.textContent = 'Patterns';
        Object.assign(sidebarTitle.style, {
            margin: '0 0 15px 0',
            fontSize: '18px',
            color: '#00ff88'
        });
        sidebar.appendChild(sidebarTitle);

        const transformContainer = document.createElement('div');
        transformContainer.id = 'transform-container';
        Object.assign(transformContainer.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '5px',
            marginBottom: '10px',
            paddingRight: '20px'
        });

        const rotateBtn = document.createElement('button');
        rotateBtn.innerHTML = '🔄';
        rotateBtn.title = 'Pivoter (R)';
        const mirrorHBtn = document.createElement('button');
        mirrorHBtn.innerHTML = '↔️';
        mirrorHBtn.title = 'Miroir H (H)';
        const mirrorVBtn = document.createElement('button');
        mirrorVBtn.innerHTML = '↕️';
        mirrorVBtn.title = 'Miroir V (V)';

        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = '📋';
        copyBtn.title = 'Copier (Ctrl+C)';
        const cutBtn = document.createElement('button');
        cutBtn.innerHTML = '✂️';
        cutBtn.title = 'Couper (Ctrl+X)';
        const pasteBtn = document.createElement('button');
        pasteBtn.innerHTML = '📥';
        pasteBtn.title = 'Coller (Ctrl+V)';
        const duplicateBtn = document.createElement('button');
        duplicateBtn.innerHTML = '👯';
        duplicateBtn.title = 'Dupliquer (Ctrl+D)';

        const selectModeBtn = document.createElement('button');
        selectModeBtn.id = 'select-mode-btn';
        selectModeBtn.innerHTML = '🎯';
        selectModeBtn.title = 'Mode Sélection';

        [rotateBtn, mirrorHBtn, mirrorVBtn, copyBtn, cutBtn, pasteBtn, duplicateBtn, selectModeBtn].forEach(btn => {
            btn.classList.add('action-button');
            Object.assign(btn.style, {
                padding: '8px',
                background: '#333',
                border: '1px solid #444',
                color: 'white',
                borderRadius: '4px',
                cursor: 'pointer'
            });
            transformContainer.appendChild(btn);
        });

        rotateBtn.onclick = () => this.onRotatePattern?.();
        mirrorHBtn.onclick = () => this.onMirrorHorizontal?.();
        mirrorVBtn.onclick = () => this.onMirrorVertical?.();
        copyBtn.onclick = () => this.onCopy?.();
        cutBtn.onclick = () => this.onCut?.();
        pasteBtn.onclick = () => this.onPaste?.();
        duplicateBtn.onclick = () => this.onDuplicate?.();

        let isSelectionMode = false;
        selectModeBtn.onclick = () => {
            isSelectionMode = !isSelectionMode;
            selectModeBtn.style.background = isSelectionMode ? '#00ff88' : '#333';
            selectModeBtn.style.color = isSelectionMode ? '#000' : '#fff';
            this.onSelectionModeToggle?.(isSelectionMode);
        };

        sidebar.appendChild(transformContainer);

        const tabsContainer = document.createElement('div');
        tabsContainer.id = 'sidebar-tabs';
        Object.assign(tabsContainer.style, {
            display: 'flex',
            overflowX: 'auto',
            borderBottom: '1px solid #333',
            marginBottom: '10px'
        });

        const contentContainer = document.createElement('div');
        contentContainer.id = 'sidebar-content';
        contentContainer.style.paddingRight = '20px';

        sidebar.appendChild(tabsContainer);
        sidebar.appendChild(contentContainer);

        const instruction = document.createElement('p')
        instruction.textContent = 'Cliquez pour dessiner. Shift+Drag ou bouton 🎯 pour sélectionner.'
        Object.assign(instruction.style, {
            fontSize: '12px',
            marginBottom: '10px',
            color: '#aaa',
            paddingRight: '20px'
        })
        sidebar.insertBefore(instruction, tabsContainer)

        let currentSelectedPattern: number[][] | null = null;
        let activeTab: HTMLElement | null = null;

        Object.entries(PATTERNS).forEach(([category, patterns], index) => {
            const tab = document.createElement('div');
            tab.textContent = category;
            tab.classList.add('tab');
            Object.assign(tab.style, {
                padding: '8px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '14px',
                borderBottom: '2px solid transparent'
            });

            const categoryContent = document.createElement('div');
            categoryContent.style.setProperty('display', 'none', 'important');

            tab.addEventListener('click', () => {
                if (activeTab) {
                    activeTab.style.borderBottomColor = 'transparent';
                    activeTab.style.background = 'transparent';
                }
                const contents = contentContainer.querySelectorAll(':scope > div');
                contents.forEach(c => (c as HTMLElement).style.setProperty('display', 'none', 'important'));

                const isMobile = window.innerWidth <= 768;
                categoryContent.style.setProperty('display', isMobile ? 'flex' : 'block', 'important');
                tab.style.borderBottomColor = '#00ff88';
                tab.style.background = 'rgba(255, 255, 255, 0.05)';
                activeTab = tab;
            });

            tabsContainer.appendChild(tab);

            Object.entries(patterns).forEach(([name, pattern]) => {
                const item = document.createElement('div')
                item.classList.add('pattern-item')
                
                const preview = this.createPatternPreview(pattern)
                item.appendChild(preview)

                const nameEl = document.createElement('div')
                nameEl.textContent = name
                item.appendChild(nameEl)

                Object.assign(item.style, {
                    padding: '10px',
                    margin: '5px 0',
                    background: '#333',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: '2px solid transparent'
                })
                item.addEventListener('click', () => {
                    const items = sidebar.querySelectorAll('.pattern-item')
                    items.forEach(i => (i as HTMLDivElement).style.borderColor = 'transparent')
                    
                    if (currentSelectedPattern === pattern) {
                        currentSelectedPattern = null
                        this.onSelectPattern(null)
                    } else {
                        currentSelectedPattern = pattern
                        item.style.borderColor = '#00ff88'
                        this.onSelectPattern(pattern)
                        
                        // Réinitialiser le flag de mouvement de la souris dans input
                        // (On passe par le callback pour informer main.ts qui gère l'input)
                    }
                })
                item.classList.add('pattern-item');
                categoryContent.appendChild(item)
            })

            contentContainer.appendChild(categoryContent);

            // Activate first tab by default
            if (index === 0) {
                tab.click();
            }
        })

        document.body.insertBefore(sidebar, this.app)

        // Déclencher l'animation d'entrée
        requestAnimationFrame(() => {
            sidebar.classList.add('visible');
        });
    }

    updateRunningStatus(running: boolean, isCustomMode: boolean = true): void {
        const pauseBtn = document.getElementById('pause-btn')
        if (pauseBtn) {
            pauseBtn.textContent = running ? '⏸ Pause' : '▶ Play'
        }
        
        const switchBtn = document.getElementById('sidebar-switch')
        if (switchBtn) {
            switchBtn.style.setProperty('display', isCustomMode ? 'block' : 'none', isCustomMode ? '' : 'important');
        }

        const settingsToggle = document.getElementById('settings-toggle')
        if (settingsToggle) {
            settingsToggle.style.display = 'flex';
        }

        const status = document.getElementById('status')
        if (status) {
            status.textContent = running ? '' : 'PAUSED'
        }
    }

    resetStats(): void {
        this.populationHistory = [];
        if (this.chartCanvas) {
            const ctx = this.chartCanvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, this.chartCanvas.width, this.chartCanvas.height);
        }
    }

    updateStats(population: number, generation: number, density: number, status: string = 'Normal'): void {
        const popEl = document.getElementById('stat-population');
        const genEl = document.getElementById('stat-generation');
        const denEl = document.getElementById('stat-density');
        const statusEl = document.getElementById('stat-status');
        if (popEl) popEl.textContent = population.toString();
        if (genEl) genEl.textContent = generation.toString();
        if (denEl) denEl.textContent = density.toFixed(2) + '%';
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.style.color = status === 'Normal' ? '#00ff88' : '#ffaa00';
        }

        // Update history
        this.populationHistory.push(population);
        if (this.populationHistory.length > 100) {
            this.populationHistory.shift();
        }
        this.drawChart();
    }

    private drawChart(): void {
        if (!this.chartCanvas) return;
        const ctx = this.chartCanvas.getContext('2d');
        if (!ctx) return;

        const width = this.chartCanvas.width;
        const height = this.chartCanvas.height;
        ctx.clearRect(0, 0, width, height);

        if (this.populationHistory.length < 2) return;

        const maxPop = Math.max(...this.populationHistory, 1);
        const minPop = Math.min(...this.populationHistory);
        const range = maxPop - minPop || 1;

        ctx.beginPath();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';

        for (let i = 0; i < this.populationHistory.length; i++) {
            const x = (i / (this.populationHistory.length - 1)) * width;
            const y = height - ((this.populationHistory[i] - minPop) / range) * (height - 10) - 5;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Fill area
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';
        ctx.fill();
    }

    createSettingsPanel(initialTickRate: number, initialCellSize: number): void {
        this.initialCellSize = initialCellSize;
        this.currentCellSize = initialCellSize;
        const panel = document.createElement('div');
        panel.id = 'settings-panel';
        Object.assign(panel.style, {
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '240px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '15px',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: '1000',
            display: 'none',
            flexDirection: 'column',
            gap: '15px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            transform: 'translateY(10px)',
            opacity: '0',
            maxHeight: '80vh',
            overflowY: 'auto'
        });

        const title = document.createElement('div');
        title.textContent = 'Paramètres';
        Object.assign(title.style, {
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#00ff88',
            marginBottom: '5px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '5px'
        });
        panel.appendChild(title);

        // Stats Section
        const statsContainer = document.createElement('div');
        Object.assign(statsContainer.style, {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '5px',
            fontSize: '11px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '5px'
        });
        statsContainer.innerHTML = `
            <div>Pop: <span id="stat-population" style="color: #00ff88">0</span></div>
            <div>Gén: <span id="stat-generation" style="color: #00ff88">0</span></div>
            <div style="grid-column: span 2">Densité: <span id="stat-density" style="color: #00ff88">0%</span></div>
            <div>Etat: <span id="stat-status" style="color: #00ff88">Normal</span></div>
        `;
        panel.appendChild(statsContainer);

        const chartContainer = document.createElement('div');
        Object.assign(chartContainer.style, {
            width: '100%',
            height: '60px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            marginBottom: '5px',
            overflow: 'hidden'
        });
        
        this.chartCanvas = document.createElement('canvas');
        this.chartCanvas.width = 210;
        this.chartCanvas.height = 60;
        this.chartCanvas.style.width = '100%';
        this.chartCanvas.style.height = '100%';
        chartContainer.appendChild(this.chartCanvas);
        panel.appendChild(chartContainer);

        const createRange = (label: string, min: number, max: number, value: number, unit: string, onInput: (v: number) => void) => {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '5px';
            
            const labelEl = document.createElement('div');
            labelEl.style.fontSize = '12px';
            labelEl.innerHTML = `${label}: <span style="color: #00ff88">${value}</span> ${unit}`;
            
            const input = document.createElement('input');
            input.type = 'range';
            input.min = min.toString();
            input.max = max.toString();
            input.value = value.toString();
            Object.assign(input.style, { width: '100%', cursor: 'pointer', accentColor: '#00ff88' });
            
            input.addEventListener('input', (e) => {
                const val = parseFloat((e.target as HTMLInputElement).value);
                labelEl.querySelector('span')!.textContent = val.toString();
                onInput(val);
            });
            
            container.appendChild(labelEl);
            container.appendChild(input);
            return container;
        };

        const createToggle = (label: string, checked: boolean, onChange: (v: boolean) => void) => {
            const container = document.createElement('label');
            Object.assign(container.style, {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                cursor: 'pointer'
            });
            
            const labelEl = document.createElement('span');
            labelEl.textContent = label;
            
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = checked;
            input.style.accentColor = '#00ff88';
            input.addEventListener('change', (e) => onChange((e.target as HTMLInputElement).checked));
            
            container.appendChild(labelEl);
            container.appendChild(input);
            return container;
        };

        // Apparence & Rendu
        panel.appendChild(createRange('Vitesse', 1, 60, initialTickRate, 'gén/s', (v) => {
            this.currentTickRate = v;
            this.onTickRateChange(v);
        }));
        
        // Zoom proportionnel (0.5x à 5x) basé sur INITIAL_CELL_SIZE
        const zoomRange = createRange('Zoom', 50, 500, 100, '%', (v) => {
            const factor = v / 100;
            const newSize = Math.max(1, Math.round(this.initialCellSize * factor));
            this.currentCellSize = newSize;
            this.onCellSizeChange(newSize);
        });
        panel.appendChild(zoomRange);

        panel.appendChild(createRange('Traînée', 0, 90, 0, '%', (v) => {
            this.currentBlur = 1 - v/100;
            if (this.menuRenderer) {
                this.menuRenderer.motionBlur = this.currentBlur;
            }
            this.onBlurChange(this.currentBlur);
        }));

        // Color Picker
        const colorContainer = document.createElement('div');
        Object.assign(colorContainer.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px'
        });
        
        const colorLabel = document.createElement('span');
        colorLabel.textContent = 'Couleur:';
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = '#00ff88';
        Object.assign(colorInput.style, {
            border: 'none',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            background: 'none',
            padding: '0',
            webkitAppearance: 'none'
        });

        // Style for the color swatch to make it square
        const style = document.createElement('style');
        style.textContent = `
            #settings-panel input[type="color"]::-webkit-color-swatch-wrapper {
                padding: 0;
            }
            #settings-panel input[type="color"]::-webkit-color-swatch {
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 0;
            }
            #settings-panel input[type="color"]::-moz-color-swatch {
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 0;
            }
        `;
        document.head.appendChild(style);
        
        colorInput.addEventListener('input', (e) => {
            const color = (e.target as HTMLInputElement).value;
            this.currentColor = color;
            if (this.menuRenderer) {
                this.menuRenderer.aliveColor = color;
            }
            this.onColorChange(color);
        });
        
        colorContainer.appendChild(colorLabel);
        colorContainer.appendChild(colorInput);
        panel.appendChild(colorContainer);

        panel.appendChild(createToggle('Afficher la grille', false, (v) => {
            this.currentShowGrid = v;
            if (this.menuRenderer) {
                this.menuRenderer.showGrid = v;
            }
            this.onGridToggle(v);
        }));
        panel.appendChild(createToggle('Mode Torique', true, (v) => {
            this.currentIsToric = v;
            if (this.menuEngine) {
                this.menuEngine.isToric = v;
            }
            this.onToricToggle(v);
        }));

        // Export/Import Section
        const ioContainer = document.createElement('div');
        Object.assign(ioContainer.style, {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginTop: '10px'
        });

        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Exporter';
        Object.assign(exportBtn.style, {
            padding: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
        });
        exportBtn.onclick = () => this.onExport();

        const importBtn = document.createElement('button');
        importBtn.textContent = 'Importer';
        Object.assign(importBtn.style, {
            padding: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
        });
        importBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        const content = re.target?.result as string;
                        this.onImport(content);
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        };

        ioContainer.appendChild(exportBtn);
        ioContainer.appendChild(importBtn);
        panel.appendChild(ioContainer);

        // Toggle Button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'settings-toggle';
        toggleBtn.innerHTML = '⚙️';
        Object.assign(toggleBtn.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '44px',
            height: '44px',
            borderRadius: '22px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '1001',
            transition: 'all 0.2s ease'
        });

        let isOpen = false;
        toggleBtn.addEventListener('click', () => {
            isOpen = !isOpen;
            if (isOpen) {
                panel.style.display = 'flex';
                panel.offsetHeight;
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
                toggleBtn.style.backgroundColor = '#00ff88';
                toggleBtn.style.color = 'black';
            } else {
                panel.style.opacity = '0';
                panel.style.transform = 'translateY(10px)';
                toggleBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                toggleBtn.style.color = 'white';
                setTimeout(() => {
                    if (!isOpen) panel.style.display = 'none';
                }, 300);
            }
        });

        toggleBtn.addEventListener('mouseenter', () => { if (!isOpen) toggleBtn.style.borderColor = '#00ff88'; });
        toggleBtn.addEventListener('mouseleave', () => { if (!isOpen) toggleBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)'; });

        // Close panel on outside click
        window.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (isOpen && !panel.contains(target) && !toggleBtn.contains(target)) {
                toggleBtn.click();
            }
        });

        document.body.appendChild(panel);
        document.body.appendChild(toggleBtn);
    }
}
