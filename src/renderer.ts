import { GameEngine } from "./engine";

export type Theme = {
    name: string;
    alive: string;
    dead: string;
    grid: string;
}

export const THEMES: Record<string, Theme> = {
    neon: { name: 'Néon', alive: '#00ff88', dead: '#050505', grid: 'rgba(0, 255, 136, 0.1)' },
    classic: { name: 'Classique', alive: '#ffffff', dead: '#000000', grid: 'rgba(255, 255, 255, 0.1)' },
    fire: { name: 'Feu', alive: '#ff4400', dead: '#1a0500', grid: 'rgba(255, 68, 0, 0.1)' },
    ocean: { name: 'Océan', alive: '#0088ff', dead: '#00051a', grid: 'rgba(0, 136, 255, 0.1)' }
}

export class Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    theme: Theme = THEMES.neon;
    aliveColor: string = THEMES.neon.alive;
    showGrid: boolean = false;
    motionBlur: number = 1.0; // 1.0 = no blur, < 1.0 = blur

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Could not get 2d context');
        this.ctx = context;
    }

    setSize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    draw(engine: GameEngine, cellSize: number, cameraX: number, cameraY: number, selection?: {start: {x: number, y: number}, end: {x: number, y: number}, offset?: {x: number, y: number}}): void {
        if (this.motionBlur >= 1.0) {
            this.ctx.fillStyle = this.theme.dead;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.fillStyle = this.theme.dead;
            this.ctx.globalAlpha = this.motionBlur;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.globalAlpha = 1.0;
        }

        const startX = Math.max(0, Math.floor(cameraX / cellSize))
        const startY = Math.max(0, Math.floor(cameraY / cellSize))

        const endX = Math.min(engine.cols, Math.ceil((cameraX + this.canvas.width) / cellSize))
        const endY = Math.min(engine.rows, Math.ceil((cameraY + this.canvas.height) / cellSize))

        if (this.showGrid) {
            this.ctx.strokeStyle = this.theme.grid;
            this.ctx.beginPath();
            for (let x = startX; x <= endX; x++) {
                const px = x * cellSize - cameraX;
                this.ctx.moveTo(px, 0);
                this.ctx.lineTo(px, this.canvas.height);
            }
            for (let y = startY; y <= endY; y++) {
                const py = y * cellSize - cameraY;
                this.ctx.moveTo(0, py);
                this.ctx.lineTo(this.canvas.width, py);
            }
            this.ctx.stroke();
        }

        const selXMin = selection ? Math.min(selection.start.x, selection.end.x) : -1;
        const selXMax = selection ? Math.max(selection.start.x, selection.end.x) : -1;
        const selYMin = selection ? Math.min(selection.start.y, selection.end.y) : -1;
        const selYMax = selection ? Math.max(selection.start.y, selection.end.y) : -1;
        
        const offsetX = (selection && selection.offset) ? selection.offset.x : 0;
        const offsetY = (selection && selection.offset) ? selection.offset.y : 0;

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const state = engine.grid[engine.index(x, y)];
                const isAlive = state === 1;
                const isDying = state > 1;
                const isInSelection = selection && x >= selXMin && x <= selXMax && y >= selYMin && y <= selYMax;
                
                // Si la cellule est dans la sélection et qu'on est en train de déplacer (offset != 0),
                // on ne dessine rien ici (on dessinera la version déplacée après)
                if (isInSelection && (offsetX !== 0 || offsetY !== 0)) {
                    continue;
                }

                if (state > 0) {
                    if (isInSelection) {
                        // On applique une légère transparence pour les cellules sélectionnées
                        this.ctx.globalAlpha = 0.7;
                        this.ctx.fillStyle = this.aliveColor;
                    } else {
                        if (isAlive) {
                            this.ctx.fillStyle = this.aliveColor;
                        } else if (isDying) {
                            // Calcul d'une couleur plus sombre pour les cellules qui vieillissent
                            // Plus l'état est élevé, plus c'est sombre
                            const ratio = (state - 1) / (engine.numStates - 1);
                            this.ctx.fillStyle = this.interpolateColor(this.aliveColor, this.theme.dead, ratio);
                        }
                    }

                    this.ctx.fillRect(
                        x * cellSize - cameraX,
                        y * cellSize - cameraY,
                        cellSize - 1,
                        cellSize - 1
                    );

                    this.ctx.globalAlpha = 1.0;
                }
            }
        }

        // Dessiner la sélection déplacée (preview) si offset présent
        if (selection && (offsetX !== 0 || offsetY !== 0)) {
            this.ctx.fillStyle = this.aliveColor;
            this.ctx.globalAlpha = 0.5;
            for (let y = selYMin; y <= selYMax; y++) {
                for (let x = selXMin; x <= selXMax; x++) {
                    if (engine.grid[engine.index(x, y)] === 1) {
                        this.ctx.fillRect(
                            (x + offsetX) * cellSize - cameraX,
                            (y + offsetY) * cellSize - cameraY,
                            cellSize - 1,
                            cellSize - 1
                        );
                    }
                }
            }
            this.ctx.globalAlpha = 1.0;
        }
    }

    drawPatternPreview(engine: GameEngine, cellSize: number, cameraX: number, cameraY: number, mouseX: number, mouseY: number, pattern: number[][]): void {
        const worldX = Math.floor((mouseX + cameraX) / cellSize);
        const worldY = Math.floor((mouseY + cameraY) / cellSize);

        this.ctx.fillStyle = this.aliveColor;
        this.ctx.globalAlpha = 0.5;

        for (let py = 0; py < pattern.length; py++) {
            for (let px = 0; px < pattern[py].length; px++) {
                if (pattern[py][px] === 1) {
                    const nx = (worldX + px + engine.cols) % engine.cols;
                    const ny = (worldY + py + engine.rows) % engine.rows;

                    this.ctx.fillRect(
                        nx * cellSize - cameraX,
                        ny * cellSize - cameraY,
                        cellSize - 1,
                        cellSize - 1
                    );
                }
            }
        }
        this.ctx.globalAlpha = 1.0;
    }

    private interpolateColor(color1: string, color2: string, ratio: number): string {
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);

        const r2 = color2.startsWith('#') ? parseInt(color2.substring(1, 3), 16) : 0;
        const g2 = color2.startsWith('#') ? parseInt(color2.substring(3, 5), 16) : 0;
        const b2 = color2.startsWith('#') ? parseInt(color2.substring(5, 7), 16) : 0;

        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);

        return `rgb(${r}, ${g}, ${b})`;
    }

    drawSelection(cellSize: number, cameraX: number, cameraY: number, start: {x: number, y: number}, end: {x: number, y: number}, offset?: {x: number, y: number}): void {
        const dx = offset ? offset.x : 0;
        const dy = offset ? offset.y : 0;

        const x1 = (Math.min(start.x, end.x) + dx) * cellSize - cameraX;
        const y1 = (Math.min(start.y, end.y) + dy) * cellSize - cameraY;
        const x2 = (Math.max(start.x, end.x) + dx + 1) * cellSize - cameraX;
        const y2 = (Math.max(start.y, end.y) + dy + 1) * cellSize - cameraY;

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        this.ctx.setLineDash([]);
    }
}
