// Frame Buffer System
// Handles double-buffered rendering with cell-based storage

class Cell {
    constructor(character = ' ', color = null, zIndex = 0) {
        this.character = character;
        this.color = null; // Disable color for now to match original renderer
        this.zIndex = zIndex;
        this.dirty = false; // Track if cell needs redrawing
        this.isSpriteLine = false; // Track if this is a sprite line with ANSI codes
    }

    // Create a copy of this cell
    clone() {
        const newCell = new Cell(this.character, this.color, this.zIndex);
        newCell.dirty = this.dirty;
        return newCell;
    }

    // Check if this cell is different from another cell
    equals(other) {
        return this.character === other.character &&
               this.zIndex === other.zIndex &&
               this.isSpriteLine === other.isSpriteLine;
    }

    // Set cell properties
    set(character, color = null, zIndex = 0) {
        this.character = character;
        this.color = null; // Disable color for now
        this.zIndex = zIndex;
        this.dirty = true;
    }

    // Clear the cell
    clear() {
        this.set(' ', null, 0);
    }
}

class FrameBuffer {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        
        // Double buffering: current and previous frame
        this.currentFrame = this.createEmptyBuffer();
        this.previousFrame = this.createEmptyBuffer();
        
        // Track dirty regions for optimization
        this.dirtyRegions = new Set();
        this.fullRedraw = false;
    }

    // Create an empty buffer grid
    createEmptyBuffer() {
        const buffer = [];
        for (let y = 0; y < this.height; y++) {
            buffer[y] = [];
            for (let x = 0; x < this.width; x++) {
                buffer[y][x] = new Cell();
            }
        }
        return buffer;
    }

    // Get cell at position
    getCell(x, y) {
        if (this.isValidPosition(x, y)) {
            return this.currentFrame[y][x];
        }
        return null;
    }

    // Set cell at position
    setCell(x, y, character, color = null, zIndex = 0) {
        if (this.isValidPosition(x, y)) {
            this.currentFrame[y][x].set(character, color, zIndex);
            this.markDirty(x, y);
        }
    }

    // Set multiple cells (for sprites)
    setCells(x, y, sprite, color = null, zIndex = 0) {
        if (!sprite || !Array.isArray(sprite)) return;

        const spriteHeight = sprite.length;

        for (let sy = 0; sy < spriteHeight; sy++) {
            const cellY = y + sy;
            
            if (this.isValidPosition(x, cellY)) {
                // Store the entire sprite line as a single cell
                // This preserves ANSI codes in the sprite data
                const spriteLine = sprite[sy];
                if (spriteLine && spriteLine.trim() !== '') {
                    this.setSpriteLine(x, cellY, spriteLine, zIndex);
                }
            }
        }
    }

    // Set a sprite line (preserves ANSI codes)
    setSpriteLine(x, y, spriteLine, zIndex = 0) {
        if (this.isValidPosition(x, y)) {
            // Create a special cell that stores the entire sprite line
            const cell = new Cell();
            cell.character = spriteLine;
            cell.isSpriteLine = true; // Mark as sprite line
            cell.zIndex = zIndex;
            cell.dirty = true;
            
            this.currentFrame[y][x] = cell;
            this.markDirty(x, y);
        }
    }

    // Clear a rectangular area
    clearArea(x, y, width, height) {
        for (let sy = 0; sy < height; sy++) {
            for (let sx = 0; sx < width; sx++) {
                const cellX = x + sx;
                const cellY = y + sy;
                
                if (this.isValidPosition(cellX, cellY)) {
                    this.currentFrame[cellY][cellX].clear();
                    this.markDirty(cellX, cellY);
                }
            }
        }
    }

    // Clear the entire buffer
    clear() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.currentFrame[y][x].clear();
            }
        }
        this.fullRedraw = true;
    }

    // Check if position is valid
    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    // Mark a cell as dirty
    markDirty(x, y) {
        if (this.isValidPosition(x, y)) {
            this.dirtyRegions.add(`${x},${y}`);
        }
    }

    // Mark a region as dirty
    markDirtyRegion(x, y, width, height) {
        for (let sy = 0; sy < height; sy++) {
            for (let sx = 0; sx < width; sx++) {
                this.markDirty(x + sx, y + sy);
            }
        }
    }

    // Get all dirty cells
    getDirtyCells() {
        const dirtyCells = [];
        for (const coord of this.dirtyRegions) {
            const [x, y] = coord.split(',').map(Number);
            dirtyCells.push({ x, y, cell: this.currentFrame[y][x] });
        }
        return dirtyCells;
    }

    // Swap buffers (called at end of frame)
    swapBuffers() {
        // Deep copy current frame to previous frame
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.previousFrame[y][x] = this.currentFrame[y][x].clone();
            }
        }
        
        // Clear dirty tracking for next frame
        this.dirtyRegions.clear();
        this.fullRedraw = false;
    }

    // Get diff between current and previous frame
    getDiff() {
        const diff = [];
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const current = this.currentFrame[y][x];
                const previous = this.previousFrame[y][x];
                
                if (!current.equals(previous)) {
                    diff.push({
                        x, y,
                        current: current.clone(),
                        previous: previous.clone()
                    });
                }
            }
        }
        
        return diff;
    }

    // Get optimized diff (only dirty cells)
    getOptimizedDiff() {
        if (this.fullRedraw) {
            return this.getDiff();
        }
        
        const diff = [];
        for (const coord of this.dirtyRegions) {
            const [x, y] = coord.split(',').map(Number);
            const current = this.currentFrame[y][x];
            const previous = this.previousFrame[y][x];
            
            if (!current.equals(previous)) {
                diff.push({
                    x, y,
                    current: current.clone(),
                    previous: previous.clone()
                });
            }
        }
        
        return diff;
    }

    // Get buffer dimensions
    getDimensions() {
        return { width: this.width, height: this.height };
    }

    // Resize buffer (preserves content where possible)
    resize(newWidth, newHeight) {
        const oldWidth = this.width;
        const oldHeight = this.height;
        
        this.width = newWidth;
        this.height = newHeight;
        
        // Create new buffers
        const newCurrentFrame = this.createEmptyBuffer();
        const newPreviousFrame = this.createEmptyBuffer();
        
        // Copy existing content
        for (let y = 0; y < Math.min(oldHeight, newHeight); y++) {
            for (let x = 0; x < Math.min(oldWidth, newWidth); x++) {
                newCurrentFrame[y][x] = this.currentFrame[y][x];
                newPreviousFrame[y][x] = this.previousFrame[y][x];
            }
        }
        
        this.currentFrame = newCurrentFrame;
        this.previousFrame = newPreviousFrame;
        
        // Mark for full redraw
        this.fullRedraw = true;
        this.dirtyRegions.clear();
    }

    // Get buffer statistics
    getStats() {
        let dirtyCount = 0;
        let nonEmptyCount = 0;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.currentFrame[y][x];
                if (cell.dirty) dirtyCount++;
                if (cell.character !== ' ') nonEmptyCount++;
            }
        }
        
        return {
            width: this.width,
            height: this.height,
            totalCells: this.width * this.height,
            dirtyCells: dirtyCount,
            nonEmptyCells: nonEmptyCount,
            dirtyRegions: this.dirtyRegions.size,
            fullRedraw: this.fullRedraw
        };
    }
}

module.exports = { FrameBuffer, Cell }; 