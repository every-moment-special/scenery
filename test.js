#!/usr/bin/env node

// Test script for the organized animation system
// This script tests that all modules load correctly without running the full game

console.log('Testing organized animation system...\n');

try {
    // Test loading all modules
    console.log('✓ Loading CharacterAnimation...');
    const { CharacterAnimation, ANIMATION_CONFIG, ANIMATION_STATES } = require('./src/animations/character');
    
    console.log('✓ Loading TerminalRenderer...');
    const TerminalRenderer = require('./src/renderer/terminal-renderer');
    
    console.log('✓ Loading MovementController...');
    const MovementController = require('./src/controllers/movement-controller');
    
    console.log('✓ Loading GameLoop...');
    const GameLoop = require('./src/game/game-loop');
    
    // Test creating instances
    console.log('\n✓ Creating animation manager...');
    const animationManager = new CharacterAnimation();
    
    console.log('✓ Creating renderer...');
    const renderer = new TerminalRenderer();
    
    console.log('✓ Creating movement controller...');
    const movementController = new MovementController(animationManager, renderer);
    
    console.log('✓ Creating game loop...');
    const gameLoop = new GameLoop();
    
    // Test basic functionality
    console.log('\n✓ Testing animation manager...');
    console.log('  - Available directions:', animationManager.getAvailableDirections());
    console.log('  - Available states:', animationManager.getAvailableStates());
    console.log('  - Current sprite dimensions:', animationManager.getAnimationInfo().spriteWidth + 'x' + animationManager.getAnimationInfo().spriteHeight);
    
    console.log('\n✓ Testing renderer...');
    const terminalInfo = renderer.getTerminalInfo();
    console.log('  - Terminal dimensions:', terminalInfo.width + 'x' + terminalInfo.height);
    
    console.log('\n✓ Testing movement controller...');
    const position = movementController.getPosition();
    console.log('  - Initial position:', position.x + ', ' + position.y);
    
    console.log('\n✓ Testing game loop...');
    const gameState = gameLoop.getGameState();
    console.log('  - Game running:', gameState.isRunning);
    console.log('  - Animation state:', gameState.animation.state);
    
    // Cleanup
    renderer.cleanup();
    
    console.log('\n🎉 All tests passed! The organized animation system is working correctly.');
    console.log('\nTo run the full game, use: node start.js');
    
} catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}
