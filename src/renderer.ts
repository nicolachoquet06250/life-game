import { GameEngine } from "./engine";

export class Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

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
        this.ctx.fillStyle = '#050505'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        this.ctx.fillStyle = '#00ff88'

        const startX = Math.max(0, Math.floor(cameraX / cellSize))
        const startY = Math.max(0, Math.floor(cameraY / cellSize))

        const endX = Math.min(engine.cols, Math.ceil((cameraX + this.canvas.width) / cellSize))
        const endY = Math.min(engine.rows, Math.ceil((cameraY + this.canvas.height) / cellSize))

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
