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
        this.lastUpdateTime = 0;
        this.updateInterval = 100; // Update every 100ms instead of every frame
    }

    // Update NPC behavior with throttling
    update(currentTime) {
        // Throttle updates to reduce CPU usage
        if (currentTime - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        
        this.lastUpdateTime = currentTime;
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
        this.lastDirectionChange = 0;
        this.directionChangeInterval = 2000; // Change direction every 2 seconds
    }

    // Override behavior for elk with better performance
    updateBehavior(currentTime) {
        // Change direction periodically instead of randomly
        if (currentTime - this.lastDirectionChange > this.directionChangeInterval) {
            this.currentDirectionIndex = (this.currentDirectionIndex + 1) % this.directions.length;
            const newDirection = this.directions[this.currentDirectionIndex];
            this.animationManager.setDirection(newDirection);
            this.lastDirectionChange = currentTime;
        }
        
        // Occasionally set moving state for animation (less frequently)
        if (Math.random() < 0.1) { // 10% chance to "move" (reduced from 20%)
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
        this.lastUpdateTime = 0;
        this.updateInterval = 50; // Update NPCs every 50ms instead of every frame
        this.spatialGrid = new Map(); // Simple spatial partitioning
        this.gridSize = 10; // Grid cell size
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
        this.updateSpatialGrid(npc);
        this.nextId++;
        
        return npc;
    }

    // Remove an NPC
    removeNPC(id) {
        const npc = this.npcs.get(id);
        if (npc) {
            this.removeFromSpatialGrid(npc);
            this.npcs.delete(id);
        }
    }

    // Get all NPCs
    getAllNPCs() {
        return Array.from(this.npcs.values());
    }

    // Update all NPCs with throttling
    update(currentTime) {
        // Throttle updates to reduce CPU usage
        if (currentTime - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        
        this.lastUpdateTime = currentTime;
        
        for (const npc of this.npcs.values()) {
            npc.update(currentTime);
        }
    }

    // Get NPCs at a specific position using spatial partitioning
    getNPCsAt(x, y) {
        const gridKey = this.getGridKey(x, y);
        const gridCell = this.spatialGrid.get(gridKey);
        
        if (!gridCell) return [];
        
        return Array.from(gridCell).filter(npc => 
            npc.x === x && npc.y === y
        );
    }

    // Get NPCs in a rectangular area
    getNPCsInArea(x1, y1, x2, y2) {
        const npcs = [];
        const gridKeys = this.getGridKeysInArea(x1, y1, x2, y2);
        
        for (const key of gridKeys) {
            const gridCell = this.spatialGrid.get(key);
            if (gridCell) {
                for (const npc of gridCell) {
                    if (npc.x >= x1 && npc.x <= x2 && npc.y >= y1 && npc.y <= y2) {
                        npcs.push(npc);
                    }
                }
            }
        }
        
        return npcs;
    }

    // Clear all NPCs
    clear() {
        this.npcs.clear();
        this.spatialGrid.clear();
    }

    // Get NPC count
    getNPCCount() {
        return this.npcs.size;
    }

    // Spatial partitioning helper methods
    getGridKey(x, y) {
        const gridX = Math.floor(x / this.gridSize);
        const gridY = Math.floor(y / this.gridSize);
        return `${gridX},${gridY}`;
    }

    getGridKeysInArea(x1, y1, x2, y2) {
        const keys = new Set();
        const startGridX = Math.floor(x1 / this.gridSize);
        const endGridX = Math.floor(x2 / this.gridSize);
        const startGridY = Math.floor(y1 / this.gridSize);
        const endGridY = Math.floor(y2 / this.gridSize);
        
        for (let gx = startGridX; gx <= endGridX; gx++) {
            for (let gy = startGridY; gy <= endGridY; gy++) {
                keys.add(`${gx},${gy}`);
            }
        }
        
        return Array.from(keys);
    }

    updateSpatialGrid(npc) {
        const key = this.getGridKey(npc.x, npc.y);
        if (!this.spatialGrid.has(key)) {
            this.spatialGrid.set(key, new Set());
        }
        this.spatialGrid.get(key).add(npc);
    }

    removeFromSpatialGrid(npc) {
        const key = this.getGridKey(npc.x, npc.y);
        const gridCell = this.spatialGrid.get(key);
        if (gridCell) {
            gridCell.delete(npc);
            if (gridCell.size === 0) {
                this.spatialGrid.delete(key);
            }
        }
    }

    // Get spatial grid statistics
    getSpatialStats() {
        return {
            totalNPCs: this.npcs.size,
            gridCells: this.spatialGrid.size,
            averageNPCsPerCell: this.npcs.size > 0 ? 
                (this.npcs.size / this.spatialGrid.size).toFixed(2) : 0
        };
    }
}

module.exports = {
    NPCManager,
    NPC,
    ElkNPC
}; 