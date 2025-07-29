// Improved Frame Buffer System
// Based on the example with Map-based storage and proper ANSI parsing

class ImprovedFrameBuffer {
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

        // Replace only if new z-index is higher or same
        if (!existing || z >= existing.z) {
            this.buffer.set(key, { char, ansi, z });
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
                        this.setCell(screenX, y + spriteY, char, currentAnsi, z);
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

    // Set text with optional ANSI color
    setText(x, y, text, ansi = '', z = 0) {
        for (let i = 0; i < text.length; i++) {
            const charX = x + i;
            if (charX < this.width) {
                this.setCell(charX, y, text[i], ansi, z);
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
    
    for (const [key, cell] of current.getEntries()) {
        const [x, y] = key.split(',').map(Number);
        const prev = previous.getCell(x, y);

        if (!prev || prev.char !== cell.char || prev.ansi !== cell.ansi) {
            term.moveTo(x + 1, y + 1);
            term(cell.ansi + cell.char + '\x1b[0m');
            changes++;
        }
    }
    
    return changes;
}

module.exports = { ImprovedFrameBuffer, renderDiff }; 