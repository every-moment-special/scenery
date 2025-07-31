// Improved Frame Buffer System
// Based on the example with Map-based storage and proper ANSI parsing

class Buffer {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.buffer = new Map(); // key: "x,y", value: cell
        
        // Pre-allocate key strings for better performance
        this.keyCache = new Map();
        this._preallocateKeys();
    }

    _preallocateKeys() {
        // Pre-allocate common key strings to avoid string concatenation
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = `${x},${y}`;
                this.keyCache.set(key, key);
            }
        }
    }

    _key(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        return this.keyCache.get(`${x},${y}`) || `${x},${y}`;
    }

    setCell(x, y, char, ansi = '', z = 0) {
        const key = this._key(x, y);
        if (!key) return;

        const existing = this.buffer.get(key);

        // Use explicit z-index if provided, otherwise use 0
        const effectiveZ = z;

        // Replace only if new z-index is higher or same
        if (!existing || effectiveZ >= existing.z) {
            // Reuse cell object if possible to reduce allocations
            if (existing && existing.char === char && existing.ansi === ansi && existing.z === effectiveZ) {
                return; // No change needed
            }
            
            this.buffer.set(key, { char, ansi, z: effectiveZ });
        }
    }

    getCell(x, y) {
        const key = this._key(x, y);
        return key ? this.buffer.get(key) : null;
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

        // Batch cell updates for better performance
        const updates = [];
        
        cellArray.forEach(cell => {
            if (cell && typeof cell === 'object' && 
                typeof cell.x === 'number' && typeof cell.y === 'number' &&
                typeof cell.char === 'string' && typeof cell.ansi === 'string') {
                
                const screenX = offsetX + cell.x;
                const screenY = offsetY + cell.y;
                
                // Skip rendering if this is a background-only pixel (transparent)
                if (!this.isBackgroundOnly(cell.ansi)) {
                    updates.push({ x: screenX, y: screenY, char: cell.char, ansi: cell.ansi, z });
                }
            }
        });
        
        // Apply all updates at once
        updates.forEach(update => {
            this.setCell(update.x, update.y, update.char, update.ansi, update.z);
        });
    }

    // Check if a cell is background-only (should be transparent)
    isBackgroundOnly(ansi) {
        if (!ansi || ansi === '') return false;
        
        // Check if it's just a background color without meaningful foreground content
        // These are typically the "empty" areas of sprites that should be transparent
        const hasBackground = ansi.includes('48;2;');
        const hasForeground = ansi.includes('38;2;');
        
        // If it only has background and the background is black or very dark, it's transparent
        if (hasBackground && !hasForeground) {
            // Extract background color
            const bgMatch = ansi.match(/48;2;(\d+);(\d+);(\d+)m/);
            if (bgMatch) {
                const r = parseInt(bgMatch[1]);
                const g = parseInt(bgMatch[2]);
                const b = parseInt(bgMatch[3]);
                
                // If it's black or very dark, treat as transparent
                if (r <= 10 && g <= 10 && b <= 10) {
                    return true;
                }
            }
        }
        
        return false;
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

// Optimized diff and render function
function renderDiff(current, previous, term) {
    let changes = 0;
    
    // Set cursor to block style, disable blinking, and hide cursor during rendering
    term('\x1b[2 q\x1b[?12l\x1b[?25l');
    
    // Group changes by row to minimize cursor movements
    const changesByRow = new Map();
    
    // Use a more efficient diff algorithm with change threshold
    const currentEntries = current.getEntries();
    const previousEntries = previous.getEntries();
    
    // Create a map of previous cells for faster lookup
    const previousCells = new Map(previousEntries);
    
    // Process current cells and find changes with improved detection
    for (const [key, cell] of currentEntries) {
        const prev = previousCells.get(key);

        // Only consider it a change if there's a meaningful difference
        if (!prev || prev.char !== cell.char || prev.ansi !== cell.ansi) {
            // Skip empty cells unless they're replacing something
            if (cell.char === ' ' && cell.ansi === '' && !prev) {
                continue; // Skip rendering empty cells that weren't there before
            }
            
            const [x, y] = key.split(',').map(Number);
            
            if (!changesByRow.has(y)) {
                changesByRow.set(y, []);
            }
            changesByRow.get(y).push({ x, cell });
            changes++;
        }
    }
    
    // Only render if there are actual changes
    if (changes === 0) {
        return 0;
    }
    
    // Render changes row by row to minimize cursor movements
    const sortedRows = Array.from(changesByRow.entries()).sort((a, b) => a[0] - b[0]);
    
    for (const [rowY, rowChanges] of sortedRows) {
        const y = parseInt(rowY);
        
        // Sort changes in this row by x position
        rowChanges.sort((a, b) => a.x - b.x);
        
        // Batch similar changes in the same row
        let currentAnsi = '';
        let currentX = -1;
        let batchedChars = '';
        
        for (const change of rowChanges) {
            // If we have a gap or different ANSI, flush the batch
            if (currentX !== -1 && (change.x !== currentX + 1 || change.cell.ansi !== currentAnsi)) {
                if (batchedChars) {
                    term.moveTo(currentX + 1, y + 1);
                    term(currentAnsi + batchedChars + '\x1b[0m');
                }
                batchedChars = '';
            }
            
            // Start new batch or continue current
            if (batchedChars === '') {
                currentX = change.x;
                currentAnsi = change.cell.ansi;
            }
            
            batchedChars += change.cell.char;
        }
        
        // Flush final batch in this row
        if (batchedChars) {
            term.moveTo(currentX + 1, y + 1);
            term(currentAnsi + batchedChars + '\x1b[0m');
        }
    }
    
    return changes;
}

module.exports = { Buffer, renderDiff }; 