export class GameEngine {
    cols: number = 0
    rows: number = 0
    grid: Uint8Array = new Uint8Array()
    nextGrid: Uint8Array = new Uint8Array()

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

    nextGeneration(): void {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const i = this.index(x, y)
                const alive = this.grid[i] === 1
                const neighbors = this.countNeighbors(x, y)
                this.nextGrid[i] = alive
                    ? neighbors === 2 || neighbors === 3 ? 1 : 0
                    : neighbors === 3 ? 1 : 0
            }
        }
        const tmp = this.grid
        this.grid = this.nextGrid
        this.nextGrid = tmp
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

    applyPattern(x: number, y: number, pattern: number[][]): void {
        for (let py = 0; py < pattern.length; py++) {
            for (let px = 0; px < pattern[py].length; px++) {
                const nx = (x + px + this.cols) % this.cols
                const ny = (y + py + this.rows) % this.rows
                this.grid[this.index(nx, ny)] = pattern[py][px]
            }
        }
    }
}
