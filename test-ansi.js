// Test buffer system functionality
const TerminalRenderer = require('./src/renderer/terminal-renderer');
const BufferedRenderer = require('./src/renderer/buffered-renderer');

console.log('Testing Buffer System...\n');

const terminalRenderer = new TerminalRenderer();
const bufferedRenderer = new BufferedRenderer(terminalRenderer);

// Test basic rendering
console.log('Rendering test content...');

// Simple text
bufferedRenderer.renderText(5, 5, 'HELLO WORLD', null, 1);

// Character
bufferedRenderer.renderChar(10, 10, '@', null, 2);

// Sprite
const sprite = [
    ['*', '*', '*'],
    ['*', 'O', '*'],
    ['*', '*', '*']
];
bufferedRenderer.renderSprite(15, 15, sprite, null, 1);

// Render to terminal
bufferedRenderer.render();

console.log('\nBuffer system test completed!');
console.log('You should see the test content above if the buffer is working correctly.'); 