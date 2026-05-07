import { PATTERNS } from "./constants";

export class UI {
    app: HTMLDivElement;
    onStartAuto: () => void;
    onStartCustom: () => void;
    onToggleRunning: () => void;
    onReset: () => void;
    onSelectPattern: (pattern: number[][] | null) => void;

    constructor(
        app: HTMLDivElement,
        callbacks: {
            onStartAuto: () => void,
            onStartCustom: () => void,
            onToggleRunning: () => void,
            onReset: () => void,
            onSelectPattern: (pattern: number[][] | null) => void
        }
    ) {
        this.app = app;
        this.onStartAuto = callbacks.onStartAuto;
        this.onStartCustom = callbacks.onStartCustom;
        this.onToggleRunning = callbacks.onToggleRunning;
        this.onReset = callbacks.onReset;
        this.onSelectPattern = callbacks.onSelectPattern;
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
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            gap: '20px'
        })

        const title = document.createElement('h1')
        title.textContent = 'Jeu de la Vie'
        overlay.appendChild(title)

        const rulesContainer = document.createElement('div')
        Object.assign(rulesContainer.style, {
            maxWidth: '600px',
            textAlign: 'center',
            marginBottom: '20px',
            fontSize: '16px',
            lineHeight: '1.5',
            color: '#ccc',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        })

        const rulesTitle = document.createElement('h2')
        rulesTitle.textContent = 'Règles du jeu'
        Object.assign(rulesTitle.style, {
            fontSize: '20px',
            color: '#00ff88',
            marginTop: '0',
            marginBottom: '10px'
        })
        rulesContainer.appendChild(rulesTitle)

        const rulesList = document.createElement('ul')
        Object.assign(rulesList.style, {
            listStyleType: 'none',
            padding: '0',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
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
            gap: '20px'
        })

        const autoBtn = this.createButton('Mode Automatique', '#007bff', () => {
            overlay.remove()
            this.onStartAuto()
        })
        const customBtn = this.createButton('Mode Personnalisé', '#28a745', () => {
            overlay.remove()
            this.onStartCustom()
        })

        btnContainer.appendChild(autoBtn)
        btnContainer.appendChild(customBtn)
        overlay.appendChild(btnContainer)
        document.body.appendChild(overlay)
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
        btn.onclick = onClick
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
        switchBtn.onclick = () => {
            const sidebar = document.getElementById('sidebar')
            if (sidebar) {
                sidebar.remove()
                controls.classList.add('no-sidebar')
            } else {
                this.createSidebar()
            }
        }

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
        sidebar.classList.add('visible')
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
        closeBtn.onclick = () => {
            sidebar.remove();
            if (controls) {
                controls.classList.add('no-sidebar');
            }
        };
        sidebar.appendChild(closeBtn);
        
        const sidebarTitle = document.createElement('h2');
        sidebarTitle.textContent = 'Patterns';
        Object.assign(sidebarTitle.style, {
            margin: '0 0 15px 0',
            fontSize: '18px',
            color: '#00ff88'
        });
        sidebar.appendChild(sidebarTitle);

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
        instruction.textContent = 'Cliquez sur un pattern puis sur la carte pour le placer.'
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
            categoryContent.style.display = 'none';

            tab.onclick = () => {
                if (activeTab) {
                    activeTab.style.borderBottomColor = 'transparent';
                    activeTab.style.background = 'transparent';
                }
                const contents = contentContainer.querySelectorAll(':scope > div');
                contents.forEach(c => (c as HTMLElement).style.display = 'none');

                categoryContent.style.display = 'block';
                tab.style.borderBottomColor = '#00ff88';
                tab.style.background = 'rgba(255, 255, 255, 0.05)';
                activeTab = tab;
            };

            tabsContainer.appendChild(tab);

            Object.entries(patterns).forEach(([name, pattern]) => {
                const item = document.createElement('div')
                
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
                item.onclick = () => {
                    const items = sidebar.querySelectorAll('.pattern-item')
                    items.forEach(i => (i as HTMLDivElement).style.borderColor = 'transparent')
                    
                    if (currentSelectedPattern === pattern) {
                        currentSelectedPattern = null
                        this.onSelectPattern(null)
                    } else {
                        currentSelectedPattern = pattern
                        item.style.borderColor = '#00ff88'
                        this.onSelectPattern(pattern)
                    }
                }
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

        const status = document.getElementById('status')
        if (status) {
            status.textContent = running ? '' : 'PAUSED'
        }
    }
}
