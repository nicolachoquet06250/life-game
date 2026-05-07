import './style.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

let cameraX = 0
let cameraY = 0

let cellSize = 8
const tickRate = 12

let canvas: HTMLCanvasElement
let ctx: CanvasRenderingContext2D
let app: HTMLDivElement

let cols = 0
let rows = 0

let grid = new Uint8Array()
let nextGrid = new Uint8Array()

let running = true
let isMouseDown = false
let isPanning = false
let hasMoved = false
let lastMouseX = 0
let lastMouseY = 0
let lastToggledIndex = -1
let lastTouchDistance = 0

let lastTick = 0
const tickInterval = 1000 / tickRate

function index(x: number, y: number): number {
    return y * cols + x
}

function createGrid(): void {
    cols = Math.floor(app.clientWidth / cellSize)
    rows = Math.floor(app.clientHeight / cellSize)

    const size = cols * rows

    grid = new Uint8Array(size)
    nextGrid = new Uint8Array(size)

    for (let i = 0; i < size; i++) {
        grid[i] = Math.random() > 0.75 ? 1 : 0
    }
}

function resizeCanvas(): void {
    canvas.width = app.clientWidth
    canvas.height = app.clientHeight

    createGrid()
    draw()
}

function countNeighbors(x: number, y: number): number {
    let count = 0

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue

            const nx = (x + dx + cols) % cols
            const ny = (y + dy + rows) % rows

            count += grid[index(nx, ny)]
        }
    }

    return count
}

function nextGeneration(): void {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const i = index(x, y)

            const alive = grid[i] === 1
            const neighbors = countNeighbors(x, y)

            nextGrid[i] = alive
                ? neighbors === 2 || neighbors === 3 ? 1 : 0
                : neighbors === 3 ? 1 : 0
        }
    }

    const tmp = grid
    grid = nextGrid
    nextGrid = tmp
}

function draw(): void {
    ctx.fillStyle = '#050505'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#00ff88'

    const startX = Math.max(0, Math.floor(cameraX / cellSize))
    const startY = Math.max(0, Math.floor(cameraY / cellSize))

    const endX = Math.min(cols, Math.ceil((cameraX + canvas.width) / cellSize))
    const endY = Math.min(rows, Math.ceil((cameraY + canvas.height) / cellSize))

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            if (grid[index(x, y)] === 0) continue

            ctx.fillRect(
                x * cellSize - cameraX,
                y * cellSize - cameraY,
                cellSize - 1,
                cellSize - 1
            )
        }
    }
}

function loop(timestamp: number): void {
    if (running && timestamp - lastTick >= tickInterval) {
        nextGeneration()
        draw()

        lastTick = timestamp
    }

    requestAnimationFrame(loop)
}

function toggleCell(event: MouseEvent): void {
    const rect = canvas.getBoundingClientRect()

    const x = Math.floor((event.clientX - rect.left + cameraX) / cellSize)
    const y = Math.floor((event.clientY - rect.top + cameraY) / cellSize)

    if (x < 0 || x >= cols || y < 0 || y >= rows) return

    const i = index(x, y)

    if (i === lastToggledIndex) return
    lastToggledIndex = i

    grid[i] = grid[i] === 1 ? 0 : 1

    draw()
}

function handleMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
        isMouseDown = true
        hasMoved = false
        lastMouseX = event.clientX
        lastMouseY = event.clientY
    } else if (event.button === 2 || event.button === 1) {
        isPanning = true
        lastMouseX = event.clientX
        lastMouseY = event.clientY
        canvas.style.cursor = 'grabbing'
    }
}

function checkAndExpandGrid(): void {
    let addLeft = 0
    let addRight = 0
    let addTop = 0
    let addBottom = 0

    const margin = 5 // Nombre de cellules de marge avant d'étendre

    if (cameraX < margin * cellSize) {
        addLeft = Math.ceil(Math.abs(cameraX) / cellSize) + margin
    }
    
    if (cameraX + canvas.width > (cols - margin) * cellSize) {
        addRight = Math.ceil((cameraX + canvas.width - (cols - margin) * cellSize) / cellSize) + margin
    }

    if (cameraY < margin * cellSize) {
        addTop = Math.ceil(Math.abs(cameraY) / cellSize) + margin
    }

    if (cameraY + canvas.height > (rows - margin) * cellSize) {
        addBottom = Math.ceil((cameraY + canvas.height - (rows - margin) * cellSize) / cellSize) + margin
    }

    if (addLeft > 0 || addRight > 0 || addTop > 0 || addBottom > 0) {
        expandGrid(addLeft, addRight, addTop, addBottom)
    }
}

function handleMouseMove(event: MouseEvent): void {
    if (isMouseDown) {
        const dx = event.clientX - lastMouseX
        const dy = event.clientY - lastMouseY

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2 || isPanning) {
            isPanning = true
            hasMoved = true
            cameraX -= dx
            cameraY -= dy
            lastMouseX = event.clientX
            lastMouseY = event.clientY
            canvas.style.cursor = 'grabbing'
            checkAndExpandGrid()
            draw()
        }
    } else if (isPanning) {
        const dx = event.clientX - lastMouseX
        const dy = event.clientY - lastMouseY

        cameraX -= dx
        cameraY -= dy

        lastMouseX = event.clientX
        lastMouseY = event.clientY

        checkAndExpandGrid()
        draw()
    }
}

function handleMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
        if (!hasMoved) {
            lastToggledIndex = -1
            toggleCell(event)
        }
        isMouseDown = false
        isPanning = false
        hasMoved = false
        canvas.style.cursor = 'crosshair'
    } else if (event.button === 2 || event.button === 1) {
        isPanning = false
        canvas.style.cursor = 'crosshair'
    }
}

function handleTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
        isMouseDown = true
        hasMoved = false
        lastMouseX = event.touches[0].clientX
        lastMouseY = event.touches[0].clientY
    } else if (event.touches.length === 2) {
        isPanning = true
        lastTouchDistance = Math.hypot(
            event.touches[0].clientX - event.touches[1].clientX,
            event.touches[0].clientY - event.touches[1].clientY
        )
        lastMouseX = (event.touches[0].clientX + event.touches[1].clientX) / 2
        lastMouseY = (event.touches[0].clientY + event.touches[1].clientY) / 2
    }
    event.preventDefault()
}

function handleTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && isMouseDown) {
        const dx = event.touches[0].clientX - lastMouseX
        const dy = event.touches[0].clientY - lastMouseY

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2 || isPanning) {
            isPanning = true
            hasMoved = true
            cameraX -= dx
            cameraY -= dy
            lastMouseX = event.touches[0].clientX
            lastMouseY = event.touches[0].clientY
            checkAndExpandGrid()
            draw()
        }
    } else if (event.touches.length === 2 && isPanning) {
        const touch1 = event.touches[0]
        const touch2 = event.touches[1]
        const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)
        const midX = (touch1.clientX + touch2.clientX) / 2
        const midY = (touch1.clientY + touch2.clientY) / 2

        // Panning with two fingers
        const dx = midX - lastMouseX
        const dy = midY - lastMouseY
        cameraX -= dx
        cameraY -= dy

        // Zooming
        if (lastTouchDistance > 0) {
            const zoomFactor = dist / lastTouchDistance
            const oldCellSize = cellSize
            cellSize = Math.min(Math.max(1, cellSize * zoomFactor), 50)
            
            // Adjust camera to zoom on midpoint
            const rect = canvas.getBoundingClientRect()
            const mouseX = midX - rect.left
            const mouseY = midY - rect.top
            
            const worldX = (mouseX + cameraX) / oldCellSize
            const worldY = (mouseY + cameraY) / oldCellSize
            
            cameraX = worldX * cellSize - mouseX
            cameraY = worldY * cellSize - mouseY
        }

        lastTouchDistance = dist
        lastMouseX = midX
        lastMouseY = midY

        checkAndExpandGrid()
        draw()
    }
    event.preventDefault()
}

function handleTouchEnd(event: TouchEvent): void {
    if (isMouseDown && !hasMoved && event.changedTouches.length > 0) {
        lastToggledIndex = -1
        const touch = event.changedTouches[0]
        const rect = canvas.getBoundingClientRect()
        const x = Math.floor((touch.clientX - rect.left + cameraX) / cellSize)
        const y = Math.floor((touch.clientY - rect.top + cameraY) / cellSize)

        if (x >= 0 && x < cols && y >= 0 && y < rows) {
            const i = index(x, y)
            grid[i] = grid[i] === 1 ? 0 : 1
            draw()
        }
    }
    isMouseDown = false
    isPanning = false
    hasMoved = false
    lastTouchDistance = 0
    event.preventDefault()
}

function toggleRunning(): void {
    running = !running
    const pauseBtn = document.getElementById('pause-btn')
    if (pauseBtn) {
        pauseBtn.textContent = running ? '⏸ Pause' : '▶ Play'
    }
    const status = document.getElementById('status')
    if (status) {
        status.textContent = running ? '' : 'PAUSED'
    }
}

function expandGrid(addLeft: number, addRight: number, addTop: number, addBottom: number): void {
    if (addLeft <= 0 && addRight <= 0 && addTop <= 0 && addBottom <= 0) return

    const newCols = cols + addLeft + addRight
    const newRows = rows + addTop + addBottom
    const size = newCols * newRows
    const newGrid = new Uint8Array(size)
    const newNextGrid = new Uint8Array(size)

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            newGrid[(y + addTop) * newCols + (x + addLeft)] = grid[y * cols + x]
        }
    }

    grid = newGrid
    nextGrid = newNextGrid
    cols = newCols
    rows = newRows
    
    // Ajuster la caméra pour que le contenu ne semble pas sauter
    cameraX += addLeft * cellSize
    cameraY += addTop * cellSize
}

function handleWheel(event: WheelEvent): void {
    event.preventDefault()
    const zoomSpeed = 0.1
    const delta = event.deltaY > 0 ? (1 - zoomSpeed) : (1 + zoomSpeed)
    
    const oldCellSize = cellSize
    cellSize = Math.max(1, Math.min(50, cellSize * delta))
    
    // Zoom toward mouse position
    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    
    const worldX = (mouseX + cameraX) / oldCellSize
    const worldY = (mouseY + cameraY) / oldCellSize
    
    cameraX = worldX * cellSize - mouseX
    cameraY = worldY * cellSize - mouseY

    checkAndExpandGrid()
    
    draw()
}

function handleKeydown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
        toggleRunning()
    }

    if (event.key.toLowerCase() === 'r') {
        cameraX = 0
        cameraY = 0
        cellSize = 8
        createGrid()
        draw()
    }
}

function init(): void {
    const appElement = document.getElementById('app')

    if (!appElement) {
        throw new Error('#app introuvable')
    }

    app = appElement as HTMLDivElement

    app.style.position = 'fixed'
    app.style.inset = '0'
    app.style.overflow = 'hidden'
    app.style.background = '#050505'

    canvas = document.createElement('canvas')

    Object.assign(canvas.style, {
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: 'crosshair',
        touchAction: 'none'
    })

    app.appendChild(canvas)

    const controls = document.createElement('div')
    controls.id = 'controls'
    Object.assign(controls.style, {
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: '10',
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
    })
    document.body.appendChild(controls)

    const pauseBtn = document.createElement('button')
    pauseBtn.id = 'pause-btn'
    pauseBtn.textContent = '⏸ Pause'
    Object.assign(pauseBtn.style, {
        padding: '8px 16px',
        background: '#333',
        color: 'white',
        border: '1px solid #555',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    })
    pauseBtn.addEventListener('click', toggleRunning)

    const resetBtn = document.createElement('button')
    resetBtn.textContent = '↻ Reset'
    Object.assign(resetBtn.style, {
        padding: '8px 16px',
        background: '#333',
        color: 'white',
        border: '1px solid #555',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    })
    resetBtn.addEventListener('click', () => {
        cameraX = 0
        cameraY = 0
        cellSize = 8
        createGrid()
        draw()
    })

    const status = document.createElement('span')
    status.id = 'status'
    Object.assign(status.style, {
        color: '#ff4444',
        fontWeight: 'bold',
        fontSize: '18px',
        marginLeft: '10px'
    })

    controls.appendChild(pauseBtn)
    controls.appendChild(resetBtn)
    controls.appendChild(status)

    const context = canvas.getContext('2d')

    if (!context) {
        throw new Error('Impossible de récupérer le contexte 2D')
    }

    ctx = context

    resizeCanvas()

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('keydown', handleKeydown)

    requestAnimationFrame(loop)
}

init()