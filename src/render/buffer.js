// Improved Frame Buffer System
// Based on the example with Map-based storage and proper ANSI parsing

class Buffer {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.buffer = new Map(); // key: "x,y", value: cell
    }

    _key(x, y) {
        return `${x},${y}`;
    }

    setCell(x, y, char, ansi = '', z = 0) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

        const key = this._key(x, y);
        const existing = this.buffer.get(key);

        // Use explicit z-index if provided, otherwise use 0
        const effectiveZ = z;

        // Replace only if new z-index is higher or same
        if (!existing || effectiveZ >= existing.z) {
            this.buffer.set(key, { char, ansi, z: effectiveZ });
        }
    }

    getCell(x, y) {
        return this.buffer.get(this._key(x, y));
    }

    clear() {
        this.buffer.clear();
    }

    getEntries() {
        return this.buffer.entries();
    }

    // Parse sprite with ANSI codes and set cells
    setSprite(x, y, sprite, z = 0) {
        if (!sprite || !Array.isArray(sprite)) return;

        // Check if this is the new cell-based format
        if (sprite.length > 0 && typeof sprite[0] === 'object' && sprite[0].hasOwnProperty('x')) {
            // New cell-based format
            this.setCellArray(x, y, sprite, z);
            return;
        }

        // Legacy line-based format
        for (let spriteY = 0; spriteY < sprite.length; spriteY++) {
            const line = sprite[spriteY];
            let i = 0, screenX = x;
            let currentAnsi = '';

            while (i < line.length) {
                if (line[i] === '\x1b') {
                    // Parse ANSI escape sequence
                    let j = i;
                    while (j < line.length && line[j] !== 'm') j++;
                    currentAnsi = line.slice(i, j + 1);
                    i = j + 1;
                } else {
                    const char = line[i];
                    // Check if it's a visible character (Unicode block characters)
                    if (char === '▄' || char === '▀' || char === '█' || char === '▌' || char === '▐' || 
                        char === '░' || char === '▒' || char === '▓' || char === '▔' || char === '▕') {
                        const screenY = y + spriteY;
                        // Use explicit z-index if provided, otherwise use 0
                        const effectiveZ = z;
                        this.setCell(screenX, screenY, char, currentAnsi, effectiveZ);
                        screenX++;
                    } else if (char === ' ') {
                        // Skip spaces but advance position
                        screenX++;
                    }
                    i++;
                }
            }
        }
    }

    // Set cell array (new format from updated generator)
    setCellArray(offsetX, offsetY, cellArray, z = 0) {
        if (!cellArray || !Array.isArray(cellArray)) return;

        cellArray.forEach(cell => {
            if (cell && typeof cell === 'object' && 
                typeof cell.x === 'number' && typeof cell.y === 'number' &&
                typeof cell.char === 'string' && typeof cell.ansi === 'string') {
                
                const screenX = offsetX + cell.x;
                const screenY = offsetY + cell.y;
                
                // Use explicit z-index if provided, otherwise use 0
                const effectiveZ = z;
                
                this.setCell(screenX, screenY, cell.char, cell.ansi, effectiveZ);
            }
        });
    }

    // Set text with optional ANSI color
    setText(x, y, text, ansi = '', z = 0) {
        for (let i = 0; i < text.length; i++) {
            const charX = x + i;
            if (charX < this.width) {
                // Use explicit z-index if provided, otherwise use 0
                const effectiveZ = z;
                this.setCell(charX, y, text[i], ansi, effectiveZ);
            }
        }
    }

    // Get buffer statistics
    getStats() {
        return {
            width: this.width,
            height: this.height,
            totalCells: this.width * this.height,
            usedCells: this.buffer.size,
            efficiency: (this.buffer.size / (this.width * this.height) * 100).toFixed(2) + '%'
        };
    }
}

// Improved diff and render function
function renderDiff(current, previous, term) {
    let changes = 0;
    
    // Set cursor to block style, disable blinking, and hide cursor during rendering
    term('\x1b[2 q\x1b[?12l\x1b[?25l');
    
    // Group changes by row to minimize cursor movements
    const changesByRow = {};
    
    for (const [key, cell] of current.getEntries()) {
        const [x, y] = key.split(',').map(Number);
        const prev = previous.getCell(x, y);

        if (!prev || prev.char !== cell.char || prev.ansi !== cell.ansi) {
            if (!changesByRow[y]) {
                changesByRow[y] = [];
            }
            changesByRow[y].push({ x, cell });
            changes++;
        }
    }
    
    // Render changes row by row to minimize cursor movements
    for (const [rowY, rowChanges] of Object.entries(changesByRow)) {
        const y = parseInt(rowY);
        
        // Sort changes in this row by x position
        rowChanges.sort((a, b) => a.x - b.x);
        
        // Use terminal-kit's moveTo for each change in the row
        for (const change of rowChanges) {
            term.moveTo(change.x + 1, y + 1);
            term(change.cell.ansi + change.cell.char + '\x1b[0m');
        }
    }
    
    return changes;
}

module.exports = { Buffer, renderDiff }; 