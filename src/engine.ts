export class GameEngine {
    cols: number = 0
    rows: number = 0
    grid: Uint8Array = new Uint8Array()
    nextGrid: Uint8Array = new Uint8Array()
    history: Uint8Array[] = []
    maxHistory: number = 100

    isToric: boolean = true

    index(x: number, y: number): number {
        return y * this.cols + x
    }

    calculGrid(width: number, height: number, cellSize: number) {
        this.cols = Math.floor(width / cellSize)
        this.rows = Math.floor(height / cellSize)

        const size = this.cols * this.rows
        this.grid = new Uint8Array(size)
        this.nextGrid = new Uint8Array(size)

        return size;
    }

    resetSimulation() {
        this.history = []
    }

    createGrid(width: number, height: number, cellSize: number, random: boolean = true): void {
        const size = this.calculGrid(width, height, cellSize);

        if (random) {
            for (let i = 0; i < size; i++) {
                this.grid[i] = Math.random() > 0.75 ? 1 : 0
            }
        }
    }

    countNeighbors(x: number, y: number): number {
        let count = 0
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue
                let nx = x + dx
                let ny = y + dy

                if (this.isToric) {
                    nx = (nx + this.cols) % this.cols
                    ny = (ny + this.rows) % this.rows
                } else {
                    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue
                }
                
                count += this.grid[this.index(nx, ny)]
            }
        }
        return count
    }

    getStats(): { population: number, density: number } {
        let population = 0
        for (let i = 0; i < this.grid.length; i++) {
            if (this.grid[i] === 1) population++
        }
        const density = (population / this.grid.length) * 100
        return { population, density }
    }

    nextGeneration(): boolean {
        this.saveToHistory()
        let changed = false
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const i = this.index(x, y)
                const alive = this.grid[i] === 1
                const neighbors = this.countNeighbors(x, y)
                const nextState = alive
                    ? neighbors === 2 || neighbors === 3 ? 1 : 0
                    : neighbors === 3 ? 1 : 0
                if (nextState !== this.grid[i]) {
                    changed = true
                }
                this.nextGrid[i] = nextState
            }
        }
        const tmp = this.grid
        this.grid = this.nextGrid
        this.nextGrid = tmp
        return changed
    }

    isStable(): boolean {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const i = this.index(x, y)
                const alive = this.grid[i] === 1
                const neighbors = this.countNeighbors(x, y)
                const nextState = alive
                    ? neighbors === 2 || neighbors === 3 ? 1 : 0
                    : neighbors === 3 ? 1 : 0
                if (nextState !== this.grid[i]) {
                    return false
                }
            }
        }
        return true
    }

    saveToHistory(): void {
        this.history.push(new Uint8Array(this.grid))
        if (this.history.length > this.maxHistory) {
            this.history.shift()
        }
    }

    previousGeneration(): boolean {
        const lastState = this.history.pop()
        if (lastState) {
            this.grid = lastState
            this.nextGrid = new Uint8Array(this.grid.length)
            return true
        }
        return false
    }

    expandGrid(addLeft: number, addRight: number, addTop: number, addBottom: number): void {
        const newCols = this.cols + addLeft + addRight
        const newRows = this.rows + addTop + addBottom
        const size = newCols * newRows
        const newGrid = new Uint8Array(size)
        const newNextGrid = new Uint8Array(size)

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                newGrid[(y + addTop) * newCols + (x + addLeft)] = this.grid[y * this.cols + x]
            }
        }

        this.grid = newGrid
        this.nextGrid = newNextGrid
        this.cols = newCols
        this.rows = newRows
    }

    toggleCell(x: number, y: number): void {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return
        const i = this.index(x, y)
        this.grid[i] = this.grid[i] === 1 ? 0 : 1
    }

    applyPattern(x: number, y: number, pattern: number[][], overwrite: boolean = true): void {
        for (let py = 0; py < pattern.length; py++) {
            for (let px = 0; px < pattern[py].length; px++) {
                if (!overwrite && pattern[py][px] === 0) continue
                const nx = (x + px + this.cols) % this.cols
                const ny = (y + py + this.rows) % this.rows
                this.grid[this.index(nx, ny)] = pattern[py][px]
            }
        }
    }

    getHash(): string {
        // Simple hash function for Uint8Array
        let hash = 0;
        for (let i = 0; i < this.grid.length; i++) {
            if (this.grid[i] === 1) {
                hash = ((hash << 5) - hash) + i;
                hash |= 0; // Convert to 32bit integer
            }
        }
        return hash.toString();
    }

    serialize(): string {
        const data = {
            cols: this.cols,
            rows: this.rows,
            grid: Array.from(this.grid)
        }
        return JSON.stringify(data)
    }

    deserialize(json: string): void {
        const data = JSON.parse(json)
        this.cols = data.cols
        this.rows = data.rows
        this.grid = new Uint8Array(data.grid)
        this.nextGrid = new Uint8Array(this.grid.length)
    }

    rotatePattern(pattern: number[][]): number[][] {
        if (pattern.length === 0 || pattern[0].length === 0) return [];
        const rows = pattern.length;
        const cols = pattern[0].length;
        const newPattern: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                newPattern[x][rows - 1 - y] = pattern[y][x];
            }
        }
        return newPattern;
    }

    mirrorHorizontal(pattern: number[][]): number[][] {
        return pattern.map(row => [...row].reverse());
    }

    mirrorVertical(pattern: number[][]): number[][] {
        return [...pattern].reverse();
    }

    copyPattern(x1: number, y1: number, x2: number, y2: number): number[][] {
        const startX = Math.min(x1, x2);
        const startY = Math.min(y1, y2);
        const endX = Math.max(x1, x2);
        const endY = Math.max(y1, y2);

        const width = endX - startX + 1;
        const height = endY - startY + 1;

        if (width <= 0 || height <= 0) return [];

        const pattern: number[][] = [];
        for (let y = 0; y < height; y++) {
            const row: number[] = [];
            for (let x = 0; x < width; x++) {
                const nx = (startX + x + this.cols) % this.cols;
                const ny = (startY + y + this.rows) % this.rows;
                row.push(this.grid[this.index(nx, ny)]);
            }
            pattern.push(row);
        }
        return pattern;
    }

    clearArea(x1: number, y1: number, x2: number, y2: number, onlyPattern?: number[][]): void {
        const startX = Math.min(x1, x2);
        const startY = Math.min(y1, y2);
        const endX = Math.max(x1, x2);
        const endY = Math.max(y1, y2);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (onlyPattern) {
                    const py = y - startY;
                    const px = x - startX;
                    if (py >= 0 && py < onlyPattern.length && px >= 0 && px < onlyPattern[py].length) {
                        if (onlyPattern[py][px] === 0) continue; // Don't clear if it wasn't alive in the pattern
                    }
                }
                const nx = (x + this.cols) % this.cols;
                const ny = (y + this.rows) % this.rows;
                this.grid[this.index(nx, ny)] = 0;
            }
        }
    }
}
