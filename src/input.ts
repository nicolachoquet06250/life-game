import { GameEngine } from "./engine";
import { Renderer } from "./renderer";

export class InputHandler {
    canvas: HTMLCanvasElement;
    engine: GameEngine;
    renderer: Renderer;

    cameraX = 0;
    cameraY = 0;
    cellSize = 8;

    isMouseDown = false;
    isPanning = false;
    hasMoved = false;
    lastMouseX = 0;
    lastMouseY = 0;
    lastToggledIndex = -1;
    lastTouchDistance = 0;

    selectedPattern: number[][] | null = null;

    onCameraChange: () => void;
    onToggleCell: (x: number, y: number) => void;

    constructor(
        canvas: HTMLCanvasElement,
        engine: GameEngine,
        renderer: Renderer,
        callbacks: {
            onCameraChange: () => void,
            onToggleCell: (x: number, y: number) => void
        }
    ) {
        this.canvas = canvas;
        this.engine = engine;
        this.renderer = renderer;
        this.onCameraChange = callbacks.onCameraChange;
        this.onToggleCell = callbacks.onToggleCell;

        this.initListeners();
    }

    private initListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    }

    private handleMouseDown(event: MouseEvent): void {
        if (event.button === 0) {
            this.isMouseDown = true;
            this.hasMoved = false;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        } else if (event.button === 2 || event.button === 1) {
            this.isPanning = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            this.canvas.style.cursor = 'grabbing';
        }
    }

    private handleMouseMove(event: MouseEvent): void {
        if (this.isMouseDown) {
            const dx = event.clientX - this.lastMouseX;
            const dy = event.clientY - this.lastMouseY;

            if (Math.abs(dx) > 2 || Math.abs(dy) > 2 || this.isPanning) {
                this.isPanning = true;
                this.hasMoved = true;
                this.cameraX -= dx;
                this.cameraY -= dy;
                this.lastMouseX = event.clientX;
                this.lastMouseY = event.clientY;
                this.canvas.style.cursor = 'grabbing';
                this.onCameraChange();
            }
        } else if (this.isPanning) {
            const dx = event.clientX - this.lastMouseX;
            const dy = event.clientY - this.lastMouseY;
            this.cameraX -= dx;
            this.cameraY -= dy;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            this.onCameraChange();
        }
    }

    private handleMouseUp(event: MouseEvent): void {
        if (event.button === 0) {
            if (this.isMouseDown && !this.hasMoved) {
                this.lastToggledIndex = -1;
                this.toggleCell(event.clientX, event.clientY);
            }
            this.isMouseDown = false;
            this.isPanning = false;
            this.hasMoved = false;
            this.canvas.style.cursor = 'crosshair';
        } else if (event.button === 2 || event.button === 1) {
            this.isPanning = false;
            this.canvas.style.cursor = 'crosshair';
        }
    }

    private toggleCell(clientX: number, clientY: number): void {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((clientX - rect.left + this.cameraX) / this.cellSize);
        const y = Math.floor((clientY - rect.top + this.cameraY) / this.cellSize);
        this.onToggleCell(x, y);
    }

    private handleTouchStart(event: TouchEvent): void {
        if (event.touches.length === 1) {
            this.isMouseDown = true;
            this.hasMoved = false;
            this.lastMouseX = event.touches[0].clientX;
            this.lastMouseY = event.touches[0].clientY;
        } else if (event.touches.length === 2) {
            this.isPanning = true;
            this.lastTouchDistance = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY
            );
            this.lastMouseX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            this.lastMouseY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
        }
        event.preventDefault();
    }

    private handleTouchMove(event: TouchEvent): void {
        if (event.touches.length === 1 && this.isMouseDown) {
            const dx = event.touches[0].clientX - this.lastMouseX;
            const dy = event.touches[0].clientY - this.lastMouseY;

            if (Math.abs(dx) > 2 || Math.abs(dy) > 2 || this.isPanning) {
                this.isPanning = true;
                this.hasMoved = true;
                this.cameraX -= dx;
                this.cameraY -= dy;
                this.lastMouseX = event.touches[0].clientX;
                this.lastMouseY = event.touches[0].clientY;
                this.onCameraChange();
            }
        } else if (event.touches.length === 2 && this.isPanning) {
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
            const midX = (touch1.clientX + touch2.clientX) / 2;
            const midY = (touch1.clientY + touch2.clientY) / 2;

            const dx = midX - this.lastMouseX;
            const dy = midY - this.lastMouseY;
            this.cameraX -= dx;
            this.cameraY -= dy;

            if (this.lastTouchDistance > 0) {
                const zoomFactor = dist / this.lastTouchDistance;
                this.zoomAt(midX, midY, zoomFactor);
            }

            this.lastTouchDistance = dist;
            this.lastMouseX = midX;
            this.lastMouseY = midY;
            this.onCameraChange();
        }
        event.preventDefault();
    }

    private handleTouchEnd(event: TouchEvent): void {
        if (this.isMouseDown && !this.hasMoved && event.changedTouches.length > 0) {
            this.lastToggledIndex = -1;
            const touch = event.changedTouches[0];
            this.toggleCell(touch.clientX, touch.clientY);
        }
        this.isMouseDown = false;
        this.isPanning = false;
        this.hasMoved = false;
        this.lastTouchDistance = 0;
        event.preventDefault();
    }

    private handleWheel(event: WheelEvent): void {
        event.preventDefault();
        const zoomSpeed = 0.1;
        const delta = event.deltaY > 0 ? (1 - zoomSpeed) : (1 + zoomSpeed);
        this.zoomAt(event.clientX, event.clientY, delta);
        this.onCameraChange();
    }

    private zoomAt(clientX: number, clientY: number, factor: number): void {
        const oldCellSize = this.cellSize;
        this.cellSize = Math.max(1, Math.min(50, this.cellSize * factor));
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        
        const worldX = (mouseX + this.cameraX) / oldCellSize;
        const worldY = (mouseY + this.cameraY) / oldCellSize;
        
        this.cameraX = worldX * this.cellSize - mouseX;
        this.cameraY = worldY * this.cellSize - mouseY;
    }
}
