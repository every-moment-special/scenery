// Movement Controller
// Handles keyboard input and character movement

class MovementController {
    constructor(animationManager, renderer) {
        this.animationManager = animationManager;
        this.renderer = renderer;
        
        // Character position
        this.characterX = 10;
        this.characterY = 5;
        
        // Movement state
        this.pressedKeys = new Set();
        this.keyTimeouts = new Map();
        this.lastMovementTime = 0;
        
        // Movement configuration
        this.movementSpeed = 100; // milliseconds between movement updates
        this.keyReleaseTimeout = 500; // milliseconds before auto-releasing a key
        this.movementStep = 2; // pixels per movement step
        
        this.setupInputHandlers();
    }

    // Setup input handlers
    setupInputHandlers() {
        this.renderer.setupInputHandlers({
            onKeyPress: (name) => this.handleKeyPress(name)
        });
    }

    // Handle key press
    handleKeyPress(name) {
        const currentTime = Date.now();
        
        // Handle movement keys
        if (['LEFT', 'RIGHT', 'UP', 'DOWN'].includes(name)) {
            this.handleMovementKey(name, currentTime);
        }
        
        // Handle quit
        if (name === 'q' || name === 'Q') {
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
        if (this.pressedKeys.size > 0 && currentTime - this.lastMovementTime > this.movementSpeed) {
            const oldX = this.characterX;
            const oldY = this.characterY;
            const terminalInfo = this.renderer.getTerminalInfo();
            
            // Process movement for each pressed key
            for (const key of this.pressedKeys) {
                this.processMovement(key, terminalInfo);
            }
            
            // Update movement state
            if (oldX !== this.characterX || oldY !== this.characterY) {
                this.animationManager.setMoving(true, currentTime);
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
        
        switch (key) {
            case 'LEFT':
                this.characterX = Math.max(0, this.characterX - this.movementStep);
                this.animationManager.setDirection('left');
                break;
            case 'RIGHT':
                this.characterX = Math.min(terminalInfo.width - spriteWidth, this.characterX + this.movementStep);
                this.animationManager.setDirection('right');
                break;
            case 'UP':
                this.characterY = Math.max(0, this.characterY - 1);
                this.animationManager.setDirection('up');
                break;
            case 'DOWN':
                this.characterY = Math.min(terminalInfo.height - spriteHeight - 3, this.characterY + 1);
                this.animationManager.setDirection('down');
                break;
        }
        
        // Constrain position to terminal bounds
        const constrained = this.renderer.constrainPosition(this.characterX, this.characterY, spriteWidth, spriteHeight);
        this.characterX = constrained.x;
        this.characterY = constrained.y;
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
        this.renderer.cleanup();
    }
}

module.exports = MovementController;
