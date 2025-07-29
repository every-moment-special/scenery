// Test improved buffer system performance
const TerminalRenderer = require('./src/renderer/terminal-renderer');
const BufferedRenderer = require('./src/renderer/buffered-renderer');
const ImprovedBufferedRenderer = require('./src/renderer/improved-buffered-renderer');

console.log('Testing Improved Buffer System...\n');

// Test 1: Performance comparison
console.log('Test 1: Performance Comparison');

const terminalRenderer = new TerminalRenderer();
const originalRenderer = new BufferedRenderer(terminalRenderer);
const improvedRenderer = new ImprovedBufferedRenderer(terminalRenderer);

// Test sprite data
const testSprite = require('./src/assets/character/move/down0.js');

// Test original system
console.log('\nOriginal Buffer System:');
const start1 = Date.now();
for (let i = 0; i < 100; i++) {
    originalRenderer.renderSprite(10, 5, testSprite);
    originalRenderer.render();
}
const time1 = Date.now() - start1;
console.log(`Time: ${time1}ms`);
console.log('Stats:', originalRenderer.getStats());

// Test improved system
console.log('\nImproved Buffer System:');
const start2 = Date.now();
for (let i = 0; i < 100; i++) {
    improvedRenderer.renderSprite(10, 5, testSprite);
    improvedRenderer.render();
}
const time2 = Date.now() - start2;
console.log(`Time: ${time2}ms`);
console.log('Stats:', improvedRenderer.getStats());

console.log(`\nPerformance improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}% faster`);

console.log('\nBuffer system comparison completed!'); 