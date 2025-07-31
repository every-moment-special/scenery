#!/usr/bin/env node

// Performance Test for Scenery Game
// Tests render efficiency and CPU usage

const GameLoop = require('./src/game/game-loop');

class PerformanceTest {
    constructor() {
        this.gameLoop = new GameLoop();
        this.testDuration = 10000; // 10 seconds
        this.startTime = 0;
        this.samples = [];
        this.interval = null;
    }

    start() {
        console.log('Starting performance test...');
        console.log('Test will run for 10 seconds...');
        
        this.startTime = performance.now();
        this.gameLoop.start();
        
        // Sample performance every 100ms
        this.interval = setInterval(() => {
            this.sample();
        }, 100);
        
        // Stop test after duration
        setTimeout(() => {
            this.stop();
        }, this.testDuration);
    }

    sample() {
        const currentTime = performance.now();
        const gameState = this.gameLoop.getGameState();
        const rendererStats = this.gameLoop.renderer.getStats();
        
        this.samples.push({
            timestamp: currentTime,
            uptime: currentTime - this.startTime,
            fps: gameState.performance.fps,
            frameTime: gameState.performance.frameTime,
            averageFrameTime: gameState.performance.averageFrameTime,
            renderEfficiency: rendererStats.performance.efficiency,
            totalRenders: rendererStats.performance.totalRenders,
            changeCount: rendererStats.performance.changeCount,
            skipRenderCount: rendererStats.performance.skipRenderCount
        });
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        this.gameLoop.stop();
        
        console.log('\n=== Performance Test Results ===');
        this.analyzeResults();
    }

    analyzeResults() {
        if (this.samples.length === 0) {
            console.log('No samples collected');
            return;
        }

        const avgFPS = this.samples.reduce((sum, s) => sum + s.fps, 0) / this.samples.length;
        const avgFrameTime = this.samples.reduce((sum, s) => sum + s.frameTime, 0) / this.samples.length;
        const avgEfficiency = this.samples.reduce((sum, s) => sum + parseFloat(s.renderEfficiency), 0) / this.samples.length;
        
        const totalRenders = this.samples[this.samples.length - 1].totalRenders;
        const totalChanges = this.samples[this.samples.length - 1].changeCount;
        const totalSkips = this.samples[this.samples.length - 1].skipRenderCount;

        console.log(`Test Duration: ${(this.testDuration / 1000).toFixed(1)}s`);
        console.log(`Samples Collected: ${this.samples.length}`);
        console.log(`Average FPS: ${avgFPS.toFixed(1)}`);
        console.log(`Average Frame Time: ${avgFrameTime.toFixed(1)}ms`);
        console.log(`Average Render Efficiency: ${avgEfficiency.toFixed(1)}%`);
        console.log(`Total Renders: ${totalRenders}`);
        console.log(`Total Changes: ${totalChanges}`);
        console.log(`Total Skips: ${totalSkips}`);
        
        // Check for performance issues
        if (avgEfficiency < 50) {
            console.log('⚠️  WARNING: Low render efficiency detected');
        }
        
        if (avgFrameTime > 50) {
            console.log('⚠️  WARNING: High frame times detected');
        }
        
        if (avgFPS < 15) {
            console.log('⚠️  WARNING: Low FPS detected');
        }
        
        console.log('\nPerformance test completed!');
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, stopping test...');
    if (global.test) {
        global.test.stop();
    }
    process.exit(0);
});

// Start the test
if (require.main === module) {
    global.test = new PerformanceTest();
    global.test.start();
}

module.exports = PerformanceTest; 