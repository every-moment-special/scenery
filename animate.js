const termkit = require('terminal-kit');
const term = termkit.terminal;

// Import character sprite data for animation
const front0Sprite = require('./src/assets/front0.js');
const front1Sprite = require('./src/assets/front1.js');
const front2Sprite = require('./src/assets/front0.js');
const front3Sprite = require('./src/assets/front2.js');

console.log('Starting animated character movement...');

// Animation state
let characterX = 10;
let characterY = 5;
let animationFrame = 0;
let isMoving = false;
let lastMoveTime = 0;
let lastKeyPressTime = 0;
const animationSpeed = 200; // milliseconds between frame changes
const movementTimeout = 150; // milliseconds to wait before stopping movement
const width = process.stdout.columns || 80;
const height = process.stdout.rows || 24;

// Animation sprites array
const animationSprites = [front0Sprite, front1Sprite, front2Sprite, front3Sprite];

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

// Function to get current animation sprite
function getCurrentSprite() {
    if (!isMoving) {
        return front0Sprite; // Idle - static pose
    } else {
        return animationSprites[animationFrame % animationSprites.length]; // Moving - animated
    }
}

// Function to clear character area
function clearCharacterArea(x, y) {
    const spriteHeight = front0Sprite.length;
    const spriteWidth = front0Sprite[0].length;
    
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
    
    // Get current sprite based on movement state
    const currentSprite = getCurrentSprite();
    
    // Render character at current position
    renderAnimatedCharacter(characterX, characterY, currentSprite);
    
    // Display UI
    term.moveTo(1, height - 2);
    term('Animated Character Movement\n');
    term(`Position: (${characterX}, ${characterY}) | Frame: ${animationFrame}/${animationSprites.length} | Moving: ${isMoving ? 'Yes' : 'No'}\n`);
    term('Use arrow keys to move, Q to quit\n');
    
    setTimeout(animate, 50);
};

// Handle keyboard input
term.on('key', (name) => {
    const oldX = characterX;
    const oldY = characterY;
    
    switch (name) {
        case 'LEFT':
            characterX = Math.max(0, characterX - 2);
            isMoving = true;
            lastKeyPressTime = Date.now();
            // Only reset animation timing if not already moving
            if (!isMoving) {
                lastMoveTime = Date.now() - animationSpeed; // Start animation immediately
            }
            break;
        case 'RIGHT':
            characterX = Math.min(width - 32, characterX + 2);
            isMoving = true;
            lastKeyPressTime = Date.now();
            // Only reset animation timing if not already moving
            if (!isMoving) {
                lastMoveTime = Date.now() - animationSpeed; // Start animation immediately
            }
            break;
        case 'UP':
            characterY = Math.max(0, characterY - 1);
            isMoving = true;
            lastKeyPressTime = Date.now();
            // Only reset animation timing if not already moving
            if (!isMoving) {
                lastMoveTime = Date.now() - animationSpeed; // Start animation immediately
            }
            break;
        case 'DOWN':
            characterY = Math.min(height - 32, characterY + 1);
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
