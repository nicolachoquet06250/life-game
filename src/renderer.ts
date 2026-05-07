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

    draw(engine: GameEngine, cellSize: number, cameraX: number, cameraY: number): void {
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

        this.ctx.fillStyle = this.aliveColor

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (engine.grid[engine.index(x, y)] === 0) continue

                this.ctx.fillRect(
                    x * cellSize - cameraX,
                    y * cellSize - cameraY,
                    cellSize - 1,
                    cellSize - 1
                )
            }
        }
    }
}
