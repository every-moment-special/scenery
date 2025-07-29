#!/usr/bin/env node

// Organized Character Animation System
// Main entry point for the animated character application

const GameLoop = require('./src/game/game-loop');

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nExiting gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nExiting gracefully...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Main function
function main() {
    try {
        // Create and start the game loop
        const game = new GameLoop();
        game.start();
    } catch (error) {
        console.error('Failed to start game:', error);
        process.exit(1);
    }
}

// Start the application
if (require.main === module) {
    main();
}

module.exports = { main };
