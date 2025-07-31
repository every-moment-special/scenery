const termkit = require('terminal-kit');
const term = termkit.terminal;

// Import Sharp properly
let sharp;
try {
    sharp = require('sharp');
    if (!sharp || typeof sharp !== 'function') {
        throw new Error('Sharp not found');
    }
} catch (error) {
    console.error('Sharp not installed. Please run: npm install sharp');
    process.exit(1);
}

// Character generator using Sharp - optimized for new buffer system
class CharacterGenerator {
    constructor() {
        this.width = process.stdout.columns || 80;
        this.height = process.stdout.rows || 24;
    }

    // Generate character data from image
    async generateCharacter(imagePath, size = 32, options = {}) {
        try {
            console.log('Loading image for character generation...');
            
            // Load and resize image using Sharp
            const image = sharp(imagePath);
            const resizedImage = await image.resize(size, size).raw().toBuffer({ resolveWithObject: true });
            
            console.log('Generating character data optimized for new buffer system...');
            
            // Convert to character data with options
            const characterData = await this.imageToCharacterData(resizedImage, options);
            
            // Display and save character
            this.displayCharacter(characterData);
            this.saveCharacterData(characterData, imagePath);
            
        } catch (error) {
            console.error('Error:', error.message);
            term.clear();
            term('❌ Error loading image: ' + error.message + '\n');
            term('Press any key to exit...\n');
            
            term.grabInput();
            term.on('key', () => {
                term.grabInput(false);
                process.exit(0);
            });
        }
    }

    // Calculate perceptual color with proper luminance and gamma correction
    calculatePerceptualColor(r, g, b, a, colorAccuracy = 'perceptual') {
        // Convert to normalized values (0-1)
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        const aNorm = a / 255;
        
        // Apply gamma correction based on color accuracy mode
        let rLinear, gLinear, bLinear, luminance;
        
        if (colorAccuracy === 'linear') {
            // Linear color space - no gamma correction
            rLinear = rNorm;
            gLinear = gNorm;
            bLinear = bNorm;
            luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
        } else if (colorAccuracy === 'accurate') {
            // Accurate color space - minimal adjustments for color fidelity
            const gammaCorrect = (c) => {
                return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            };
            
            rLinear = gammaCorrect(rNorm);
            gLinear = gammaCorrect(gNorm);
            bLinear = gammaCorrect(bNorm);
            
            // Calculate perceptual luminance using sRGB coefficients
            luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
        } else {
            // Perceptual color space - apply gamma correction
            const gammaCorrect = (c) => {
                return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            };
            
            rLinear = gammaCorrect(rNorm);
            gLinear = gammaCorrect(gNorm);
            bLinear = gammaCorrect(bNorm);
            
            // Calculate perceptual luminance using sRGB coefficients
            // These coefficients are based on human eye sensitivity to different colors
            luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
        }
        
        // Apply perceptual adjustments for better color accuracy
        // Enhance contrast and saturation for terminal display
        const saturation = Math.max(rNorm, gNorm, bNorm) - Math.min(rNorm, gNorm, bNorm);
        const brightness = (rNorm + gNorm + bNorm) / 3;
        
        // Adjust colors for better terminal display
        let adjustedR = r;
        let adjustedG = g;
        let adjustedB = b;
        
        // Enhanced color adjustments for better terminal display
        if (colorAccuracy === 'enhanced') {
            // Apply more subtle saturation boost for better color distinction
            const saturationBoost = 1.08; // Reduced from 1.15
            const maxColor = Math.max(r, g, b);
            const minColor = Math.min(r, g, b);
            const delta = maxColor - minColor;
            
            if (delta > 0) {
                // Boost saturation while preserving luminance
                const newDelta = Math.min(255, delta * saturationBoost);
                const midPoint = (maxColor + minColor) / 2;
                
                if (r === maxColor) {
                    adjustedR = Math.round(midPoint + newDelta / 2);
                    adjustedG = Math.round(midPoint - newDelta / 2);
                    adjustedB = Math.round(midPoint - newDelta / 2);
                } else if (g === maxColor) {
                    adjustedR = Math.round(midPoint - newDelta / 2);
                    adjustedG = Math.round(midPoint + newDelta / 2);
                    adjustedB = Math.round(midPoint - newDelta / 2);
                } else {
                    adjustedR = Math.round(midPoint - newDelta / 2);
                    adjustedG = Math.round(midPoint - newDelta / 2);
                    adjustedB = Math.round(midPoint + newDelta / 2);
                }
            }
        } else if (colorAccuracy === 'accurate') {
            // Accurate mode - minimal adjustments for color fidelity
            adjustedR = r;
            adjustedG = g;
            adjustedB = b;
        }
        
        // Enhance contrast for better visibility in terminal (skip for accurate mode)
        if (colorAccuracy !== 'accurate') {
            if (luminance > 0.7) {
                // Very slightly brighten bright colors for better visibility
                const factor = 1.02; // Reduced from 1.05
                adjustedR = Math.min(255, Math.round(adjustedR * factor));
                adjustedG = Math.min(255, Math.round(adjustedG * factor));
                adjustedB = Math.min(255, Math.round(adjustedB * factor));
            } else if (luminance < 0.15) {
                // Very slightly darken very dark colors for better contrast
                const factor = 0.99; // Increased from 0.98
                adjustedR = Math.round(adjustedR * factor);
                adjustedG = Math.round(adjustedG * factor);
                adjustedB = Math.round(adjustedB * factor);
            }
        }
        
        // Apply alpha blending for transparency
        if (aNorm < 1) {
            adjustedR = Math.round(adjustedR * aNorm);
            adjustedG = Math.round(adjustedG * aNorm);
            adjustedB = Math.round(adjustedB * aNorm);
        }
        
        return {
            luminance: luminance,
            R: adjustedR,
            G: adjustedG,
            B: adjustedB,
            saturation: saturation,
            brightness: brightness
        };
    }

    // Convert image to character data optimized for new buffer system
    async imageToCharacterData(imageData, options = {}) {
        const {
            transparencyThreshold = 128,
            transparentChar = ' ',
            invisibleTransparent = false,
            colorAccuracy = 'perceptual'
        } = options;
        
        const { data, info } = imageData;
        const height = info.height;
        const width = info.width;
        const channels = info.channels;
        const cells = [];

        for (let y = 0; y < height - 1; y += 2) {
            for (let x = 0; x < width; x++) {
                const upperIndex = (y * width + x) * channels;
                const lowerIndex = ((y + 1) * width + x) * channels;
    
                const upperA = channels === 4 ? data[upperIndex + 3] : 255;
                const lowerA = channels === 4 ? data[lowerIndex + 3] : 255;

                let char = '';
                let ansi = '';
    
                const upperVisible = upperA >= transparencyThreshold;
                const lowerVisible = lowerA >= transparencyThreshold;

                if (upperVisible && lowerVisible) {
                    const upperColor = this.calculatePerceptualColor(
                        data[upperIndex],
                        data[upperIndex + 1],
                        data[upperIndex + 2],
                        upperA,
                        colorAccuracy
                    );
                    const lowerColor = this.calculatePerceptualColor(
                        data[lowerIndex],
                        data[lowerIndex + 1],
                        data[lowerIndex + 2],
                        lowerA,
                        colorAccuracy
                    );
                    ansi = `\x1b[38;2;${upperColor.R};${upperColor.G};${upperColor.B}m` +
                           `\x1b[48;2;${lowerColor.R};${lowerColor.G};${lowerColor.B}m`;
                    char = '▀';
                } else if (upperVisible) {
                    const upperColor = this.calculatePerceptualColor(
                        data[upperIndex],
                        data[upperIndex + 1],
                        data[upperIndex + 2],
                        upperA,
                        colorAccuracy
                    );
                    ansi = `\x1b[38;2;${upperColor.R};${upperColor.G};${upperColor.B}m`;
                    char = '▀';
                } else if (lowerVisible) {
                    const lowerColor = this.calculatePerceptualColor(
                        data[lowerIndex],
                        data[lowerIndex + 1],
                        data[lowerIndex + 2],
                        lowerA,
                        colorAccuracy
                    );
                    ansi = `\x1b[38;2;${lowerColor.R};${lowerColor.G};${lowerColor.B}m`;
                    char = '▄';
                } else {
                    char = invisibleTransparent ? '\u200B' : transparentChar;
                    ansi = '';
                }

                // Only add cells that are visible (not transparent)
                if (char !== transparentChar && char !== '\u200B') {
                    cells.push({
                        x: x,
                        y: Math.floor(y / 2),
                        char: char,
                        ansi: ansi
                    });
                }
            }
        }
        
        return cells;
    }

    // Display character
    displayCharacter(characterData) {
        term.clear();
        term.moveTo(1, 1);

        // Convert cells back to display format for preview
        const maxY = Math.max(...characterData.map(cell => cell.y));
        const maxX = Math.max(...characterData.map(cell => cell.x));
        
        // Create a 2D array for display
        const display = Array(maxY + 1).fill().map(() => Array(maxX + 1).fill(' '));
        
        // Fill in the cells
        characterData.forEach(cell => {
            if (cell.y < display.length && cell.x < display[0].length) {
                display[cell.y][cell.x] = cell.ansi + cell.char + '\x1b[0m';
            }
        });
        
        // Display the character
        display.forEach(row => {
            term(row.join('') + '\n');
        });
        
        term.grabInput();
        term.on('key', () => {
            term.grabInput(false);
            term.clear();
            process.exit(0);
        });
    }

    // Save character data to file with optimized format for new buffer system
    saveCharacterData(characterData, originalImagePath) {
        const fs = require('fs');
        const path = require('path');
        
        // Create optimized format for new buffer system with individual cells
        const characterCode = `// Generated character data optimized for new buffer system
// This format works efficiently with Buffer.setCell()
const characterData = [
${characterData.map(cell => `    { x: ${cell.x}, y: ${cell.y}, char: '${cell.char}', ansi: '${cell.ansi}' },`).join('\n')}
];

module.exports = characterData;
`;
        
        const outputPath = path.join('src', 'assets', path.basename(originalImagePath, path.extname(originalImagePath)) + '.js');
        fs.writeFileSync(outputPath, characterCode);
        
        console.log(`Character data saved to: ${outputPath}`);
        console.log(`Generated ${characterData.length} cells optimized for new buffer system`);
        console.log('Format works efficiently with Buffer.setCell()');
    }
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    const imagePath = args[0];
    const generator = new CharacterGenerator();
    
    // Parse options from command line
    const options = {};
    if (args.includes('--accurate')) {
        options.colorAccuracy = 'accurate';
    } else if (args.includes('--enhanced')) {
        options.colorAccuracy = 'enhanced';
    } else if (args.includes('--linear')) {
        options.colorAccuracy = 'linear';
    } else {
        options.colorAccuracy = 'perceptual'; // default
    }
    
    if (args.includes('--invisible-transparent')) {
        options.invisibleTransparent = true;
    }
    
    await generator.generateCharacter(imagePath, 32, options);
}

// Utility function for batch generation with different settings
async function generateWithSettings(imagePath, settings = {}) {
    const generator = new CharacterGenerator();
    const defaultSettings = {
        size: 32,
        colorAccuracy: 'perceptual',
        transparencyThreshold: 128,
        transparentChar: ' ',
        invisibleTransparent: false
    };
    
    const finalSettings = { ...defaultSettings, ...settings };
    await generator.generateCharacter(imagePath, finalSettings.size, finalSettings);
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { CharacterGenerator, generateWithSettings };

