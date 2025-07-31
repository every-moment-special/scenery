// Improved Buffered Renderer
// Uses Map-based frame buffer with proper ANSI parsing

const { Buffer, renderDiff } = require('./buffer');

class Render {
    constructor(terminalRenderer) {
        this.terminalRenderer = terminalRenderer;
        this.term = terminalRenderer.term;
        
        // Get terminal dimensions
        const dimensions = this.terminalRenderer.getTerminalInfo();
        this.currentBuffer = new Buffer(dimensions.width, dimensions.height - 3);
        this.previousBuffer = new Buffer(dimensions.width, dimensions.height - 3);
        
        this.isInitialized = true;
        
        // Performance optimizations
        this.lastRenderTime = 0;
        this.renderSkipThreshold = 33; // Skip rendering if less than 33ms since last render (30 FPS max)
        this.changeCount = 0;
        this.totalRenders = 0;
        this.minimumRenderInterval = 16; // Minimum 16ms between renders (60 FPS max)
        
        // State caching for optimization
        this.lastRenderState = null;
        this.skipRenderCount = 0;
        this.forceRenderCount = 0;
    }

    // Handle terminal resize
    handleResize() {
        const newDimensions = this.terminalRenderer.getTerminalInfo();
        this.currentBuffer = new Buffer(newDimensions.width, newDimensions.height - 3);
        this.previousBuffer = new Buffer(newDimensions.width, newDimensions.height - 3);
        this.lastRenderState = null; // Reset state cache on resize
    }

    // Clear a rectangular area
    clearArea(x, y, width, height, z = 0) {
        for (let sy = 0; sy < height; sy++) {
            for (let sx = 0; sx < width; sx++) {
                const cellX = x + sx;
                const cellY = y + sy;
                
                if (cellX >= 0 && cellX < this.currentBuffer.width && 
                    cellY >= 0 && cellY < this.currentBuffer.height) {
                    this.currentBuffer.setCell(cellX, cellY, ' ', '', z);
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
        
        // Build UI text with performance metrics
        let uiText = `Position: (${info.x}, ${info.y}) | Direction: ${info.direction.toUpperCase()} | Frame: ${info.frame} | Moving: ${info.isMoving ? 'Yes' : 'No'} | NPCs: ${info.npcCount || 0}`;
        
        // Add performance metrics if available
        if (info.fps !== undefined) {
            uiText += ` | FPS: ${info.fps}`;
        }
        if (info.frameTime !== undefined) {
            uiText += ` | Frame: ${info.frameTime}ms`;
        }
        
        this.renderText(0, uiY, uiText, '', 100);
        
        // Add map information if available
        let controlsText = 'Use arrow keys to move, Q to quit';
        if (info.mapStats) {
            controlsText = `Map: ${info.mapStats.width}x${info.mapStats.height} | Grass: ${info.mapStats.grassTiles} | ${controlsText}`;
        }
        
        // Add render statistics with improved calculation
        if (this.totalRenders > 0) {
            const efficiency = Math.max(0, Math.min(100, ((this.totalRenders - this.changeCount) / this.totalRenders * 100)));
            controlsText += ` | Render Efficiency: ${efficiency.toFixed(1)}%`;
        }
        
        this.renderText(0, uiY + 1, controlsText, '', 100);
    }

    // Render the buffer to terminal with performance optimization
    render() {
        if (!this.isInitialized) return 0;

        const currentTime = performance.now();
        
        // Enforce minimum render interval to prevent excessive rendering
        if (currentTime - this.lastRenderTime < this.minimumRenderInterval) {
            this.skipRenderCount++;
            return 0;
        }
        
        // Skip rendering if too soon since last render (frame rate limiting)
        if (currentTime - this.lastRenderTime < this.renderSkipThreshold) {
            this.skipRenderCount++;
            return 0;
        }
        
        this.lastRenderTime = currentTime;
        this.totalRenders++;

        // Render diff and get change count
        const changes = renderDiff(this.currentBuffer, this.previousBuffer, this.term);
        this.changeCount += changes;
        
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
        this.lastRenderState = null; // Reset state cache
        this.render();
    }

    // Get renderer statistics
    getStats() {
        if (!this.isInitialized) {
            return { error: 'Renderer not initialized' };
        }
        
        const currentStats = this.currentBuffer.getStats();
        const previousStats = this.previousBuffer.getStats();
        
        // Calculate efficiency with bounds checking
        let efficiency = 0;
        if (this.totalRenders > 0) {
            efficiency = Math.max(0, Math.min(100, ((this.totalRenders - this.changeCount) / this.totalRenders * 100)));
        }
        
        return {
            ...currentStats,
            previousUsedCells: previousStats.usedCells,
            isInitialized: this.isInitialized,
            performance: {
                totalRenders: this.totalRenders,
                changeCount: this.changeCount,
                efficiency: efficiency.toFixed(1) + '%',
                lastRenderTime: this.lastRenderTime,
                skipRenderCount: this.skipRenderCount,
                forceRenderCount: this.forceRenderCount
            }
        };
    }

    // Cleanup
    cleanup() {
        this.isInitialized = false;
        this.currentBuffer = null;
        this.previousBuffer = null;
    }
}

module.exports = Render; 