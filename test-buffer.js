// Test script for the buffer system
const { FrameBuffer } = require('./src/renderer/frame-buffer');
const TerminalRenderer = require('./src/renderer/terminal-renderer');
const BufferedRenderer = require('./src/renderer/buffered-renderer');

console.log('Testing Buffer System...\n');

// Test 1: Basic FrameBuffer functionality
console.log('Test 1: Basic FrameBuffer functionality');
const buffer = new FrameBuffer(10, 5);

// Set some cells
buffer.setCell(0, 0, 'A', '32', 1); // Green 'A'
buffer.setCell(1, 0, 'B', '31', 2); // Red 'B'
buffer.setCell(2, 0, 'C', '34', 0); // Blue 'C'

// Test sprite rendering
const sprite = [
    ['H', 'e'],
    ['l', 'l'],
    ['o', '!']
];
buffer.setCells(5, 1, sprite, '33', 1); // Yellow sprite

console.log('Buffer stats:', buffer.getStats());
console.log('Dirty cells:', buffer.getDirtyCells().length);
console.log('Diff size:', buffer.getDiff().length);

// Swap buffers
buffer.swapBuffers();
console.log('After swap - Dirty cells:', buffer.getDirtyCells().length);
console.log('After swap - Diff size:', buffer.getDiff().length);

// Test 2: BufferedRenderer integration
console.log('\nTest 2: BufferedRenderer integration');
const terminalRenderer = new TerminalRenderer();
const bufferedRenderer = new BufferedRenderer(terminalRenderer);

// Render some content
bufferedRenderer.renderText(5, 5, 'Hello Buffer!', '32', 1);
bufferedRenderer.renderChar(10, 10, '@', '31', 2);

const sprite2 = [
    ['*', '*', '*'],
    ['*', 'O', '*'],
    ['*', '*', '*']
];
bufferedRenderer.renderSprite(15, 15, sprite2, '33', 1);

console.log('BufferedRenderer stats:', bufferedRenderer.getStats());

// Test 3: Performance test
console.log('\nTest 3: Performance test');
const perfBuffer = new FrameBuffer(80, 24);
const startTime = Date.now();

// Simulate rendering a lot of content
for (let i = 0; i < 1000; i++) {
    const x = Math.floor(Math.random() * 80);
    const y = Math.floor(Math.random() * 24);
    const char = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    perfBuffer.setCell(x, y, char, '32', 1);
}

const endTime = Date.now();
console.log(`Rendered 1000 cells in ${endTime - startTime}ms`);
console.log('Performance buffer stats:', perfBuffer.getStats());

console.log('\nBuffer system test completed!'); 