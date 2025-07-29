// Buffered Renderer
// Uses FrameBuffer for efficient rendering with diffing

const { FrameBuffer } = require('./frame-buffer');

class BufferedRenderer {
    constructor(terminalRenderer) {
        this.terminalRenderer = terminalRenderer;
        this.frameBuffer = null;
        this.isInitialized = false;
        
        // Get terminal dimensions and initialize buffer
        this.initializeBuffer();
        
        // Bind methods
        this.render = this.render.bind(this);
        this.clearArea = this.clearArea.bind(this);
        this.renderSprite = this.renderSprite.bind(this);
    }

    // Initialize the frame buffer
    initializeBuffer() {
        const dimensions = this.terminalRenderer.getTerminalInfo();
        this.frameBuffer = new FrameBuffer(dimensions.width, dimensions.height);
        this.isInitialized = true;
    }

    // Handle terminal resize
    handleResize() {
        const newDimensions = this.terminalRenderer.getTerminalInfo();
        if (this.frameBuffer) {
            this.frameBuffer.resize(newDimensions.width, newDimensions.height);
        } else {
            this.initializeBuffer();
        }
    }

    // Clear a rectangular area in the buffer
    clearArea(x, y, width, height) {
        if (!this.isInitialized) return;
        this.frameBuffer.clearArea(x, y, width, height);
    }

    // Render a sprite at position in the buffer
    renderSprite(x, y, sprite, color = null, zIndex = 0) {
        if (!this.isInitialized) return;
        this.frameBuffer.setCells(x, y, sprite, color, zIndex);
    }

    // Render text at position
    renderText(x, y, text, color = null, zIndex = 0) {
        if (!this.isInitialized || !text) return;
        
        for (let i = 0; i < text.length; i++) {
            const charX = x + i;
            if (charX < this.frameBuffer.width) {
                this.frameBuffer.setCell(charX, y, text[i], color, zIndex);
            }
        }
    }

    // Render a single character
    renderChar(x, y, char, color = null, zIndex = 0) {
        if (!this.isInitialized) return;
        this.frameBuffer.setCell(x, y, char, color, zIndex);
    }

    // Display UI information (compatibility with existing code)
    displayUI(info) {
        if (!this.isInitialized) return;
        
        const height = this.frameBuffer.height;
        const uiY = height - 2;
        
        // Clear UI area
        this.frameBuffer.clearArea(0, uiY, this.frameBuffer.width, 2);
        
        // Render UI text (simplified for now)
        const uiText = `Position: (${info.x}, ${info.y}) | Direction: ${info.direction.toUpperCase()} | Frame: ${info.frame} | Moving: ${info.isMoving ? 'Yes' : 'No'} | NPCs: ${info.npcCount || 0}`;
        this.renderText(0, uiY, uiText);
        
        const controlsText = 'Use arrow keys to move, Q to quit';
        this.renderText(0, uiY + 1, controlsText);
    }

    // Setup input handlers (delegate to terminal renderer)
    setupInputHandlers(handlers) {
        this.terminalRenderer.setupInputHandlers(handlers);
    }

    // Get terminal info (delegate to terminal renderer)
    getTerminalInfo() {
        return this.terminalRenderer.getTerminalInfo();
    }

    // Clear screen (delegate to terminal renderer)
    clearScreen() {
        this.terminalRenderer.clearScreen();
    }

    // Constrain position within terminal bounds (delegate to terminal renderer)
    constrainPosition(x, y, spriteWidth, spriteHeight) {
        return this.terminalRenderer.constrainPosition(x, y, spriteWidth, spriteHeight);
    }

    // Clear the entire buffer
    clear() {
        if (!this.isInitialized) return;
        this.frameBuffer.clear();
    }

    // Render the buffer to terminal
    render() {
        if (!this.isInitialized) return;

        // Get optimized diff (only changed cells)
        const diff = this.frameBuffer.getOptimizedDiff();
        
        if (diff.length === 0) {
            return; // No changes to render
        }

        // Group changes by row for efficient terminal updates
        const changesByRow = this.groupChangesByRow(diff);
        
        // Apply changes to terminal
        this.applyChangesToTerminal(changesByRow);
        
        // Swap buffers for next frame
        this.frameBuffer.swapBuffers();
    }

    // Group changes by row for efficient rendering
    groupChangesByRow(diff) {
        const changesByRow = {};
        
        for (const change of diff) {
            const { x, y, current } = change;
            
            if (!changesByRow[y]) {
                changesByRow[y] = [];
            }
            
            changesByRow[y].push({
                x, y, current
            });
        }
        
        return changesByRow;
    }

    // Apply changes to terminal efficiently
    applyChangesToTerminal(changesByRow) {
        const term = this.terminalRenderer.term;
        
        for (const [row, changes] of Object.entries(changesByRow)) {
            const y = parseInt(row);
            
            // Sort changes by x position for efficient rendering
            changes.sort((a, b) => a.x - b.x);
            
            // Group consecutive changes for batch rendering
            const batches = this.groupConsecutiveChanges(changes);
            
            for (const batch of batches) {
                this.renderBatch(term, y, batch);
            }
        }
    }

    // Group consecutive changes for batch rendering
    groupConsecutiveChanges(changes) {
        if (changes.length === 0) return [];
        
        const batches = [];
        let currentBatch = [changes[0]];
        
        for (let i = 1; i < changes.length; i++) {
            const current = changes[i];
            const lastInBatch = currentBatch[currentBatch.length - 1];
            
            // Check if this change is consecutive to the last one
            if (current.x === lastInBatch.x + 1) {
                currentBatch.push(current);
            } else {
                batches.push(currentBatch);
                currentBatch = [current];
            }
        }
        
        batches.push(currentBatch);
        return batches;
    }

    // Render a batch of consecutive changes
    renderBatch(term, y, batch) {
        if (batch.length === 0) return;
        
        // Group by row and use the same ANSI format as original renderer
        const changesByRow = {};
        for (const change of batch) {
            const { x, y, current } = change;
            if (!changesByRow[y]) {
                changesByRow[y] = [];
            }
            changesByRow[y].push({ x, current });
        }
        
        // Render each row using the same method as original renderer
        for (const [rowY, changes] of Object.entries(changesByRow)) {
            const y = parseInt(rowY);
            const screenY = y + 1;
            
            // Sort changes by x position
            changes.sort((a, b) => a.x - b.x);
            
            // Build output string like original renderer
            let output = '';
            for (const change of changes) {
                const screenX = change.x + 1;
                output += `\x1b[${screenY};${screenX}H`;
                
                // Handle sprite lines (with ANSI codes) vs regular characters
                if (change.current.isSpriteLine) {
                    output += change.current.character; // Full sprite line with ANSI codes
                } else {
                    output += change.current.character; // Regular character
                }
            }
            
            if (output.length > 0) {
                process.stdout.write(output);
            }
        }
    }

    // Force a full redraw (useful for debugging or terminal corruption)
    forceFullRedraw() {
        if (!this.isInitialized) return;
        
        this.terminalRenderer.clearScreen();
        this.frameBuffer.fullRedraw = true;
        this.render();
    }

    // Get renderer statistics
    getStats() {
        if (!this.isInitialized) {
            return { error: 'Renderer not initialized' };
        }
        
        const bufferStats = this.frameBuffer.getStats();
        const diff = this.frameBuffer.getOptimizedDiff();
        
        return {
            ...bufferStats,
            changesThisFrame: diff.length,
            isInitialized: this.isInitialized
        };
    }

    // Cleanup
    cleanup() {
        this.isInitialized = false;
        this.frameBuffer = null;
    }
}

module.exports = BufferedRenderer; 