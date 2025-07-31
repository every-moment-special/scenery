// Game Loop
// Main game loop that coordinates all game systems

const { CharacterAnimation, ANIMATION_CONFIG } = require('../animations/character');
const TerminalRender = require('../render/terminal');
const Render = require('../render/render');
const MovementController = require('../controllers/movement-controller');
const { NPCManager } = require('./npc-manager');
const MapManager = require('./map-manager');

class GameLoop {
    constructor() {
        // Initialize game systems
        this.animationManager = new CharacterAnimation();
        this.terminalRenderer = new TerminalRender();
        this.bufferedRenderer = new Render(this.terminalRenderer);
        this.renderer = this.bufferedRenderer;
        
        // Initialize movement controller with terminal renderer for input handling
        this.movementController = new MovementController(this.animationManager, this.terminalRenderer);
        
        this.npcManager = new NPCManager();
        this.mapManager = new MapManager();
        
        // Game state
        this.isRunning = false;
        this.lastFrameTime = 0;
        this.frameRate = 20; // Reduced from 30 to 20 FPS for better performance
        this.frameInterval = 1000 / this.frameRate;
        this.frameSkipThreshold = 2; // Skip frames if we're behind by this many
        this.maxFrameSkip = 3; // Maximum frames to skip
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 0;
        this.frameTimes = [];
        this.maxFrameTimeHistory = 30; // Keep last 30 frame times
        
        // Cached state for optimization
        this.lastRenderState = null;
        this.skipRender = false;
        this.lastRenderTime = 0;
        this.minRenderInterval = 50; // Minimum 50ms between renders (20 FPS max)
        
        // Bind methods
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        
        // Initialize NPCs
        this.initializeNPCs();
    }

    // Start the game loop
    start() {
        this.terminalRenderer.clearScreen();
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.gameLoop();
    }

    // Stop the game loop
    stop() {
        this.isRunning = false;
        this.movementController.cleanup();
        this.bufferedRenderer.cleanup();
    }

    // Main game loop with optimized timing
    gameLoop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        
        // Frame skipping logic
        let framesToSkip = 0;
        if (deltaTime > this.frameInterval * this.frameSkipThreshold) {
            framesToSkip = Math.min(
                Math.floor(deltaTime / this.frameInterval) - 1,
                this.maxFrameSkip
            );
        }

        // Update game state
        this.update(currentTime);
        
        // Skip rendering if we're behind schedule
        if (framesToSkip === 0) {
            this.render(currentTime);
        }
        
        this.lastFrameTime = currentTime;
        
        // Update performance metrics
        this.updatePerformanceMetrics(deltaTime, currentTime);
        
        // Schedule next frame using requestAnimationFrame if available, otherwise setTimeout
        if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(this.gameLoop);
        } else {
            setTimeout(() => this.gameLoop(), Math.max(1, this.frameInterval - deltaTime));
        }
    }

    // Update performance metrics
    updatePerformanceMetrics(deltaTime, currentTime) {
        this.frameCount++;
        this.frameTimes.push(deltaTime);
        
        // Keep only the last N frame times
        if (this.frameTimes.length > this.maxFrameTimeHistory) {
            this.frameTimes.shift();
        }
        
        // Update FPS every second
        if (currentTime - this.lastFPSUpdate >= 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
        }
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

    // Render the game with state caching
    render(currentTime) {
        // Enforce minimum render interval
        if (currentTime - this.lastRenderTime < this.minRenderInterval) {
            return;
        }
        
        this.lastRenderTime = currentTime;
        
        const position = this.movementController.getPosition();
        const currentSprite = this.animationManager.getCurrentSprite();
        const animationInfo = this.animationManager.getAnimationInfo();
        
        // Get all NPCs
        const npcs = this.npcManager.getAllNPCs();
        
        // Create current render state for comparison
        const currentRenderState = {
            position: { x: position.x, y: position.y },
            sprite: currentSprite,
            animationInfo: animationInfo,
            npcCount: npcs.length,
            npcStates: npcs.map(npc => ({
                id: npc.id,
                position: npc.getPosition(),
                sprite: npc.getCurrentSprite()
            }))
        };
        
        // Check if we can skip rendering (nothing changed)
        if (this.lastRenderState && this.statesEqual(this.lastRenderState, currentRenderState)) {
            // Skip rendering if nothing has changed
            this.skipRender = true;
            return;
        }
        
        this.skipRender = false;
        this.lastRenderState = currentRenderState;
        
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
        
        // Render map tiles first (background layer with z-index 0)
        this.mapManager.renderMap(this.renderer, position.x, position.y);
        
        // Render entities in z-order (background to foreground)
        entities.forEach((entity, index) => {
            const zIndex = 10 + index; // z-index 10, 11, 12, etc. (higher than map)
            
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
            npcCount: this.npcManager.getNPCCount(),
            mapStats: this.mapManager.getMapStats(),
            fps: this.currentFPS,
            frameTime: this.frameTimes.length > 0 ? 
                Math.round(this.frameTimes[this.frameTimes.length - 1]) : 0
        });
        
        // Render the buffer to terminal
        this.bufferedRenderer.render();
    }
    
    // Compare render states to determine if rendering can be skipped
    statesEqual(state1, state2) {
        if (!state1 || !state2) return false;
        
        // Compare position
        if (state1.position.x !== state2.position.x || state1.position.y !== state2.position.y) {
            return false;
        }
        
        // Compare animation info
        if (state1.animationInfo.frame !== state2.animationInfo.frame ||
            state1.animationInfo.isMoving !== state2.animationInfo.isMoving) {
            return false;
        }
        
        // Compare NPC states
        if (state1.npcCount !== state2.npcCount) {
            return false;
        }
        
        for (let i = 0; i < state1.npcStates.length; i++) {
            const npc1 = state1.npcStates[i];
            const npc2 = state2.npcStates[i];
            
            if (npc1.position.x !== npc2.position.x || npc1.position.y !== npc2.position.y) {
                return false;
            }
        }
        
        return true;
    }
    
    // Clear all entity positions
    clearAllEntityPositions(entities) {
        entities.forEach(entity => {
            if (entity.type === 'character') {
                this.renderer.clearArea(
                    entity.position.x, 
                    entity.position.y, 
                    ANIMATION_CONFIG.SPRITE_WIDTH, 
                    ANIMATION_CONFIG.SPRITE_HEIGHT,
                    5 // Use z-index 5 for clearing (higher than map, lower than entities)
                );
            } else if (entity.type === 'npc') {
                this.renderer.clearArea(
                    entity.position.x,
                    entity.position.y,
                    32, // NPC sprite width
                    22, // NPC sprite height
                    5 // Use z-index 5 for clearing
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
            map: this.mapManager.getMapStats(),
            npcs: this.npcManager.getAllNPCs().map(npc => ({
                id: npc.id,
                type: npc.type,
                position: npc.getPosition(),
                animation: npc.getAnimationInfo()
            })),
            isRunning: this.isRunning,
            performance: {
                fps: this.currentFPS,
                frameTime: this.frameTimes.length > 0 ? 
                    Math.round(this.frameTimes[this.frameTimes.length - 1]) : 0,
                averageFrameTime: this.frameTimes.length > 0 ? 
                    Math.round(this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length) : 0,
                skipRender: this.skipRender
            }
        };
    }

    // Reset game state
    reset() {
        this.animationManager.reset();
        this.movementController.reset();
        this.npcManager.clear();
        this.mapManager.initializeDefaultMap();
        this.initializeNPCs();
        this.bufferedRenderer.clear();
        this.bufferedRenderer.render();
        this.lastRenderState = null;
        this.frameTimes = [];
        this.frameCount = 0;
    }
}

module.exports = GameLoop;
