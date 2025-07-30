// Game Loop
// Main game loop that coordinates all game systems

const { CharacterAnimation, ANIMATION_CONFIG } = require('../animations/character');
const TerminalRenderer = require('../renderer/terminal-renderer');
const ImprovedBufferedRenderer = require('../renderer/improved-buffered-renderer');
const MovementController = require('../controllers/movement-controller');
const { NPCManager } = require('./npc-manager');

class GameLoop {
    constructor() {
        // Initialize game systems
        this.animationManager = new CharacterAnimation();
        this.terminalRenderer = new TerminalRenderer();
        this.bufferedRenderer = new ImprovedBufferedRenderer(this.terminalRenderer);
        this.renderer = this.bufferedRenderer; // Use improved buffered renderer as main renderer
        this.movementController = new MovementController(this.animationManager, this.renderer);
        this.npcManager = new NPCManager();
        
        // Game state
        this.isRunning = false;
        this.lastFrameTime = 0;
        this.frameRate = 60; // FPS
        this.frameInterval = 1000 / this.frameRate;
        
        // Bind methods
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
        
        // Initialize NPCs
        this.initializeNPCs();
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
        this.bufferedRenderer.cleanup();
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

    // Initialize NPCs
    initializeNPCs() {
        // Add some elk NPCs at different positions
        this.npcManager.addNPC('elk', 20, 8);
        // this.npcManager.addNPC('elk', 35, 12);
        // this.npcManager.addNPC('elk', 15, 15);
    }

    // Update game state
    update(currentTime) {
        // Update movement
        this.movementController.updateMovement(currentTime);
        
        // Update animation
        this.animationManager.updateFrame(currentTime);
        
        // Update NPCs
        this.npcManager.update(currentTime);
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
        
        // Render character at current position (z-index 2 - highest priority)
        this.renderer.renderSprite(position.x, position.y, currentSprite, 2);
        
        // Render all NPCs
        this.renderNPCs();
        
        // Display UI
        this.renderer.displayUI({
            x: position.x,
            y: position.y,
            direction: animationInfo.direction,
            frame: animationInfo.frame,
            isMoving: animationInfo.isMoving,
            npcCount: this.npcManager.getNPCCount()
        });
        
        // Render the buffer to terminal
        this.bufferedRenderer.render();
    }
    
    // Render all NPCs
    renderNPCs() {
        const npcs = this.npcManager.getAllNPCs();
        
        for (const npc of npcs) {
            const position = npc.getPosition();
            const sprite = npc.getCurrentSprite();
            
            // Clear previous NPC position
            this.renderer.clearArea(
                position.x,
                position.y,
                32, // NPC sprite width
                22  // NPC sprite height
            );
            
            // Render NPC (z-index 1 - background)
            this.renderer.renderSprite(position.x, position.y, sprite, 1);
        }
    }

    // Get game state for debugging
    getGameState() {
        return {
            animation: this.animationManager.getAnimationInfo(),
            movement: this.movementController.getMovementInfo(),
            terminal: this.renderer.getTerminalInfo(),
            npcs: this.npcManager.getAllNPCs().map(npc => ({
                id: npc.id,
                type: npc.type,
                position: npc.getPosition(),
                animation: npc.getAnimationInfo()
            })),
            isRunning: this.isRunning
        };
    }

    // Reset game state
    reset() {
        this.animationManager.reset();
        this.movementController.reset();
        this.npcManager.clear();
        this.initializeNPCs();
        this.bufferedRenderer.clear();
        this.bufferedRenderer.render();
    }
}

module.exports = GameLoop;
