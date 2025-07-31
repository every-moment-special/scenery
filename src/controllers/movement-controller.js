// Movement Controller
// Handles keyboard input and character movement

class MovementController {
    constructor(animationManager, terminalRenderer) {
        this.animationManager = animationManager;
        this.terminalRenderer = terminalRenderer;
        
        // Character position
        this.characterX = 10;
        this.characterY = 5;
        
        // Movement state
        this.pressedKeys = new Set();
        this.keyTimeouts = new Map();
        this.lastMovementTime = 0;
        
        // Movement configuration
        this.movementSpeed = 50; // milliseconds between movement updates (reduced from 100)
        this.keyReleaseTimeout = 500; // milliseconds before auto-releasing a key
        this.movementStep = 2; // pixels per movement step
        
        this.setupInputHandlers();
    }

    // Setup input handlers
    setupInputHandlers() {
        this.terminalRenderer.setupInputHandlers({
            onKeyPress: (name) => this.handleKeyPress(name)
        });
    }

    // Handle key press
    handleKeyPress(name) {
        const currentTime = performance.now();
        
        // Debug: log all key presses to see what we're receiving
        // console.log(`DEBUG: Key pressed: "${name}"`);
        
        // Map terminal-kit key names to our movement keys
        let movementKey = null;
        switch (name) {
            case 'LEFT':
            case 'left':
            case 'LEFT_ARROW':
            case '\u001b[D': // Left arrow escape sequence
                movementKey = 'LEFT';
                break;
            case 'RIGHT':
            case 'right':
            case 'RIGHT_ARROW':
            case '\u001b[C': // Right arrow escape sequence
                movementKey = 'RIGHT';
                break;
            case 'UP':
            case 'up':
            case 'UP_ARROW':
            case '\u001b[A': // Up arrow escape sequence
                movementKey = 'UP';
                break;
            case 'DOWN':
            case 'down':
            case 'DOWN_ARROW':
            case '\u001b[B': // Down arrow escape sequence
                movementKey = 'DOWN';
                break;
        }
        
        // Handle movement keys
        if (movementKey) {
            // console.log(`DEBUG: Mapped to movement key: ${movementKey}`);
            this.handleMovementKey(movementKey, currentTime);
        }
        
        // Handle quit
        if (name === 'q' || name === 'Q' || name === 'CTRL_C') {
            this.cleanup();
            process.exit(0);
        }
    }

    // Handle movement key press
    handleMovementKey(keyName, currentTime) {
        // Clear any existing timeout for this key
        if (this.keyTimeouts.has(keyName)) {
            clearTimeout(this.keyTimeouts.get(keyName));
        }
        
        // Add key to pressed keys set
        this.pressedKeys.add(keyName);
        
        // Set a timeout to auto-release this key
        const timeout = setTimeout(() => {
            this.pressedKeys.delete(keyName);
            this.keyTimeouts.delete(keyName);
            
            // If no keys are pressed, stop movement
            if (this.pressedKeys.size === 0) {
                this.animationManager.setMoving(false, currentTime);
            }
        }, this.keyReleaseTimeout);
        
        this.keyTimeouts.set(keyName, timeout);
        
        // Start movement immediately for the first press
        if (this.pressedKeys.size === 1) {
            this.lastMovementTime = currentTime - this.movementSpeed;
        }
    }

    // Update movement based on pressed keys
    updateMovement(currentTime) {
        // console.log(`DEBUG: updateMovement called, pressedKeys: ${Array.from(this.pressedKeys)}`);
        
        if (this.pressedKeys.size > 0 && currentTime - this.lastMovementTime > this.movementSpeed) {
            const oldX = this.characterX;
            const oldY = this.characterY;
            const terminalInfo = this.terminalRenderer.getTerminalInfo();
            
            // console.log(`DEBUG: Processing movement, old position: (${oldX}, ${oldY})`);
            
            // Process movement for each pressed key
            for (const key of this.pressedKeys) {
                this.processMovement(key, terminalInfo);
            }
            
            // console.log(`DEBUG: New      ition: (${this.characterX}, ${this.characterY})`);
            
            // Update movement state
            if (oldX !== this.characterX || oldY !== this.characterY) {
                this.animationManager.setMoving(true, currentTime);
                // console.log(`DEBUG: Position changed, setting moving to true`);
            }
            
            this.lastMovementTime = currentTime;
        }
        
        // Check if movement should stop
        if (this.animationManager.shouldStopMoving(currentTime)) {
            this.animationManager.setMoving(false, currentTime);
        }
    }

    // Process movement for a specific key
    processMovement(key, terminalInfo) {
        const spriteWidth = 32; // From animation config
        const spriteHeight = 22; // From animation config
        
        // console.log(`DEBUG: Processing movement for key: ${key}, current position: (${this.characterX}, ${this.characterY})`);
        
        switch (key) {
            case 'LEFT':
                this.characterX = Math.max(0, this.characterX - this.movementStep);
                this.animationManager.setDirection('left');
                // console.log(`DEBUG: LEFT movement, new X: ${this.characterX}`);
                break;
            case 'RIGHT':
                this.characterX = Math.min(terminalInfo.width - spriteWidth, this.characterX + this.movementStep);
                this.animationManager.setDirection('right');
                // console.log(`DEBUG: RIGHT movement, new X: ${this.characterX}`);
                break;
            case 'UP':
                this.characterY = Math.max(0, this.characterY - 1);
                this.animationManager.setDirection('up');
                // console.log(`DEBUG: UP movement, new Y: ${this.characterY}`);
                break;
            case 'DOWN':
                this.characterY = Math.min(terminalInfo.height - spriteHeight - 3, this.characterY + 1);
                this.animationManager.setDirection('down');
                // console.log(`DEBUG: DOWN movement, new Y: ${this.characterY}`);
                break;
        }
        
        // Constrain position to terminal bounds
        const constrained = this.terminalRenderer.constrainPosition(this.characterX, this.characterY, spriteWidth, spriteHeight);
        this.characterX = constrained.x;
        this.characterY = constrained.y;
        
        // console.log(`DEBUG: After constraint: (${this.characterX}, ${this.characterY})`);
    }

    // Get current character position
    getPosition() {
        return {
            x: this.characterX,
            y: this.characterY
        };
    }

    // Set character position
    setPosition(x, y) {
        this.characterX = x;
        this.characterY = y;
    }

    // Get movement info for debugging
    getMovementInfo() {
        return {
            position: this.getPosition(),
            pressedKeys: Array.from(this.pressedKeys),
            isMoving: this.animationManager.isMoving,
            lastMovementTime: this.lastMovementTime
        };
    }

    // Reset movement state
    reset() {
        this.pressedKeys.clear();
        this.keyTimeouts.forEach(timeout => clearTimeout(timeout));
        this.keyTimeouts.clear();
        this.lastMovementTime = 0;
        this.animationManager.reset();
    }

    // Cleanup
    cleanup() {
        this.keyTimeouts.forEach(timeout => clearTimeout(timeout));
        this.terminalRenderer.cleanup();
    }
}

module.exports = MovementController;
