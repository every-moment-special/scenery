// Test sprite parsing in improved buffer system
const { ImprovedFrameBuffer } = require('./src/renderer/improved-frame-buffer');
const testSprite = require('./src/assets/character/move/down0.js');

console.log('Testing Sprite Parsing with Real Data...\n');

// Create a test buffer
const buffer = new ImprovedFrameBuffer(80, 24);

console.log('Setting sprite at position (10, 5)...');
buffer.setSprite(10, 5, testSprite, 1);

console.log('Buffer stats:', buffer.getStats());

// Check some specific cells
console.log('\nChecking specific cells:');
console.log('Cell (10, 5):', buffer.getCell(10, 5));
console.log('Cell (15, 5):', buffer.getCell(15, 5));
console.log('Cell (20, 6):', buffer.getCell(20, 6));

// Debug: Look at different lines of the sprite
console.log('\nDebug: Checking different sprite lines:');
for (let lineIndex = 0; lineIndex < Math.min(5, testSprite.length); lineIndex++) {
    const line = testSprite[lineIndex];
    console.log(`\nLine ${lineIndex}:`);
    console.log('Length:', line.length);
    console.log('Preview:', line.substring(0, 100));
    
    // Find visible characters in this line
    let visibleChars = [];
    let i = 0, screenX = 0;
    let currentAnsi = '';

    while (i < line.length) {
        if (line[i] === '\x1b') {
            // Parse ANSI escape sequence
            let j = i;
            while (j < line.length && line[j] !== 'm') j++;
            currentAnsi = line.slice(i, j + 1);
            i = j + 1;
        } else {
            const char = line[i];
            // Check if it's a visible character
            if (char !== ' ' && char !== '\x1b' && char !== '[' && char !== 'm' && char !== ';' && 
                !(char >= '0' && char <= '9') && char !== 'H' && char !== '0') {
                visibleChars.push({ char, ansi: currentAnsi, x: screenX });
                screenX++;
            } else if (char === ' ') {
                screenX++;
            }
            i++;
        }
    }
    
    console.log(`Found ${visibleChars.length} visible characters in line ${lineIndex}:`);
    visibleChars.forEach((item, index) => {
        console.log(`  ${index}: char='${item.char}' ansi='${item.ansi}' x=${item.x}`);
    });
}

console.log('\nSprite parsing test completed!'); 