// Game Loop
// Main game loop that coordinates all game systems

const { CharacterAnimation, ANIMATION_CONFIG } = require('../animations/character');
const TerminalRenderer = require('../renderer/terminal-renderer');
const MovementController = require('../controllers/movement-controller');

class GameLoop {
    constructor() {
        // Initialize game systems
        this.animationManager = new CharacterAnimation();
        this.renderer = new TerminalRenderer();
        this.movementController = new MovementController(this.animationManager, this.renderer);
        
        // Game state
        this.isRunning = false;
        this.lastFrameTime = 0;
        this.frameRate = 60; // FPS
        this.frameInterval = 1000 / this.frameRate;
        
        // Bind methods
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
    }

    // Start the game loop
    start() {
        this.isRunning = true;
        this.lastFrameTime = Date.now();
        this.gameLoop();
    }

    // Stop the game loop
    stop() {
        this.isRunning = false;
        this.movementController.cleanup();
    }

    // Main game loop
    gameLoop() {
        if (!this.isRunning) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastFrameTime;

        if (deltaTime >= this.frameInterval) {
            this.update(currentTime);
            this.render(currentTime);
            this.lastFrameTime = currentTime;
        }

        // Schedule next frame
        setTimeout(() => this.gameLoop(), 1);
    }

    // Update game state
    update(currentTime) {
        // Update movement
        this.movementController.updateMovement(currentTime);
        
        // Update animation
        this.animationManager.updateFrame(currentTime);
    }

    // Render the game
    render(currentTime) {
        const position = this.movementController.getPosition();
        const currentSprite = this.animationManager.getCurrentSprite();
        const animationInfo = this.animationManager.getAnimationInfo();
        
        // Clear previous character position
        this.renderer.clearArea(
            position.x, 
            position.y, 
            ANIMATION_CONFIG.SPRITE_WIDTH, 
            ANIMATION_CONFIG.SPRITE_HEIGHT
        );
        
        // Render character at current position
        this.renderer.renderSprite(position.x, position.y, currentSprite);
        
        // Display UI
        this.renderer.displayUI({
            x: position.x,
            y: position.y,
            direction: animationInfo.direction,
            frame: animationInfo.frame,
            isMoving: animationInfo.isMoving
        });
    }

    // Get game state for debugging
    getGameState() {
        return {
            animation: this.animationManager.getAnimationInfo(),
            movement: this.movementController.getMovementInfo(),
            terminal: this.renderer.getTerminalInfo(),
            isRunning: this.isRunning
        };
    }

    // Reset game state
    reset() {
        this.animationManager.reset();
        this.movementController.reset();
        this.renderer.clearScreen();
    }
}

module.exports = GameLoop;
