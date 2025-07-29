// NPC Manager
// Manages all NPCs in the game world

const { ElkAnimation } = require('../animations/elk');

class NPC {
    constructor(id, type, x, y, animationManager) {
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;
        this.animationManager = animationManager;
        this.lastBehaviorTime = 0;
        this.behaviorInterval = 2000; // 2 seconds between behavior updates
    }

    // Update NPC behavior
    update(currentTime) {
        this.animationManager.updateFrame(currentTime);
        
        // Update behavior periodically
        if (currentTime - this.lastBehaviorTime > this.behaviorInterval) {
            this.updateBehavior(currentTime);
            this.lastBehaviorTime = currentTime;
        }
    }

    // Update NPC behavior (can be overridden for different NPC types)
    updateBehavior(currentTime) {
        // Simple idle behavior - just animate
        // Override this for more complex behaviors
    }

    // Get current sprite
    getCurrentSprite() {
        return this.animationManager.getCurrentSprite();
    }

    // Get position
    getPosition() {
        return { x: this.x, y: this.y };
    }

    // Set position
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    // Get animation info
    getAnimationInfo() {
        return this.animationManager.getAnimationInfo();
    }
}

class ElkNPC extends NPC {
    constructor(id, x, y) {
        const animationManager = new ElkAnimation();
        super(id, 'elk', x, y, animationManager);
        
        // Elk-specific behavior
        this.behaviorInterval = 3000; // 3 seconds for elk
        this.directions = ['up', 'down', 'left', 'right'];
        this.currentDirectionIndex = 0;
    }

    // Override behavior for elk
    updateBehavior(currentTime) {
        // Simple behavior: occasionally change direction
        if (Math.random() < 0.3) { // 30% chance to change direction
            this.currentDirectionIndex = Math.floor(Math.random() * this.directions.length);
            const newDirection = this.directions[this.currentDirectionIndex];
            this.animationManager.setDirection(newDirection);
        }
        
        // Occasionally set moving state for animation
        if (Math.random() < 0.2) { // 20% chance to "move"
            this.animationManager.setMoving(true, currentTime);
            setTimeout(() => {
                this.animationManager.setMoving(false, currentTime);
            }, 500);
        }
    }
}

class NPCManager {
    constructor() {
        this.npcs = new Map();
        this.nextId = 1;
    }

    // Add an NPC
    addNPC(type, x, y) {
        let npc;
        
        switch (type) {
            case 'elk':
                npc = new ElkNPC(this.nextId, x, y);
                break;
            default:
                throw new Error(`Unknown NPC type: ${type}`);
        }
        
        this.npcs.set(npc.id, npc);
        this.nextId++;
        
        return npc;
    }

    // Remove an NPC
    removeNPC(id) {
        this.npcs.delete(id);
    }

    // Get all NPCs
    getAllNPCs() {
        return Array.from(this.npcs.values());
    }

    // Update all NPCs
    update(currentTime) {
        for (const npc of this.npcs.values()) {
            npc.update(currentTime);
        }
    }

    // Get NPCs at a specific position
    getNPCsAt(x, y) {
        return Array.from(this.npcs.values()).filter(npc => 
            npc.x === x && npc.y === y
        );
    }

    // Clear all NPCs
    clear() {
        this.npcs.clear();
    }

    // Get NPC count
    getNPCCount() {
        return this.npcs.size;
    }
}

module.exports = {
    NPCManager,
    NPC,
    ElkNPC
}; 