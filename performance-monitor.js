#!/usr/bin/env node

// Performance Monitor for Scenery Game
// Monitors CPU and memory usage during gameplay

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
    constructor() {
        this.startTime = Date.now();
        this.memoryUsage = [];
        this.cpuUsage = [];
        this.interval = null;
        this.gameProcess = null;
        this.logFile = path.join(__dirname, 'performance.log');
    }

    start() {
        console.log('Starting performance monitor...');
        
        // Start the game process
        this.gameProcess = spawn('node', ['start.js'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Monitor the game process
        this.gameProcess.stdout.on('data', (data) => {
            console.log(`Game: ${data.toString().trim()}`);
        });

        this.gameProcess.stderr.on('data', (data) => {
            console.error(`Game Error: ${data.toString().trim()}`);
        });

        this.gameProcess.on('close', (code) => {
            console.log(`Game process exited with code ${code}`);
            this.stop();
        });

        // Start monitoring
        this.interval = setInterval(() => {
            this.recordMetrics();
        }, 1000); // Record metrics every second

        console.log('Performance monitor started. Press Ctrl+C to stop.');
    }

    recordMetrics() {
        const memory = process.memoryUsage();
        const cpu = process.cpuUsage();
        
        const metrics = {
            timestamp: Date.now(),
            uptime: Date.now() - this.startTime,
            memory: {
                rss: memory.rss,
                heapUsed: memory.heapUsed,
                heapTotal: memory.heapTotal,
                external: memory.external
            },
            cpu: {
                user: cpu.user,
                system: cpu.system
            }
        };

        this.memoryUsage.push(metrics.memory);
        this.cpuUsage.push(metrics.cpu);

        // Keep only last 60 seconds of data
        if (this.memoryUsage.length > 60) {
            this.memoryUsage.shift();
            this.cpuUsage.shift();
        }

        // Log to file
        this.logMetrics(metrics);

        // Display current stats
        this.displayStats();
    }

    logMetrics(metrics) {
        const logEntry = `${new Date().toISOString()},${metrics.uptime},${metrics.memory.rss},${metrics.memory.heapUsed},${metrics.memory.heapTotal},${metrics.cpu.user},${metrics.cpu.system}\n`;
        
        fs.appendFileSync(this.logFile, logEntry);
    }

    displayStats() {
        const latestMemory = this.memoryUsage[this.memoryUsage.length - 1];
        const latestCpu = this.cpuUsage[this.cpuUsage.length - 1];
        
        const rssMB = (latestMemory.rss / 1024 / 1024).toFixed(2);
        const heapUsedMB = (latestMemory.heapUsed / 1024 / 1024).toFixed(2);
        const heapTotalMB = (latestMemory.heapTotal / 1024 / 1024).toFixed(2);
        
        console.clear();
        console.log('=== Scenery Game Performance Monitor ===');
        console.log(`Uptime: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
        console.log(`Memory Usage:`);
        console.log(`  RSS: ${rssMB} MB`);
        console.log(`  Heap Used: ${heapUsedMB} MB`);
        console.log(`  Heap Total: ${heapTotalMB} MB`);
        console.log(`CPU Usage:`);
        console.log(`  User: ${(latestCpu.user / 1000).toFixed(2)}ms`);
        console.log(`  System: ${(latestCpu.system / 1000).toFixed(2)}ms`);
        
        if (this.memoryUsage.length > 1) {
            const avgMemory = this.calculateAverageMemory();
            const avgCpu = this.calculateAverageCpu();
            
            console.log(`\nAverages (last ${this.memoryUsage.length}s):`);
            console.log(`  Avg RSS: ${(avgMemory.rss / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  Avg Heap Used: ${(avgMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  Avg CPU User: ${(avgCpu.user / 1000).toFixed(2)}ms`);
            console.log(`  Avg CPU System: ${(avgCpu.system / 1000).toFixed(2)}ms`);
        }
        
        console.log('\nPress Ctrl+C to stop monitoring');
    }

    calculateAverageMemory() {
        const sum = this.memoryUsage.reduce((acc, mem) => ({
            rss: acc.rss + mem.rss,
            heapUsed: acc.heapUsed + mem.heapUsed,
            heapTotal: acc.heapTotal + mem.heapTotal,
            external: acc.external + mem.external
        }), { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 });

        return {
            rss: sum.rss / this.memoryUsage.length,
            heapUsed: sum.heapUsed / this.memoryUsage.length,
            heapTotal: sum.heapTotal / this.memoryUsage.length,
            external: sum.external / this.memoryUsage.length
        };
    }

    calculateAverageCpu() {
        const sum = this.cpuUsage.reduce((acc, cpu) => ({
            user: acc.user + cpu.user,
            system: acc.system + cpu.system
        }), { user: 0, system: 0 });

        return {
            user: sum.user / this.cpuUsage.length,
            system: sum.system / this.cpuUsage.length
        };
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        if (this.gameProcess) {
            this.gameProcess.kill('SIGTERM');
            this.gameProcess = null;
        }

        console.log('\nPerformance monitoring stopped.');
        console.log(`Performance log saved to: ${this.logFile}`);
        
        // Generate summary report
        this.generateReport();
    }

    generateReport() {
        if (this.memoryUsage.length === 0) return;

        const avgMemory = this.calculateAverageMemory();
        const avgCpu = this.calculateAverageCpu();
        const maxMemory = this.memoryUsage.reduce((max, mem) => ({
            rss: Math.max(max.rss, mem.rss),
            heapUsed: Math.max(max.heapUsed, mem.heapUsed),
            heapTotal: Math.max(max.heapTotal, mem.heapTotal)
        }), { rss: 0, heapUsed: 0, heapTotal: 0 });

        const report = `
=== Performance Report ===
Duration: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s
Samples: ${this.memoryUsage.length}

Memory Usage:
  Average RSS: ${(avgMemory.rss / 1024 / 1024).toFixed(2)} MB
  Average Heap Used: ${(avgMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
  Average Heap Total: ${(avgMemory.heapTotal / 1024 / 1024).toFixed(2)} MB
  Peak RSS: ${(maxMemory.rss / 1024 / 1024).toFixed(2)} MB
  Peak Heap Used: ${(maxMemory.heapUsed / 1024 / 1024).toFixed(2)} MB

CPU Usage:
  Average User: ${(avgCpu.user / 1000).toFixed(2)}ms
  Average System: ${(avgCpu.system / 1000).toFixed(2)}ms
`;

        console.log(report);
        
        // Save report to file
        const reportFile = path.join(__dirname, 'performance-report.txt');
        fs.writeFileSync(reportFile, report);
        console.log(`Detailed report saved to: ${reportFile}`);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, stopping monitor...');
    if (global.monitor) {
        global.monitor.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, stopping monitor...');
    if (global.monitor) {
        global.monitor.stop();
    }
    process.exit(0);
});

// Start the monitor
if (require.main === module) {
    global.monitor = new PerformanceMonitor();
    global.monitor.start();
}

module.exports = PerformanceMonitor; 