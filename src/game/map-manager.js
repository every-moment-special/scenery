// Map Manager
// Handles map tiles and terrain rendering

const grassC = require('../assets/turf/grassC');

class MapManager {
    constructor() {
        this.mapData = [];
        this.mapWidth = 0;
        this.mapHeight = 0;
        this.tileWidth = 32; // Width of each tile in pixels
        this.tileHeight = 16; // Height of each tile in pixels (grass sprite is 32x16)
        this.visibleTiles = { width: 0, height: 0 }; // Visible tiles on screen
        
        // Tile types
        this.TILE_TYPES = {
            GRASS: 'grass',
            EMPTY: 'empty'
        };
        
        // Performance optimizations
        this.lastCameraPosition = { x: -1, y: -1 };
        this.tileCache = new Map(); // Cache for rendered tile sprites
        this.lastRenderTime = 0;
        this.renderInterval = 100; // Only re-render map every 100ms
        
        // Initialize with a default map
        this.initializeDefaultMap();
    }

    // Initialize a default map with grass tiles
    initializeDefaultMap() {
        // Get terminal dimensions to determine map size
        const terminalWidth = process.stdout.columns || 80;
        const terminalHeight = process.stdout.rows || 24;
        
        // Calculate map dimensions based on terminal size
        this.mapWidth = Math.ceil(terminalWidth / 2); // 2 characters per tile width
        this.mapHeight = Math.ceil((terminalHeight - 3) / 2); // 2 characters per tile height, minus UI space
        
        // Initialize map with grass tiles
        this.mapData = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.mapData[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                this.mapData[y][x] = this.TILE_TYPES.GRASS;
            }
        }
        
        // Calculate visible tiles
        this.calculateVisibleTiles();
        
        // Clear cache on new map
        this.tileCache.clear();
        this.lastCameraPosition = { x: -1, y: -1 };
    }

    // Calculate which tiles are visible on screen
    calculateVisibleTiles() {
        const terminalWidth = process.stdout.columns || 80;
        const terminalHeight = process.stdout.rows || 24;
        
        this.visibleTiles.width = Math.ceil(terminalWidth / 2);
        this.visibleTiles.height = Math.ceil((terminalHeight - 3) / 2);
    }

    // Get tile at position
    getTile(x, y) {
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
            return this.TILE_TYPES.EMPTY;
        }
        return this.mapData[y][x];
    }

    // Set tile at position
    setTile(x, y, tileType) {
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
            return false;
        }
        this.mapData[y][x] = tileType;
        
        // Clear cache when map changes
        this.tileCache.clear();
        return true;
    }

    // Get tile sprite based on tile type
    getTileSprite(tileType) {
        switch (tileType) {
            case this.TILE_TYPES.GRASS:
                return grassC;
            case this.TILE_TYPES.EMPTY:
            default:
                return null;
        }
    }

    // Check if camera position has changed significantly
    hasCameraMoved(cameraX, cameraY) {
        const tileX = Math.floor(cameraX / this.tileWidth);
        const tileY = Math.floor(cameraY / this.tileHeight);
        
        return tileX !== this.lastCameraPosition.x || tileY !== this.lastCameraPosition.y;
    }

    // Render map tiles to the renderer with performance optimization
    renderMap(renderer, cameraX = 0, cameraY = 0) {
        const currentTime = performance.now();
        
        // Check if we need to re-render the map
        const hasMoved = this.hasCameraMoved(cameraX, cameraY);
        const timeSinceLastRender = currentTime - this.lastRenderTime;
        
        // Only re-render if camera moved significantly or enough time has passed
        if (!hasMoved && timeSinceLastRender < this.renderInterval) {
            return; // Skip rendering
        }
        
        // Update camera position and render time
        const tileX = Math.floor(cameraX / this.tileWidth);
        const tileY = Math.floor(cameraY / this.tileHeight);
        this.lastCameraPosition = { x: tileX, y: tileY };
        this.lastRenderTime = currentTime;
        
        // Calculate visible area
        const startX = Math.max(0, tileX);
        const startY = Math.max(0, tileY);
        const endX = Math.min(this.mapWidth, startX + this.visibleTiles.width);
        const endY = Math.min(this.mapHeight, startY + this.visibleTiles.height);

        // Render visible tiles with caching
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tileType = this.getTile(x, y);
                const tileSprite = this.getTileSprite(tileType);
                
                if (tileSprite) {
                    // Calculate screen position
                    const screenX = (x - startX) * this.tileWidth;
                    const screenY = (y - startY) * this.tileHeight;
                    
                    // Render tile with lowest z-index (background)
                    renderer.renderSprite(screenX, screenY, tileSprite, 0);
                }
            }
        }
    }

    // Check if a position is walkable
    isWalkable(x, y) {
        const tileX = Math.floor(x / this.tileWidth);
        const tileY = Math.floor(y / this.tileHeight);
        const tileType = this.getTile(tileX, tileY);
        
        // For now, all tiles are walkable
        return tileType !== this.TILE_TYPES.EMPTY;
    }

    // Get map dimensions
    getMapDimensions() {
        return {
            width: this.mapWidth,
            height: this.mapHeight,
            tileWidth: this.tileWidth,
            tileHeight: this.tileHeight
        };
    }

    // Get visible area dimensions
    getVisibleDimensions() {
        return this.visibleTiles;
    }

    // Create a custom map
    createCustomMap(width, height, defaultTile = this.TILE_TYPES.GRASS) {
        this.mapWidth = width;
        this.mapHeight = height;
        
        this.mapData = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.mapData[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                this.mapData[y][x] = defaultTile;
            }
        }
        
        this.calculateVisibleTiles();
        this.tileCache.clear();
        this.lastCameraPosition = { x: -1, y: -1 };
    }

    // Load map from data
    loadMap(mapData) {
        if (!mapData || !Array.isArray(mapData)) {
            return false;
        }
        
        this.mapHeight = mapData.length;
        this.mapWidth = mapData[0] ? mapData[0].length : 0;
        this.mapData = mapData;
        
        this.calculateVisibleTiles();
        this.tileCache.clear();
        this.lastCameraPosition = { x: -1, y: -1 };
        return true;
    }

    // Get map statistics
    getMapStats() {
        let grassCount = 0;
        let emptyCount = 0;
        
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.mapData[y][x];
                if (tile === this.TILE_TYPES.GRASS) {
                    grassCount++;
                } else if (tile === this.TILE_TYPES.EMPTY) {
                    emptyCount++;
                }
            }
        }
        
        return {
            width: this.mapWidth,
            height: this.mapHeight,
            totalTiles: this.mapWidth * this.mapHeight,
            grassTiles: grassCount,
            emptyTiles: emptyCount,
            visibleTiles: this.visibleTiles
        };
    }
}

module.exports = MapManager; 