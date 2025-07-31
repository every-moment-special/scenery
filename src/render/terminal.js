// Terminal Renderer
// Handles all terminal-specific rendering operations

const termkit = require('terminal-kit');

class TerminalRender {
    constructor() {
        this.term = termkit.terminal;
        this.setupTerminal();
    }

    // Setup terminal for rendering
    setupTerminal() {
        // Enable raw mode and grab input
        this.term.grabInput();
        
        // Set up resize handler
        process.stdout.on('resize', () => this.handleResize());
    }

    // Get terminal dimensions
    getTerminalWidth() {
        return process.stdout.columns || 80;
    }

    getTerminalHeight() {
        return process.stdout.rows || 24;
    }

    // Handle terminal resize
    handleResize() {
        const oldWidth = this.getTerminalWidth();
        const oldHeight = this.getTerminalHeight();
        
        setTimeout(() => {
            const newWidth = this.getTerminalWidth();
            const newHeight = this.getTerminalHeight();
            
            if (oldWidth !== newWidth || oldHeight !== newHeight) {
                this.clearScreen();
            }
        }, 100);
    }

    // Clear the entire screen
    clearScreen() {
        this.term.clear();
    }

    // Clear a specific area
    clearArea(x, y, width, height) {
        const termHeight = this.getTerminalHeight();
        
        let clearOutput = '';
        for (let sy = 0; sy < height; sy++) {
            const screenY = y + sy;
            if (screenY >= 0 && screenY < termHeight - 3) {
                clearOutput += `\x1b[${screenY + 1};${x + 1}H`;
                clearOutput += ' '.repeat(width);
            }
        }
        
        if (clearOutput.length > 0) {
            process.stdout.write(clearOutput);
        }
    }

    // Render sprite at position
    renderSprite(x, y, sprite) {
        const spriteHeight = sprite.length;
        const spriteWidth = sprite[0].length;
        const width = this.getTerminalWidth();
        const height = this.getTerminalHeight();
        
        let spriteOutput = '';
        for (let sy = 0; sy < spriteHeight; sy++) {
            const screenY = y + sy;
            if (screenY >= 0 && screenY < height - 3) {
                spriteOutput += `\x1b[${screenY + 1};${x + 1}H`;
                
                const screenX = x;
                if (screenX >= 0 && screenX < width) {
                    spriteOutput += sprite[sy];
                }
            }
        }
        
        if (spriteOutput.length > 0) {
            process.stdout.write(spriteOutput);
        }
    }

    // Constrain position within terminal bounds
    constrainPosition(x, y, spriteWidth, spriteHeight) {
        const width = this.getTerminalWidth();
        const height = this.getTerminalHeight();
        
        const constrainedX = Math.max(0, Math.min(width - spriteWidth, x));
        const constrainedY = Math.max(0, Math.min(height - spriteHeight - 3, y));
        
        return { x: constrainedX, y: constrainedY };
    }

    // Display UI information
    displayUI(info) {
        const height = this.getTerminalHeight();
        this.term.moveTo(1, height - 2);
        
        // Uncomment for debugging info
        // this.term(`Position: (${info.x}, ${info.y}) | Direction: ${info.direction.toUpperCase()} | Frame: ${info.frame} | Moving: ${info.isMoving ? 'Yes' : 'No'} | NPCs: ${info.npcCount || 0}\n`);
        // this.term('Use arrow keys to move, Q to quit\n');
    }

    // Setup input handling
    setupInputHandlers(handlers) {
        // Remove any existing listeners
        this.term.removeAllListeners('key');
        
        // Use the standard terminal-kit key event
        this.term.on('key', (name) => {
            // console.log(`DEBUG: Terminal received key: "${name}"`);
            if (handlers.onKeyPress) {
                handlers.onKeyPress(name);
            }
        });
        
        // Also try using the raw input method
        this.term.on('input', (name) => {
            // console.log(`DEBUG: Terminal received input: "${name}"`);
            if (handlers.onKeyPress) {
                handlers.onKeyPress(name);
            }
        });
        
        // Alternative: Use process.stdin for raw input
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', (data) => {
            const key = data.toString();
            // console.log(`DEBUG: Process.stdin received: "${key}"`);
            if (handlers.onKeyPress) {
                handlers.onKeyPress(key);
            }
        });
        
        // console.log('DEBUG: Input handlers set up - listening for keys, input, and stdin');
    }

    // Cleanup terminal
    cleanup() {
        this.term.removeAllListeners('key');
        this.term.grabInput(false);
        this.term.clear();
    }

    // Get terminal info
    getTerminalInfo() {
        return {
            width: this.getTerminalWidth(),
            height: this.getTerminalHeight()
        };
    }
}

module.exports = TerminalRender;
