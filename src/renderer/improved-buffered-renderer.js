// Improved Buffered Renderer
// Uses Map-based frame buffer with proper ANSI parsing

const { ImprovedFrameBuffer, renderDiff } = require('./improved-frame-buffer');

class ImprovedBufferedRenderer {
    constructor(terminalRenderer) {
        this.terminalRenderer = terminalRenderer;
        this.term = terminalRenderer.term;
        
        // Get terminal dimensions
        const dimensions = this.terminalRenderer.getTerminalInfo();
        this.currentBuffer = new ImprovedFrameBuffer(dimensions.width, dimensions.height - 3);
        this.previousBuffer = new ImprovedFrameBuffer(dimensions.width, dimensions.height - 3);
        
        this.isInitialized = true;
    }

    // Handle terminal resize
    handleResize() {
        const newDimensions = this.terminalRenderer.getTerminalInfo();
        this.currentBuffer = new ImprovedFrameBuffer(newDimensions.width, newDimensions.height - 3);
        this.previousBuffer = new ImprovedFrameBuffer(newDimensions.width, newDimensions.height - 3);
    }

    // Clear a rectangular area
    clearArea(x, y, width, height) {
        for (let sy = 0; sy < height; sy++) {
            for (let sx = 0; sx < width; sx++) {
                const cellX = x + sx;
                const cellY = y + sy;
                
                if (cellX >= 0 && cellX < this.currentBuffer.width && 
                    cellY >= 0 && cellY < this.currentBuffer.height) {
                    this.currentBuffer.setCell(cellX, cellY, ' ', '', 0);
                }
            }
        }
    }

    // Render a sprite at position
    renderSprite(x, y, sprite, z = 0) {
        if (!this.isInitialized) return;
        this.currentBuffer.setSprite(x, y, sprite, z);
    }

    // Render text at position
    renderText(x, y, text, ansi = '', z = 0) {
        if (!this.isInitialized || !text) return;
        this.currentBuffer.setText(x, y, text, ansi, z);
    }

    // Render a single character
    renderChar(x, y, char, ansi = '', z = 0) {
        if (!this.isInitialized) return;
        this.currentBuffer.setCell(x, y, char, ansi, z);
    }

    // Clear the entire buffer
    clear() {
        if (!this.isInitialized) return;
        this.currentBuffer.clear();
    }

    // Display UI information (compatibility with existing code)
    displayUI(info) {
        if (!this.isInitialized) return;
        
        const height = this.currentBuffer.height;
        const uiY = height - 2;
        
        // Clear UI area
        this.clearArea(0, uiY, this.currentBuffer.width, 2);
        
        // Render UI text (z-index 3 - highest priority for UI)
        const uiText = `Position: (${info.x}, ${info.y}) | Direction: ${info.direction.toUpperCase()} | Frame: ${info.frame} | Moving: ${info.isMoving ? 'Yes' : 'No'} | NPCs: ${info.npcCount || 0}`;
        this.renderText(0, uiY, uiText, '', 3);
        
        const controlsText = 'Use arrow keys to move, Q to quit';
        this.renderText(0, uiY + 1, controlsText, '', 3);
    }

    // Render the buffer to terminal
    render() {
        if (!this.isInitialized) return;

        // Render diff and get change count
        const changes = renderDiff(this.currentBuffer, this.previousBuffer, this.term);
        
        // Swap buffers
        const temp = this.previousBuffer;
        this.previousBuffer = this.currentBuffer;
        this.currentBuffer = temp;
        
        // Clear current buffer for next frame
        this.currentBuffer.clear();
        
        return changes;
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

    // Force a full redraw (useful for debugging or terminal corruption)
    forceFullRedraw() {
        if (!this.isInitialized) return;
        
        this.terminalRenderer.clearScreen();
        this.previousBuffer.clear(); // Force full diff on next render
        this.render();
    }

    // Get renderer statistics
    getStats() {
        if (!this.isInitialized) {
            return { error: 'Renderer not initialized' };
        }
        
        const currentStats = this.currentBuffer.getStats();
        const previousStats = this.previousBuffer.getStats();
        
        return {
            ...currentStats,
            previousUsedCells: previousStats.usedCells,
            isInitialized: this.isInitialized
        };
    }

    // Cleanup
    cleanup() {
        this.isInitialized = false;
        this.currentBuffer = null;
        this.previousBuffer = null;
    }
}

module.exports = ImprovedBufferedRenderer; 