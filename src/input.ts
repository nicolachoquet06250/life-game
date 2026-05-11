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
    isSelecting = false;
    isDraggingSelection = false;
    dragStart = { x: 0, y: 0 };
    dragOffset = { x: 0, y: 0 };
    selectionStart = { x: 0, y: 0 };
    selectionEnd = { x: 0, y: 0 };
    hasMoved = false;
    lastMouseX = -1;
    lastMouseY = -1;
    mouseMoved = false;
    lastToggledIndex = -1;
    lastTouchDistance = 0;

    selectedPattern: number[][] | null = null;
    clipboard: number[][] | null = null;

    onCameraChange: () => void;
    onToggleCell: (x: number, y: number) => void;
    onSelectionComplete?: (start: {x: number, y: number}, end: {x: number, y: number}) => void;
    onDragSelection?: (dx: number, dy: number, isFinished: boolean) => void;
    onDelete?: () => void;

    private _isSelectionMode = false;
    public get isSelectionMode() { return this._isSelectionMode; }
    public set isSelectionMode(value: boolean) { this._isSelectionMode = value; }

    constructor(
        canvas: HTMLCanvasElement,
        engine: GameEngine,
        renderer: Renderer,
        callbacks: {
            onCameraChange: () => void,
            onToggleCell: (x: number, y: number) => void,
            onDelete?: () => void
        }
    ) {
        this.canvas = canvas;
        this.engine = engine;
        this.renderer = renderer;
        this.onCameraChange = callbacks.onCameraChange;
        this.onToggleCell = callbacks.onToggleCell;
        this.onSelectionComplete = (callbacks as any).onSelectionComplete;
        this.onDragSelection = (callbacks as any).onDragSelection;
        this.onDelete = (callbacks as any).onDelete;

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
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.left + this.cameraX) / this.cellSize);
            const y = Math.floor((event.clientY - rect.top + this.cameraY) / this.cellSize);

            if (event.shiftKey) {
                this.isSelecting = true;
                this.selectionStart = { x, y };
                this.selectionEnd = { x, y };
            } else if (this.isPointInSelection(x, y)) {
                this.isDraggingSelection = true;
                this.dragStart = { x, y };
                this.hasMoved = false;
                this.canvas.style.cursor = 'move';
            } else {
                this.isMouseDown = true;
                this.hasMoved = false;
            }
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
        const dx = event.clientX - this.lastMouseX;
        const dy = event.clientY - this.lastMouseY;

        if (this.lastMouseX !== -1 && (dx !== 0 || dy !== 0)) {
            this.mouseMoved = true;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const worldX = Math.floor((event.clientX - rect.left + this.cameraX) / this.cellSize);
        const worldY = Math.floor((event.clientY - rect.top + this.cameraY) / this.cellSize);

        if (this.isDraggingSelection) {
            const worldDx = worldX - this.dragStart.x;
            const worldDy = worldY - this.dragStart.y;
            
            if (worldDx !== 0 || worldDy !== 0) {
                this.hasMoved = true;
                this.dragOffset.x += worldDx;
                this.dragOffset.y += worldDy;
                this.onDragSelection?.(this.dragOffset.x, this.dragOffset.y, false);
                this.dragStart = { x: worldX, y: worldY };
            }
        } else if (this.isMouseDown) {
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2 || this.isPanning) {
                this.isPanning = true;
                this.hasMoved = true;
                this.cameraX -= dx;
                this.cameraY -= dy;
                this.canvas.style.cursor = 'grabbing';
                this.onCameraChange();
            }
        } else if (this.isSelecting) {
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.left + this.cameraX) / this.cellSize);
            const y = Math.floor((event.clientY - rect.top + this.cameraY) / this.cellSize);
            this.selectionEnd = { x, y };
        } else if (this.isPanning) {
            this.cameraX -= dx;
            this.cameraY -= dy;
            this.onCameraChange();
        }

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    private handleMouseUp(event: MouseEvent): void {
        if (event.button === 0) {
            if (this.isMouseDown && !this.hasMoved) {
                this.lastToggledIndex = -1;
                this.toggleCell(event.clientX, event.clientY);
            }
            if (this.isSelecting) {
                this.onSelectionComplete?.(this.selectionStart, this.selectionEnd);
            }
            if (this.isDraggingSelection) {
                if (this.hasMoved) {
                    this.onDragSelection?.(this.dragOffset.x, this.dragOffset.y, true);
                }
                this.dragOffset = { x: 0, y: 0 };
            }
            this.isMouseDown = false;
            this.isPanning = false;
            this.isSelecting = false;
            this.isDraggingSelection = false;
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
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((event.touches[0].clientX - rect.left + this.cameraX) / this.cellSize);
            const y = Math.floor((event.touches[0].clientY - rect.top + this.cameraY) / this.cellSize);

            if (this.isSelectionMode) {
                this.isSelecting = true;
                this.selectionStart = { x, y };
                this.selectionEnd = { x, y };
            } else if (this.isPointInSelection(x, y)) {
                this.isDraggingSelection = true;
                this.dragStart = { x, y };
                this.hasMoved = false;
            } else {
                this.isMouseDown = true;
                this.hasMoved = false;
            }
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
        this.mouseMoved = true;
        if (event.touches.length === 1) {
            const dx = event.touches[0].clientX - this.lastMouseX;
            const dy = event.touches[0].clientY - this.lastMouseY;
            const rect = this.canvas.getBoundingClientRect();
            const worldX = Math.floor((event.touches[0].clientX - rect.left + this.cameraX) / this.cellSize);
            const worldY = Math.floor((event.touches[0].clientY - rect.top + this.cameraY) / this.cellSize);

            if (this.isDraggingSelection) {
                const worldDx = worldX - this.dragStart.x;
                const worldDy = worldY - this.dragStart.y;
                if (worldDx !== 0 || worldDy !== 0) {
                    this.hasMoved = true;
                    this.dragOffset.x += worldDx;
                    this.dragOffset.y += worldDy;
                    this.onDragSelection?.(this.dragOffset.x, this.dragOffset.y, false);
                    this.dragStart = { x: worldX, y: worldY };
                }
            } else if (this.isSelecting) {
                this.selectionEnd = { x: worldX, y: worldY };
            } else if (this.isMouseDown) {
                if (Math.abs(dx) > 2 || Math.abs(dy) > 2 || this.isPanning) {
                    this.isPanning = true;
                    this.hasMoved = true;
                    this.cameraX -= dx;
                    this.cameraY -= dy;
                    this.onCameraChange();
                }
            }
            this.lastMouseX = event.touches[0].clientX;
            this.lastMouseY = event.touches[0].clientY;
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
        if (this.isSelecting) {
            this.onSelectionComplete?.(this.selectionStart, this.selectionEnd);
        }
        if (this.isDraggingSelection) {
            if (this.hasMoved) {
                this.onDragSelection?.(this.dragOffset.x, this.dragOffset.y, true);
            }
            this.dragOffset = { x: 0, y: 0 };
        }
        this.isMouseDown = false;
        this.isPanning = false;
        this.isSelecting = false;
        this.isDraggingSelection = false;
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

    private isPointInSelection(x: number, y: number): boolean {
        const xMin = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const xMax = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const yMin = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const yMax = Math.max(this.selectionStart.y, this.selectionEnd.y);

        const isInRect = x >= xMin && x <= xMax && y >= yMin && y <= yMax && (xMin !== xMax || yMin !== yMax);
        if (!isInRect) return false;

        // Only allow dragging if the clicked cell is alive
        return this.engine.grid[this.engine.index(x, y)] === 1;
    }
}
