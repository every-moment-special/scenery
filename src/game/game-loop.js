// Game Loop
// Main game loop that coordinates all game systems

const { CharacterAnimation, ANIMATION_CONFIG } = require('../animations/character');
const TerminalRender = require('../render/terminal');
const Render = require('../render/render');
const MovementController = require('../controllers/movement-controller');
const { NPCManager } = require('./npc-manager');

class GameLoop {
    constructor() {
        // Initialize game systems
        this.animationManager = new CharacterAnimation();
        this.terminalRenderer = new TerminalRender();
        this.bufferedRenderer = new Render(this.terminalRenderer);
        this.renderer = this.bufferedRenderer;
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
        this.terminalRenderer.clearScreen();
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
        
        // Get all NPCs
        const npcs = this.npcManager.getAllNPCs();
        
        // Create a list of all entities to render (character + NPCs)
        const entities = [
            {
                type: 'character',
                position: position,
                sprite: currentSprite,
                y: position.y
            },
            ...npcs.map(npc => ({
                type: 'npc',
                position: npc.getPosition(),
                sprite: npc.getCurrentSprite(),
                y: npc.getPosition().y
            }))
        ];
        
        // Sort entities by y-position (lower y = rendered first/behind)
        entities.sort((a, b) => a.y - b.y);
        
        // Clear all previous positions
        this.clearAllEntityPositions(entities);
        
        // Render entities in z-order (background to foreground)
        entities.forEach((entity, index) => {
            const zIndex = index + 1; // z-index 1, 2, 3, etc.
            
            if (entity.type === 'character') {
                this.renderer.renderSprite(entity.position.x, entity.position.y, entity.sprite, zIndex);
            } else if (entity.type === 'npc') {
                this.renderer.renderSprite(entity.position.x, entity.position.y, entity.sprite, zIndex);
            }
        });
        
        // Display UI (highest z-index)
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
    
    // Clear all entity positions
    clearAllEntityPositions(entities) {
        entities.forEach(entity => {
            if (entity.type === 'character') {
                this.renderer.clearArea(
                    entity.position.x, 
                    entity.position.y, 
                    ANIMATION_CONFIG.SPRITE_WIDTH, 
                    ANIMATION_CONFIG.SPRITE_HEIGHT
                );
            } else if (entity.type === 'npc') {
                this.renderer.clearArea(
                    entity.position.x,
                    entity.position.y,
                    32, // NPC sprite width
                    22  // NPC sprite height
                );
            }
        });
    }
    
    // Render all NPCs (deprecated - now handled in main render method)
    renderNPCs() {
        // This method is now deprecated as NPCs are rendered in the main render method
        // with proper z-layering
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
