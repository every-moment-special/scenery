// Debug sprite parsing
const testSprite = require('./src/assets/character/move/down0.js');

console.log('Debugging sprite parsing...\n');

// Look at the first line of the sprite
const firstLine = testSprite[0];
console.log('First line length:', firstLine.length);
console.log('First line preview:', firstLine.substring(0, 100));

// Find all non-space characters
let charCount = 0;
let spaceCount = 0;
let ansiCount = 0;

for (let i = 0; i < firstLine.length; i++) {
    const char = firstLine[i];
    if (char === ' ') {
        spaceCount++;
    } else if (char === '\x1b') {
        ansiCount++;
    } else if (char !== '[' && char !== 'm' && char !== ';' && char !== '0' && char !== '1' && char !== '2' && char !== '3' && char !== '4' && char !== '5' && char !== '6' && char !== '7' && char !== '8' && char !== '9') {
        charCount++;
        console.log(`Character at position ${i}: '${char}'`);
    }
}

console.log(`\nAnalysis of first line:`);
console.log(`Total length: ${firstLine.length}`);
console.log(`Spaces: ${spaceCount}`);
console.log(`ANSI sequences: ${ansiCount}`);
console.log(`Visible characters: ${charCount}`);

// Test the parsing logic
console.log('\nTesting parsing logic...');
let i = 0, screenX = 0;
let currentAnsi = '';
const parsedChars = [];

while (i < firstLine.length) {
    if (firstLine[i] === '\x1b') {
        // Parse ANSI escape sequence
        let j = i;
        while (j < firstLine.length && firstLine[j] !== 'm') j++;
        currentAnsi = firstLine.slice(i, j + 1);
        i = j + 1;
    } else {
        const char = firstLine[i];
        if (char !== ' ' && char !== '\x1b' && char !== '[') {
            parsedChars.push({ char, ansi: currentAnsi, x: screenX });
            screenX++;
        } else if (char === ' ') {
            screenX++;
        }
        i++;
    }
}

console.log(`\nParsed ${parsedChars.length} characters:`);
parsedChars.forEach((item, index) => {
    console.log(`${index}: char='${item.char}' ansi='${item.ansi}' x=${item.x}`);
}); 