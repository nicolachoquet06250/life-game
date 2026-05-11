import { PATTERNS } from "./constants";
import { GameEngine } from "./engine";
import { Renderer } from "./renderer";

export class UI {
    app: HTMLDivElement;
    onStartAuto: (birth?: number[], survival?: number[]) => void;
    onStartCustom: (birth?: number[], survival?: number[]) => void;
    onStartMultiState: () => void;
    onToggleRunning: () => void;
    onReset: () => void;
    onNextStep: () => void;
    onPreviousStep: () => void;
    onSelectPattern: (pattern: number[][] | null) => void;
    onUpdateSelectedPattern?: (pattern: number[][] | null) => void;
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
    onGoToMenu: () => void;
    onSelectionModeToggle?: (isSelectionMode: boolean) => void;
    onRulesChange?: (birth: number[], survival: number[]) => void;
    
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
    private prevBtn?: HTMLButtonElement;
    private nextBtn?: HTMLButtonElement;
    private selectionModeActive: boolean = false;
    private selectedPattern: number[][] | null = null;

    constructor(
        app: HTMLDivElement,
        callbacks: {
            onStartAuto: (birth?: number[], survival?: number[]) => void,
            onStartCustom: (birth?: number[], survival?: number[]) => void,
            onStartMultiState: () => void,
            onToggleRunning: () => void,
            onReset: () => void,
            onNextStep: () => void,
            onPreviousStep: () => void,
            onSelectPattern: (pattern: number[][] | null) => void,
            onUpdateSelectedPattern?: (pattern: number[][] | null) => void,
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
            onGoToMenu: () => void,
            onSelectionModeToggle?: (isSelectionMode: boolean) => void,
            onRulesChange?: (birth: number[], survival: number[]) => void
        }
    ) {
        this.app = app;
        this.onStartAuto = (birth, survival) => {
            callbacks.onStartAuto(birth, survival);
        };
        this.onStartCustom = (birth, survival) => {
            callbacks.onStartCustom(birth, survival);
        };
        this.onStartMultiState = callbacks.onStartMultiState;
        this.onToggleRunning = callbacks.onToggleRunning;
        this.onReset = callbacks.onReset;
        this.onNextStep = callbacks.onNextStep;
        this.onPreviousStep = callbacks.onPreviousStep;
        this.onSelectPattern = (p) => {
            this.selectedPattern = p;
            callbacks.onSelectPattern(p);
        };
        this.onUpdateSelectedPattern = (p) => {
            this.selectedPattern = p;
            if (callbacks.onUpdateSelectedPattern) {
                callbacks.onUpdateSelectedPattern(p);
            }
        };
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
        this.onCopy = callbacks.onCopy;
        this.onCut = callbacks.onCut;
        this.onPaste = callbacks.onPaste;
        this.onDuplicate = callbacks.onDuplicate;
        this.onDelete = callbacks.onDelete;
        this.onGoToMenu = callbacks.onGoToMenu;
        this.onSelectionModeToggle = callbacks.onSelectionModeToggle;
        this.onRulesChange = callbacks.onRulesChange;
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

        const tabsContainer = document.createElement('div')
        tabsContainer.id = 'rules-tabs'
        Object.assign(tabsContainer.style, {
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            position: 'relative',
            zIndex: '1',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '10px'
        })
        rulesContainer.appendChild(tabsContainer)

        const classicTabBtn = document.createElement('button')
        classicTabBtn.textContent = 'Classique'
        const multiTabBtn = document.createElement('button')
        multiTabBtn.textContent = 'Multi-états'

        const tabButtonStyle = {
            background: 'none',
            border: 'none',
            color: '#ccc',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            borderRadius: '6px'
        }

        Object.assign(classicTabBtn.style, tabButtonStyle, {
            color: '#00ff88',
            backgroundColor: 'rgba(0, 255, 136, 0.1)'
        })
        Object.assign(multiTabBtn.style, tabButtonStyle)

        tabsContainer.appendChild(classicTabBtn)
        tabsContainer.appendChild(multiTabBtn)

        const classicRulesList = document.createElement('ul')
        const multiRulesList = document.createElement('ul')

        const listStyle = {
            listStyleType: 'none',
            padding: '0',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            position: 'relative',
            zIndex: '1',
            transition: 'all 0.3s ease'
        }

        Object.assign(classicRulesList.style, listStyle)
        Object.assign(multiRulesList.style, listStyle, {
            display: 'none',
            opacity: '0'
        })

        const classicRules = [
            'Une cellule vivante avec moins de deux voisins vivants meurt (sous-population).',
            'Une cellule vivante avec deux ou trois voisins vivants survit.',
            'Une cellule vivante avec plus de trois voisins vivants meurt (surpopulation).',
            'Une cellule morte avec exactement trois voisins vivants devient vivante (reproduction).'
        ]

        const multiRules = [
            'Une cellule morte avec exactement deux voisins vivants devient vivante (état 1).',
            'Une cellule vivante (état 1) survit si elle a 3, 4 ou 5 voisins vivants.',
            'Sinon, elle commence à vieillir (passe à l\'état 2, puis 3).',
            'Après l\'état 3, la cellule meurt et redevient vide (état 0).'
        ]

        classicRules.forEach(ruleText => {
            const li = document.createElement('li')
            li.textContent = ruleText
            classicRulesList.appendChild(li)
        })

        multiRules.forEach(ruleText => {
            const li = document.createElement('li')
            li.textContent = ruleText
            multiRulesList.appendChild(li)
        })

        rulesContainer.appendChild(classicRulesList)
        rulesContainer.appendChild(multiRulesList)

        classicTabBtn.onclick = () => {
            classicTabBtn.style.color = '#00ff88'
            classicTabBtn.style.backgroundColor = 'rgba(0, 255, 136, 0.1)'
            multiTabBtn.style.color = '#ccc'
            multiTabBtn.style.backgroundColor = 'transparent'
            
            classicRulesList.style.display = 'flex'
            setTimeout(() => classicRulesList.style.opacity = '1', 10)
            multiRulesList.style.display = 'none'
            multiRulesList.style.opacity = '0'
        }

        multiTabBtn.onclick = () => {
            multiTabBtn.style.color = '#00ff88'
            multiTabBtn.style.backgroundColor = 'rgba(0, 255, 136, 0.1)'
            classicTabBtn.style.color = '#ccc'
            classicTabBtn.style.backgroundColor = 'transparent'
            
            multiRulesList.style.display = 'flex'
            setTimeout(() => multiRulesList.style.opacity = '1', 10)
            classicRulesList.style.display = 'none'
            classicRulesList.style.opacity = '0'
        }

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

        const autoDropdown = document.createElement('div')
        autoDropdown.id = 'auto-dropdown'
        Object.assign(autoDropdown.style, {
            position: 'relative',
            display: 'inline-block'
        })

        const dropdownContent = document.createElement('div')
        dropdownContent.id = 'auto-dropdown-content'
        Object.assign(dropdownContent.style, {
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            bottom: 'calc(100% + 15px)',
            left: '50%',
            transform: 'translateX(-50%) translateY(10px)',
            width: '220px',
            backgroundColor: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(15px)',
            borderRadius: '12px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            zIndex: '101',
            overflow: 'visible',
            opacity: '0',
            visibility: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: 'none'
        })

        // Petit triangle (caret)
        const caret = document.createElement('div')
        Object.assign(caret.style, {
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '0',
            height: '0',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid rgba(255, 255, 255, 0.1)',
            zIndex: '102'
        })
        const caretInner = document.createElement('div')
        Object.assign(caretInner.style, {
            position: 'absolute',
            bottom: '1px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '0',
            height: '0',
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '7px solid rgba(20, 20, 20, 0.95)',
        })
        caret.appendChild(caretInner)
        dropdownContent.appendChild(caret)

        const autoMainBtn = this.createButton('Mode Automatique', '#007bff', (e) => {
            e.stopPropagation()
            const isVisible = dropdownContent.style.visibility === 'visible'
            
            // Icon animation
            const arrow = autoMainBtn.querySelector('.dropdown-arrow') as HTMLElement
            
            if (isVisible) {
                dropdownContent.style.opacity = '0'
                dropdownContent.style.visibility = 'hidden'
                dropdownContent.style.transform = 'translateX(-50%) translateY(10px)'
                dropdownContent.style.pointerEvents = 'none'
                if (arrow) arrow.style.transform = 'rotate(0deg)'
            } else {
                dropdownContent.style.opacity = '1'
                dropdownContent.style.visibility = 'visible'
                dropdownContent.style.transform = 'translateX(-50%) translateY(0)'
                dropdownContent.style.pointerEvents = 'auto'
                if (arrow) arrow.style.transform = 'rotate(180deg)'
            }
        })
        
        const arrow = document.createElement('span')
        arrow.className = 'dropdown-arrow'
        arrow.innerHTML = '▾'
        Object.assign(arrow.style, {
            display: 'inline-block',
            marginLeft: '8px',
            transition: 'transform 0.3s ease',
            fontSize: '18px'
        })
        autoMainBtn.appendChild(arrow)

        // Close dropdown when clicking outside
        const closeDropdown = (e: MouseEvent) => {
            if (!autoDropdown.contains(e.target as Node)) {
                dropdownContent.style.opacity = '0'
                dropdownContent.style.visibility = 'hidden'
                dropdownContent.style.transform = 'translateX(-50%) translateY(10px)'
                dropdownContent.style.pointerEvents = 'none'
                const arrow = autoMainBtn.querySelector('.dropdown-arrow') as HTMLElement
                if (arrow) arrow.style.transform = 'rotate(0deg)'
            }
        }
        document.addEventListener('click', closeDropdown)

        const classicBtn = this.createButton('', 'transparent', () => {
            document.removeEventListener('click', closeDropdown)
            this.stopMenuBackgroundSimulation()
            overlay.remove()
            this.onStartAuto()
        })
        classicBtn.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <span style="font-weight: 600; font-size: 15px;">Mode classique</span>
                <span style="font-size: 11px; opacity: 0.6; font-weight: normal;">Règles standards (B3/S23)</span>
            </div>
        `
        Object.assign(classicBtn.style, {
            width: '100%',
            textAlign: 'left',
            borderRadius: '0',
            padding: '14px 20px',
            fontSize: '15px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        })
        classicBtn.addEventListener('mouseenter', () => {
            classicBtn.style.backgroundColor = 'rgba(0, 123, 255, 0.15)'
            classicBtn.style.color = '#007bff'
        })
        classicBtn.addEventListener('mouseleave', () => {
            classicBtn.style.backgroundColor = 'transparent'
            classicBtn.style.color = 'white'
        })

        const multiStateBtn = this.createButton('', 'transparent', () => {
            document.removeEventListener('click', closeDropdown)
            this.stopMenuBackgroundSimulation()
            overlay.remove()
            this.onStartMultiState()
        })
        multiStateBtn.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <span style="font-weight: 600; font-size: 15px;">Mode Multi-états</span>
                <span style="font-size: 11px; opacity: 0.6; font-weight: normal;">Cellules avec cycle de vie étendu</span>
            </div>
        `
        Object.assign(multiStateBtn.style, {
            width: '100%',
            textAlign: 'left',
            borderRadius: '0',
            padding: '14px 20px',
            fontSize: '15px'
        })
        multiStateBtn.addEventListener('mouseenter', () => {
            multiStateBtn.style.backgroundColor = 'rgba(253, 126, 20, 0.15)'
            multiStateBtn.style.color = '#fd7e14'
        })
        multiStateBtn.addEventListener('mouseleave', () => {
            multiStateBtn.style.backgroundColor = 'transparent'
            multiStateBtn.style.color = 'white'
        })

        dropdownContent.appendChild(classicBtn)
        dropdownContent.appendChild(multiStateBtn)
        autoDropdown.appendChild(dropdownContent)
        autoDropdown.appendChild(autoMainBtn)

        const customBtn = this.createButton('Mode Personnalisé', '#28a745', () => {
            document.removeEventListener('click', closeDropdown)
            this.stopMenuBackgroundSimulation()
            overlay.remove()
            this.onStartCustom()
        })

        btnContainer.appendChild(autoDropdown)
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

    private createButton(text: string, background: string, onClick: (e: MouseEvent) => void): HTMLButtonElement {
        const btn = document.createElement('button')
        btn.textContent = text
        Object.assign(btn.style, {
            padding: '15px 30px',
            fontSize: '18px',
            cursor: 'pointer',
            background: background,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            transition: 'background-color 0.2s'
        })
        btn.addEventListener('click', (e) => onClick(e));
        return btn
    }

    createControls(): void {
        const controls = document.createElement('div')
        controls.id = 'controls'
        Object.assign(controls.style, {
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            display: 'flex',
            gap: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '10px',
            borderRadius: '8px',
            backdropFilter: 'blur(4px)',
            zIndex: '10',
            width: 'max-content',
            maxWidth: '95vw',
            alignItems: 'center'
        })

        const switchBtn = document.createElement('button')
        switchBtn.id = 'sidebar-switch'
        switchBtn.textContent = '☰'
        switchBtn.title = 'Patterns'
        Object.assign(switchBtn.style, {
            padding: '8px 12px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'block'
        })
        switchBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar')
            if (sidebar) {
                sidebar.classList.toggle('visible')
                if (sidebar.classList.contains('visible')) {
                    controls.classList.remove('no-sidebar')
                } else {
                    controls.classList.add('no-sidebar')
                }
            } else {
                this.createSidebar()
                const newSidebar = document.getElementById('sidebar')
                if (newSidebar) {
                    // Force reflow
                    newSidebar.offsetHeight
                    newSidebar.classList.add('visible')
                }
            }
        });

        const pauseBtn = document.createElement('button')
        pauseBtn.id = 'pause-btn'
        pauseBtn.textContent = '▶'
        pauseBtn.title = 'Play / Pause'
        Object.assign(pauseBtn.style, {
            padding: '8px 12px',
            background: '#00ff88',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            minWidth: '40px'
        })
        pauseBtn.addEventListener('click', this.onToggleRunning)

        const prevBtn = document.createElement('button')
        this.prevBtn = prevBtn
        prevBtn.textContent = '⏮'
        prevBtn.title = 'Previous Step'
        Object.assign(prevBtn.style, {
            padding: '8px 12px',
            background: '#444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'opacity 0.2s'
        })
        prevBtn.addEventListener('click', this.onPreviousStep)

        const nextBtn = document.createElement('button')
        this.nextBtn = nextBtn
        nextBtn.textContent = '⏭'
        nextBtn.title = 'Next Step'
        Object.assign(nextBtn.style, {
            padding: '8px 12px',
            background: '#444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'opacity 0.2s'
        })
        nextBtn.addEventListener('click', this.onNextStep)

        const playbackGroup = document.createElement('div')
        playbackGroup.id = 'playback-group'
        Object.assign(playbackGroup.style, {
            display: 'flex',
            gap: '5px',
            alignItems: 'center'
        })
        playbackGroup.appendChild(prevBtn)
        playbackGroup.appendChild(pauseBtn)
        playbackGroup.appendChild(nextBtn)

        const resetBtn = document.createElement('button')
        resetBtn.textContent = '⟲'
        resetBtn.title = 'Reset'
        Object.assign(resetBtn.style, {
            padding: '8px 12px',
            background: '#444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
        })
        resetBtn.addEventListener('click', this.onReset)
        
        const menuBtn = document.createElement('button')
        menuBtn.textContent = '🏠'
        menuBtn.title = 'Menu Principal'
        Object.assign(menuBtn.style, {
            padding: '8px 12px',
            background: '#444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
        })
        menuBtn.addEventListener('click', this.onGoToMenu)

        controls.appendChild(switchBtn)
        controls.appendChild(menuBtn)
        controls.appendChild(resetBtn)
        controls.appendChild(playbackGroup)
        
        controls.classList.add('no-sidebar')
        document.body.appendChild(controls)
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

    private createRulesEditor(birthRules?: number[], survivalRules?: number[]): HTMLDivElement {
        const presets: Record<string, { birth: number[], survival: number[] }> = {
            'Classique (B3/S23)': { birth: [3], survival: [2, 3] },
            'HighLife (B36/S23)': { birth: [3, 6], survival: [2, 3] },
            'Seeds (B2/S)': { birth: [2], survival: [] },
            'Day & Night (B3678/S34678)': { birth: [3, 6, 7, 8], survival: [3, 4, 6, 7, 8] },
            'Damo (B35678/S5678)': { birth: [3, 5, 6, 7, 8], survival: [5, 6, 7, 8] }
        }

        const editorContainer = document.createElement('div')
        editorContainer.id = 'rules-editor'
        Object.assign(editorContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '20px',
            marginRight: '20px',
            boxSizing: 'border-box'
        })

        const editorTitle = document.createElement('h3')
        editorTitle.textContent = 'Règles (B/S)'
        Object.assign(editorTitle.style, { 
            margin: '0 0 10px 0', 
            color: '#00ff88',
            fontSize: '16px'
        })
        editorContainer.appendChild(editorTitle)

        // Preset selector
        const presetSelect = document.createElement('select')
        Object.assign(presetSelect.style, {
            padding: '5px',
            borderRadius: '4px',
            border: '1px solid #444',
            background: '#222',
            color: 'white',
            width: '100%',
            marginBottom: '10px',
            fontSize: '12px'
        })
        
        const defaultOpt = document.createElement('option')
        defaultOpt.value = ''
        defaultOpt.textContent = '-- Présélections --'
        presetSelect.appendChild(defaultOpt)

        Object.keys(presets).forEach(name => {
            const opt = document.createElement('option')
            opt.value = name
            opt.textContent = name
            if (name === 'Classique (B3/S23)') {
                opt.selected = true;
            }
            presetSelect.appendChild(opt)
        })
        editorContainer.appendChild(presetSelect)

        const createRuleRow = (label: string, activeValues: Set<number>, onUpdate: () => void) => {
            const row = document.createElement('div')
            Object.assign(row.style, {
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                marginBottom: '5px'
            })
            const rowLabel = document.createElement('span')
            rowLabel.textContent = label
            rowLabel.style.fontSize = '12px'
            rowLabel.style.color = '#aaa'
            row.appendChild(rowLabel)

            const btnGrid = document.createElement('div')
            Object.assign(btnGrid.style, {
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '4px'
            })

            const buttons: HTMLButtonElement[] = []
            for (let i = 0; i <= 8; i++) {
                const btn = document.createElement('button')
                btn.textContent = i.toString()
                Object.assign(btn.style, {
                    width: '100%',
                    height: '24px',
                    borderRadius: '3px',
                    border: '1px solid #444',
                    background: activeValues.has(i) ? '#00ff88' : '#333',
                    color: activeValues.has(i) ? 'black' : 'white',
                    cursor: 'pointer',
                    fontSize: '11px',
                    transition: 'all 0.2s',
                    padding: '0'
                })
                btn.onclick = () => {
                    if (activeValues.has(i)) {
                        activeValues.delete(i)
                    } else {
                        activeValues.add(i)
                    }
                    presetSelect.value = ''
                    onUpdate()
                    updateButtonStyles()
                }
                buttons.push(btn)
                btnGrid.appendChild(btn)
            }
            row.appendChild(btnGrid)
            
            const updateButtonStyles = () => {
                buttons.forEach((btn, i) => {
                    const active = activeValues.has(i)
                    btn.style.background = active ? '#00ff88' : '#333'
                    btn.style.color = active ? 'black' : 'white'
                })
            }

            return { row, buttons, updateButtonStyles }
        }

        const currentBirth = new Set(birthRules || [3])
        const currentSurvival = new Set(survivalRules || [2, 3])
        
        const notifyUpdate = () => {
            if (this.onRulesChange) {
                this.onRulesChange(Array.from(currentBirth), Array.from(currentSurvival));
            }
        }
        
        // Initial call to ensure rules are synced
        notifyUpdate();

        const birthRow = createRuleRow('Naissance (B):', currentBirth, notifyUpdate)
        const survivalRow = createRuleRow('Survie (S):', currentSurvival, notifyUpdate)

        editorContainer.appendChild(birthRow.row)
        editorContainer.appendChild(survivalRow.row)

        presetSelect.onchange = () => {
            const preset = presets[presetSelect.value]
            if (preset) {
                currentBirth.clear()
                preset.birth.forEach(n => currentBirth.add(n))
                currentSurvival.clear()
                preset.survival.forEach(n => currentSurvival.add(n))

                birthRow.updateButtonStyles()
                survivalRow.updateButtonStyles()
                notifyUpdate()
            }
        }

        return editorContainer
    }

    createSidebar(birthRules?: number[], survivalRules?: number[]): void {
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
            width: '260px',
            background: '#1a1a1a',
            borderLeft: '1px solid #333',
            color: 'white',
            padding: '20px 0 20px 20px',
            zIndex: '15',
            overflowY: 'auto'
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
            if (sidebar.classList.contains('visible')) {
                sidebar.classList.remove('visible');
                if (controls) {
                    controls.classList.add('no-sidebar');
                }
            } else {
                sidebar.remove();
                if (controls) {
                    controls.classList.add('no-sidebar');
                }
            }
        });
        sidebar.appendChild(closeBtn);
        
        const sidebarTitle = document.createElement('h2');
        sidebarTitle.textContent = 'Configuration';
        Object.assign(sidebarTitle.style, {
            margin: '0 0 15px 0',
            fontSize: '18px',
            color: '#00ff88'
        });
        sidebar.appendChild(sidebarTitle);

        const rulesEditor = this.createRulesEditor(birthRules, survivalRules);
        sidebar.appendChild(rulesEditor);


        const actionsTitle = document.createElement('h2');
        actionsTitle.textContent = 'Actions';
        Object.assign(actionsTitle.style, {
            margin: '20px 0 10px 0',
            fontSize: '18px',
            color: '#00ff88'
        });
        sidebar.appendChild(actionsTitle);

        const transformContainer = document.createElement('div');
        transformContainer.id = 'transform-container';
        Object.assign(transformContainer.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
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

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Supprimer (Suppr)';

        [rotateBtn, mirrorHBtn, mirrorVBtn, copyBtn, cutBtn, pasteBtn, duplicateBtn, selectModeBtn, deleteBtn].forEach(btn => {
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

        rotateBtn.onclick = () => {
            if (this.selectedPattern && this.onRotatePattern) {
                this.onRotatePattern();
                // update local state if main.ts updated it (it should)
            } else {
                this.onRotatePattern?.();
            }
        };
        mirrorHBtn.onclick = () => {
            if (this.selectedPattern && this.onMirrorHorizontal) {
                this.onMirrorHorizontal();
            } else {
                this.onMirrorHorizontal?.();
            }
        };
        mirrorVBtn.onclick = () => {
            if (this.selectedPattern && this.onMirrorVertical) {
                this.onMirrorVertical();
            } else {
                this.onMirrorVertical?.();
            }
        };
        copyBtn.onclick = () => this.onCopy?.();
        cutBtn.onclick = () => this.onCut?.();
        pasteBtn.onclick = () => this.onPaste?.();
        duplicateBtn.onclick = () => this.onDuplicate?.();
        deleteBtn.onclick = () => this.onDelete?.();

        // Initial visual state for selection mode button based on persisted flag
        selectModeBtn.style.background = this.selectionModeActive ? '#00ff88' : '#333';
        selectModeBtn.style.color = this.selectionModeActive ? '#000' : '#fff';

        selectModeBtn.onclick = () => {
            this.selectionModeActive = !this.selectionModeActive;
            selectModeBtn.style.background = this.selectionModeActive ? '#00ff88' : '#333';
            selectModeBtn.style.color = this.selectionModeActive ? '#000' : '#fff';
            this.onSelectionModeToggle?.(this.selectionModeActive);
        };

        sidebar.appendChild(transformContainer);

        const instruction = document.createElement('p')
        instruction.textContent = 'Cliquez pour dessiner. Shift+Drag ou bouton 🎯 pour sélectionner.'
        Object.assign(instruction.style, {
            fontSize: '12px',
            marginBottom: '10px',
            color: '#aaa',
            paddingRight: '20px'
        })
        sidebar.appendChild(instruction)

        const patternTitle = document.createElement('h2');
        patternTitle.textContent = 'Patterns';
        Object.assign(patternTitle.style, {
            margin: '20px 0 10px 0',
            fontSize: '18px',
            color: '#00ff88'
        });
        sidebar.appendChild(patternTitle);

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
        contentContainer.style.minHeight = '120px'; // Hauteur minimum pour éviter l'écrasement sur mobile
        contentContainer.style.flexShrink = '0';

        sidebar.appendChild(tabsContainer);
        sidebar.appendChild(contentContainer);

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
                categoryContent.style.setProperty('display', isMobile ? 'flex' : 'grid', 'important');
                if (!isMobile) {
                    categoryContent.style.gridTemplateColumns = '1fr';
                    categoryContent.style.gap = '10px';
                }
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

                const isSelected = this.selectedPattern === pattern || (this.selectedPattern && pattern && JSON.stringify(this.selectedPattern) === JSON.stringify(pattern));
                Object.assign(item.style, {
                    padding: '10px',
                    margin: '5px 0',
                    background: '#333',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: `2px solid ${isSelected ? '#00ff88' : 'transparent'}`
                })
                item.addEventListener('click', () => {
                    const items = sidebar.querySelectorAll('.pattern-item')
                    
                    if (this.selectedPattern === pattern) {
                        this.selectedPattern = null
                        this.onSelectPattern(null)
                        items.forEach(i => (i as HTMLDivElement).style.borderColor = 'transparent')
                    } else {
                        this.selectedPattern = pattern
                        items.forEach(i => (i as HTMLDivElement).style.borderColor = 'transparent')
                        item.style.borderColor = '#00ff88'
                        this.onSelectPattern(pattern)
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

    updateNavigationButtons(canPrev: boolean, canNext: boolean): void {
        if (this.prevBtn) {
            this.prevBtn.disabled = !canPrev
            this.prevBtn.style.opacity = canPrev ? '1' : '0.3'
            this.prevBtn.style.cursor = canPrev ? 'pointer' : 'not-allowed'
        }
        if (this.nextBtn) {
            this.nextBtn.disabled = !canNext
            this.nextBtn.style.opacity = canNext ? '1' : '0.3'
            this.nextBtn.style.cursor = canNext ? 'pointer' : 'not-allowed'
        }
    }

    updateRunningStatus(running: boolean, isCustomMode: boolean = true): void {
        const pauseBtn = document.getElementById('pause-btn')
        if (pauseBtn) {
            pauseBtn.textContent = running ? '⏸' : '▶'
        }
        
        const switchBtn = document.getElementById('sidebar-switch')
        if (switchBtn) {
            switchBtn.style.setProperty('display', isCustomMode ? 'block' : 'none', isCustomMode ? '' : 'important');
        }

        const settingsToggle = document.getElementById('settings-toggle')
        if (settingsToggle) {
            settingsToggle.style.display = 'flex';
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
            transition: 'all 0.2s ease',
            paddingBottom: '5px'
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
