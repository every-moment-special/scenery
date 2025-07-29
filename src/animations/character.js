// Character Animation Manager
// Centralized management of character sprites and animations

// Import all sprite data
const up0Sprite = require('../assets/character/movement/up0.js');
const up1Sprite = require('../assets/character/movement/up1.js');
const up2Sprite = require('../assets/character/movement/up2.js');

const down0Sprite = require('../assets/character/movement/down0.js');
const down1Sprite = require('../assets/character/movement/down1.js');
const down2Sprite = require('../assets/character/movement/down2.js');

const left0Sprite = require('../assets/character/movement/left0.js');
const left1Sprite = require('../assets/character/movement/left1.js');
const left2Sprite = require('../assets/character/movement/left2.js');

const right0Sprite = require('../assets/character/movement/right0.js');
const right1Sprite = require('../assets/character/movement/right1.js');
const right2Sprite = require('../assets/character/movement/right2.js');

// Animation configuration
const ANIMATION_CONFIG = {
    IDLE_FRAME: 0,
    FRAME_COUNT: 4,
    ANIMATION_SPEED: 200, // milliseconds
    MOVEMENT_TIMEOUT: 150, // milliseconds
    SPRITE_WIDTH: 32,
    SPRITE_HEIGHT: 22
};

// Direction-based sprite collections
const SPRITE_COLLECTIONS = {
    up: [up0Sprite, up1Sprite, up0Sprite, up2Sprite],
    down: [down0Sprite, down1Sprite, down0Sprite, down2Sprite],
    left: [left0Sprite, left1Sprite, left0Sprite, left2Sprite],
    right: [right0Sprite, right1Sprite, right0Sprite, right2Sprite]
};

// Animation states
const ANIMATION_STATES = {
    IDLE: 'idle',
    WALKING: 'walking',
    RUNNING: 'running'
};

class CharacterAnimation {
    constructor() {
        this.currentDirection = 'down';
        this.currentState = ANIMATION_STATES.IDLE;
        this.currentFrame = 0;
        this.lastFrameTime = 0;
        this.isMoving = false;
        this.lastMoveTime = 0;
    }

    // Get sprite for current state and direction
    getCurrentSprite() {
        const sprites = SPRITE_COLLECTIONS[this.currentDirection];
        
        if (this.currentState === ANIMATION_STATES.IDLE) {
            return sprites[ANIMATION_CONFIG.IDLE_FRAME];
        } else {
            return sprites[this.currentFrame % ANIMATION_CONFIG.FRAME_COUNT];
        }
    }

    // Update animation frame based on time
    updateFrame(currentTime) {
        if (this.currentState !== ANIMATION_STATES.IDLE && 
            currentTime - this.lastFrameTime > ANIMATION_CONFIG.ANIMATION_SPEED) {
            this.currentFrame++;
            this.lastFrameTime = currentTime;
        }
    }

    // Set direction and update state
    setDirection(direction) {
        if (SPRITE_COLLECTIONS[direction]) {
            this.currentDirection = direction;
        }
    }

    // Set movement state
    setMoving(isMoving, currentTime) {
        this.isMoving = isMoving;
        this.lastMoveTime = currentTime;
        
        if (isMoving) {
            this.currentState = ANIMATION_STATES.WALKING;
        } else {
            this.currentState = ANIMATION_STATES.IDLE;
            this.currentFrame = 0;
        }
    }

    // Check if movement should stop
    shouldStopMoving(currentTime) {
        return this.isMoving && 
               currentTime - this.lastMoveTime > ANIMATION_CONFIG.MOVEMENT_TIMEOUT;
    }

    // Get animation info for debugging
    getAnimationInfo() {
        return {
            direction: this.currentDirection,
            state: this.currentState,
            frame: this.currentFrame,
            isMoving: this.isMoving,
            spriteWidth: ANIMATION_CONFIG.SPRITE_WIDTH,
            spriteHeight: ANIMATION_CONFIG.SPRITE_HEIGHT
        };
    }

    // Get all available directions
    getAvailableDirections() {
        return Object.keys(SPRITE_COLLECTIONS);
    }

    // Get all available states
    getAvailableStates() {
        return Object.values(ANIMATION_STATES);
    }

    // Reset animation to idle state
    reset() {
        this.currentState = ANIMATION_STATES.IDLE;
        this.currentFrame = 0;
        this.isMoving = false;
        this.lastFrameTime = 0;
        this.lastMoveTime = 0;
    }
}

// Export the class and constants
module.exports = {
    CharacterAnimation,
    ANIMATION_CONFIG,
    ANIMATION_STATES,
    SPRITE_COLLECTIONS
};
