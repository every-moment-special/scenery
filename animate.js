const termkit = require('terminal-kit');
const term = termkit.terminal;

// Import character sprite data for all directions and animation frames
const up0Sprite = require('./src/assets/up0.js');
const up1Sprite = require('./src/assets/up1.js');
const up2Sprite = require('./src/assets/up0.js');
const up3Sprite = require('./src/assets/up2.js');

const down0Sprite = require('./src/assets/down0.js');
const down1Sprite = require('./src/assets/down1.js');
const down2Sprite = require('./src/assets/down0.js');
const down3Sprite = require('./src/assets/down2.js');

const left0Sprite = require('./src/assets/left0.js');
const left1Sprite = require('./src/assets/left1.js');
const left2Sprite = require('./src/assets/left0.js');
const left3Sprite = require('./src/assets/left2.js');

const right0Sprite = require('./src/assets/right0.js');
const right1Sprite = require('./src/assets/right1.js');
const right2Sprite = require('./src/assets/right0.js');
const right3Sprite = require('./src/assets/right2.js');


// Animation state
let characterX = 10;
let characterY = 5;
let animationFrame = 0;
let isMoving = false;
let lastMoveTime = 0;
let lastKeyPressTime = 0;
let currentDirection = 'down'; // Default direction
const animationSpeed = 200; // milliseconds between frame changes
const movementTimeout = 150; // milliseconds to wait before stopping movement
const width = process.stdout.columns || 80;
const height = process.stdout.rows || 24;

// Direction-based animation sprites
const directionSprites = {
    up: [up0Sprite, up1Sprite, up2Sprite, up3Sprite],
    down: [down0Sprite, down1Sprite, down2Sprite, down3Sprite],
    left: [left0Sprite, left1Sprite, left2Sprite, left3Sprite],
    right: [right0Sprite, right1Sprite, right2Sprite, right3Sprite]
};

// Function to render animated character at position
function renderAnimatedCharacter(x, y, sprite) {
    const spriteHeight = sprite.length;
    const spriteWidth = sprite[0].length;
    
    // Build the complete sprite as a single string with proper positioning
    let spriteOutput = '';
    for (let sy = 0; sy < spriteHeight; sy++) {
        const screenY = y + sy;
        if (screenY >= 0 && screenY < height - 3) {
            // Move to the start of this line
            spriteOutput += `\x1b[${screenY + 1};${x + 1}H`;
            
            // Add the entire line content at once to preserve ANSI codes
            const screenX = x;
            if (screenX >= 0 && screenX < width) {
                spriteOutput += sprite[sy];
            }
        }
    }
    
    // Output the entire sprite at once
    if (spriteOutput.length > 0) {
        process.stdout.write(spriteOutput);
    }
}

// Function to get current animation sprite based on direction and movement state
function getCurrentSprite() {
    if (!isMoving) {
        // Idle - use frame 0 of current direction
        return directionSprites[currentDirection][0];
    } else {
        // Moving - use animated frames of current direction
        return directionSprites[currentDirection][animationFrame % directionSprites[currentDirection].length];
    }
}

// Function to clear character area
function clearCharacterArea(x, y) {
    const spriteHeight = down0Sprite.length; // Use any sprite for height reference
    const spriteWidth = down0Sprite[0].length; // Use any sprite for width reference
    
    let clearOutput = '';
    for (let sy = 0; sy < spriteHeight; sy++) {
        const screenY = y + sy;
        if (screenY >= 0 && screenY < height - 3) {
            clearOutput += `\x1b[${screenY + 1};${x + 1}H`;
            clearOutput += ' '.repeat(spriteWidth);
        }
    }
    
    if (clearOutput.length > 0) {
        process.stdout.write(clearOutput);
    }
}

// Setup input handling
term.grabInput();

const animate = () => {
    const currentTime = Date.now();
    
    // Check if movement should stop (no key press for a while)
    if (isMoving && currentTime - lastKeyPressTime > movementTimeout) {
        isMoving = false;
        animationFrame = 0;
    }
    
    // Only update animation frame when moving
    if (isMoving && currentTime - lastMoveTime > animationSpeed) {
        animationFrame++;
        lastMoveTime = currentTime;
    }
    
    // Clear previous character position
    clearCharacterArea(characterX, characterY);
    
    // Get current sprite based on movement state and direction
    const currentSprite = getCurrentSprite();
    
    // Render character at current position
    renderAnimatedCharacter(characterX, characterY, currentSprite);
    
    // Display UI
    term.moveTo(1, height - 2);
    // term('Animated Character Movement with Direction-Based Animations\n');
    // term(`Position: (${characterX}, ${characterY}) | Direction: ${currentDirection.toUpperCase()} | Frame: ${animationFrame}/${directionSprites[currentDirection].length} | Moving: ${isMoving ? 'Yes' : 'No'}\n`);
    // term('Use arrow keys to move, Q to quit\n');
    
    setTimeout(animate, 50);
};

// Handle keyboard input
term.on('key', (name) => {
    const oldX = characterX;
    const oldY = characterY;
    
    switch (name) {
        case 'LEFT':
            characterX = Math.max(0, characterX - 2);
            currentDirection = 'left';
            isMoving = true;
            lastKeyPressTime = Date.now();
            // Only reset animation timing if not already moving
            if (!isMoving) {
                lastMoveTime = Date.now() - animationSpeed; // Start animation immediately
            }
            break;
        case 'RIGHT':
            characterX = Math.min(width - 32, characterX + 2);
            currentDirection = 'right';
            isMoving = true;
            lastKeyPressTime = Date.now();
            // Only reset animation timing if not already moving
            if (!isMoving) {
                lastMoveTime = Date.now() - animationSpeed; // Start animation immediately
            }
            break;
        case 'UP':
            characterY = Math.max(0, characterY - 1);
            currentDirection = 'up';
            isMoving = true;
            lastKeyPressTime = Date.now();
            // Only reset animation timing if not already moving
            if (!isMoving) {
                lastMoveTime = Date.now() - animationSpeed; // Start animation immediately
            }
            break;
        case 'DOWN':
            characterY = Math.min(height - 32, characterY + 1);
            currentDirection = 'down';
            isMoving = true;
            lastKeyPressTime = Date.now();
            // Only reset animation timing if not already moving
            if (!isMoving) {
                lastMoveTime = Date.now() - animationSpeed; // Start animation immediately
            }
            break;
        case 'q':
        case 'Q':
            term.removeAllListeners('key');
            term.grabInput(false);
            term.clear();
            process.exit(0);
            return;
    }
    
    // Only reset movement state if no actual movement occurred (hit boundary)
    if (oldX === characterX && oldY === characterY) {
        isMoving = false;
        animationFrame = 0;
    }
});

// Start animation
animate();
