const termkit = require('terminal-kit');
const term = termkit.terminal;

// Import Jimp properly
let Jimp;
try {
    const jimpModule = require('jimp');
    Jimp = jimpModule.Jimp || jimpModule;
} catch (error) {
    console.error('Jimp not installed. Please run: npm install jimp');
    process.exit(1);
}

// Character generator using Jimp
class CharacterGenerator {
    constructor() {
        this.width = process.stdout.columns || 80;
        this.height = process.stdout.rows || 24;
    }

    // Generate character data from image
    async generateCharacter(imagePath, size = 32, options = {}) {
        try {
            console.log('Loading image for character generation...');
            
            // Load and resize image
            const image = await Jimp.read(imagePath);
            const resizedImage = image.resize({ w: size, h: size });
            
            console.log('Generating character data with true color and transparency...');
            
            // Set default options for true color with transparency
            const defaultOptions = {
                useTrueColor: true,
                trueColorChar: ' ',
                transparencyThreshold: 128,
                transparentChar: ' ',
                ...options
            };
            
            // Convert to character data with options
            const characterData = this.imageToCharacterData(resizedImage, defaultOptions);
            
            // Display and save character
            this.displayCharacter(characterData);
            this.saveCharacterData(characterData, imagePath, defaultOptions);
            
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

    // Convert image to character data with transparency support
    imageToCharacterData(image, options = {}) {
        const {
            transparencyThreshold = 128,
            transparentChar = ' ',
            blockChars = [' ', '░', '▒', '▓', '█'],
            invert = false,
            invisibleTransparent = false,
            replaceLightest = false,
            useTrueColor = false,
            trueColorChar = ' '
        } = options;
        
        const characterData = [];
        const height = image.bitmap.height;
        const width = image.bitmap.width;
        
        for (let y = 0; y < height; y++) {
            let line = '';
            for (let x = 0; x < width; x++) {
                const pixelColor = image.getPixelColor(x, y);
                const a = (pixelColor >> 24) & 255; // Alpha channel
                const r = (pixelColor >> 16) & 255;
                const g = (pixelColor >> 8) & 255;
                const b = pixelColor & 255;
                
                // Check for transparency
                if (a < transparencyThreshold) {
                    // Use invisible character for transparent areas if requested
                    if (invisibleTransparent) {
                        line += '\u200B'; // Zero-width space
                    } else {
                        line += transparentChar;
                    }
                } else {
                    if (useTrueColor) {
                        // Use true color ANSI codes with brightness-based character selection
                        const brightness = (r + g + b) / 3;
                        let char = trueColorChar;
                        
                        // Use different characters based on brightness for better detail
                        if (brightness < 64) {
                            char = '█'; // Full block for dark areas
                        } else if (brightness < 128) {
                            char = '▓'; // Dark shade for medium-dark areas
                        } else if (brightness < 192) {
                            char = '▒'; // Medium shade for medium-light areas
                        } else {
                            char = '░'; // Light shade for bright areas
                        }
                        
                        const colorCode = `\x1b[48;2;${r};${g};${b}m`;
                        const resetCode = '\x1b[0m';

                        // transparent character
                        // if (r == 0 && g == 255 && b == 0) {
                        //     line += ' ';
                        //     continue;
                        // }

                        line += `${colorCode}${char}${resetCode}`; // Colored character
                    } else {
                        const brightness = (r + g + b) / 3;
                        let charIndex = Math.floor((brightness / 255) * (blockChars.length - 1));
                        
                        // Invert if requested
                        if (invert) {
                            charIndex = blockChars.length - 1 - charIndex;
                        }
                        
                        let char = blockChars[charIndex];
                        
                        // Replace lightest character with space if requested
                        if (replaceLightest && char === '░') {
                            char = ' ';
                        }
                        
                        line += char;
                    }
                }
            }
            characterData.push(line);
        }
        
        return characterData;
    }

    // Display character
    displayCharacter(characterData) {
        term.clear();
        term.moveTo(1, 1);
        term('🎮 Generated Character Data\n\n');
        
        characterData.forEach(line => {
            term(line + '\n');
        });
        
        term('\nCharacter data generated successfully!\n');
        term('Press any key to exit...\n');
        
        term.grabInput();
        term.on('key', () => {
            term.grabInput(false);
            term.clear();
            process.exit(0);
        });
    }

    // Save character data to file
    saveCharacterData(characterData, originalImagePath) {
        const fs = require('fs');
        const path = require('path');
        
        // Create character data as JavaScript array
        const characterCode = `// Generated character data
const characterData = [
${characterData.map(line => `    '${line}',`).join('\n')}
];

module.exports = characterData;
`;
        
        // Save to file
        const outputPath = path.basename(originalImagePath, path.extname(originalImagePath)) + '-character.js';
        fs.writeFileSync(outputPath, characterCode);
        
        console.log(`Character data saved to: ${outputPath}`);
    }

    // Generate multiple character variations with different transparency settings
    async generateCharacterSet(imagePath) {
        try {
            console.log('Generating character set with transparency variations...');
            
            const image = await Jimp.read(imagePath);
            const sizes = [16, 24, 32];
            const transparencySettings = [
                { name: 'true-color-default', threshold: 128, char: ' ', useTrueColor: true, trueColorChar: ' ' },
                { name: 'true-color-block', threshold: 128, char: ' ', useTrueColor: true, trueColorChar: '█' },
                { name: 'true-color-dot', threshold: 128, char: ' ', useTrueColor: true, trueColorChar: '·' },
                { name: 'ascii-strict', threshold: 200, char: ' ' },
                { name: 'ascii-normal', threshold: 128, char: ' ' },
                { name: 'ascii-loose', threshold: 64, char: ' ' },
                { name: 'ascii-inverted', threshold: 128, char: ' ', invert: true },
                { name: 'ascii-invisible', threshold: 128, char: ' ', invisibleTransparent: true },
                { name: 'ascii-lightest-replaced', threshold: 128, char: ' ', replaceLightest: true }
            ];
            
            const characterSet = {};
            
            for (const size of sizes) {
                const resizedImage = image.resize({ w: size, h: size });
                characterSet[size] = {};
                
                for (const setting of transparencySettings) {
                    const options = {
                        transparencyThreshold: setting.threshold,
                        transparentChar: setting.char,
                        invert: setting.invert || false,
                        invisibleTransparent: setting.invisibleTransparent || false,
                        replaceLightest: setting.replaceLightest || false,
                        useTrueColor: setting.useTrueColor || false
                    };
                    
                    const characterData = this.imageToCharacterData(resizedImage, options);
                    characterSet[size][setting.name] = characterData;
                }
            }
            
            this.displayCharacterSet(characterSet);
            this.saveCharacterSet(characterSet, imagePath);
            
        } catch (error) {
            console.error('Error:', error.message);
        }
    }

    // Display character set
    displayCharacterSet(characterSet) {
        term.clear();
        term.moveTo(1, 1);
        term('Character Set Generated\n\n');
        
        Object.entries(characterSet).forEach(([size, variations]) => {
            term(`${size}x${size} Characters:\n`);
            Object.entries(variations).forEach(([variation, data]) => {
                term(`  ${variation}:\n`);
                data.forEach(line => {
                    term('    ' + line + '\n');
                });
                term('\n');
            });
        });
        
        term('Press any key to exit...\n');
        
        term.grabInput();
        term.on('key', () => {
            term.grabInput(false);
            term.clear();
            process.exit(0);
        });
    }

    // Save character set
    saveCharacterSet(characterSet, originalImagePath) {
        const fs = require('fs');
        const path = require('path');
        
        const characterSetCode = `// Generated character set with transparency variations
const characterSet = {
${Object.entries(characterSet).map(([size, variations]) => 
    `    ${size}: {\n${Object.entries(variations).map(([variation, data]) => 
        `        ${variation}: [\n${data.map(line => `            '${line}',`).join('\n')}\n        ]`
    ).join(',\n')}\n    }`
).join(',\n')}
};

module.exports = characterSet;
`;
        
        const outputPath = path.basename(originalImagePath, path.extname(originalImagePath)) + '-character-set.js';
        fs.writeFileSync(outputPath, characterSetCode);
        
        console.log(`Character set saved to: ${outputPath}`);
    }

    // Generate true color character with different color modes
    async generateTrueColorCharacter(imagePath, options = {}) {
        try {
            console.log('Loading image for true color character generation...');
            
            const image = await Jimp.read(imagePath);
            const resizedImage = image.resize({ w: options.size || 32, h: options.size || 32 });
            
            console.log('Generating true color character data with transparency...');
            
            // Set default options for true color with transparency
            const defaultOptions = {
                useTrueColor: true,
                trueColorChar: ' ',
                transparencyThreshold: 128,
                transparentChar: ' ',
                ...options
            };
            
            const characterData = this.imageToCharacterData(resizedImage, defaultOptions);
            
            this.displayCharacter(characterData);
            this.saveCharacterData(characterData, imagePath, defaultOptions);
            
        } catch (error) {
            console.error('Error:', error.message);
        }
    }

    // Generate character with custom transparency settings
    async generateCharacterWithOptions(imagePath, options = {}) {
        try {
            console.log('Loading image for character generation...');
            
            const image = await Jimp.read(imagePath);
            const resizedImage = image.resize({ w: options.size || 32, h: options.size || 32 });
            
            console.log('Generating character data with custom settings...');
            
            const characterData = this.imageToCharacterData(resizedImage, options);
            
            this.displayCharacter(characterData);
            this.saveCharacterData(characterData, imagePath, options);
            
        } catch (error) {
            console.error('Error:', error.message);
        }
    }

    // Save character data to file with options info
    saveCharacterData(characterData, originalImagePath, options = {}) {
        const fs = require('fs');
        const path = require('path');
        
        const optionsInfo = Object.keys(options).length > 0
  ? '// Options:\n' + JSON.stringify(options, null, 2)
      .split('\n')
      .map(line => `// ${line}`)
      .join('\n') + '\n'
  : '';
        
        const characterCode = `${optionsInfo}// Generated character data
            const characterData = [
                ${characterData.map(line => `    '${line}',`).join('\n')}
            ];

            module.exports = characterData;
        `;
        
        const outputPath = path.join('src', 'assets', path.basename(originalImagePath, path.extname(originalImagePath)) + '.js');
        fs.writeFileSync(outputPath, characterCode);
        
        console.log(`Character data saved to: ${outputPath}`);
    }
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node generate.js <image-path> [mode] [options]');
        console.log('Modes:');
        console.log('  single (default) - Generate single character with true color and transparency');
        console.log('  set - Generate character set with variations');
        console.log('  custom - Generate with custom options');
        console.log('  true-color - Generate true color character');
        console.log('');
        console.log('Default behavior: True color with transparency (spaces for transparent areas)');
        console.log('');
        console.log('Options for custom mode:');
        console.log('  --threshold <number> - Transparency threshold (0-255)');
        console.log('  --size <number> - Character size (default: 32)');
        console.log('  --invert - Invert colors');
        console.log('  --char <char> - Transparent character (default: space)');
        console.log('  --invisible - Use invisible characters for transparent areas');
        console.log('  --replace-lightest - Replace ░ with spaces for more transparency');
        console.log('  --true-color - Use true color ANSI codes instead of ASCII characters');
        console.log('  --true-color-char <char> - Character to use for true color (default: space)');
        console.log('  --no-true-color - Disable true color (use ASCII characters)');
        console.log('');
        console.log('Examples:');
        console.log('  node generate.js character.png');
        console.log('  node generate.js character.png set');
        console.log('  node generate.js character.png custom --threshold 100 --size 24');
        console.log('  node generate.js character.png custom --no-true-color');
        process.exit(1);
    }
    
    const imagePath = args[0];
    const mode = args[1] || 'single';
    
    const generator = new CharacterGenerator();
    
    if (mode === 'set') {
        await generator.generateCharacterSet(imagePath);
    } else if (mode === 'true-color') {
        await generator.generateTrueColorCharacter(imagePath, {});
    } else if (mode === 'custom') {
        // Parse custom options
        const options = {};
        for (let i = 2; i < args.length; i += 2) {
            const flag = args[i];
            const value = args[i + 1];
            
            switch (flag) {
                case '--threshold':
                    options.transparencyThreshold = parseInt(value);
                    break;
                case '--size':
                    options.size = parseInt(value);
                    break;
                case '--char':
                    options.transparentChar = value;
                    break;
                case '--invert':
                    options.invert = true;
                    i--; // Don't skip next argument
                    break;
                case '--invisible':
                    options.invisibleTransparent = true;
                    i--; // Don't skip next argument
                    break;
                case '--replace-lightest':
                    options.replaceLightest = true;
                    i--; // Don't skip next argument
                    break;
                case '--true-color':
                    options.useTrueColor = true;
                    i--; // Don't skip next argument
                    break;
                case '--no-true-color':
                    options.useTrueColor = false;
                    i--; // Don't skip next argument
                    break;
                case '--true-color-char':
                    options.trueColorChar = value;
                    break;
            }
        }
        
        await generator.generateCharacterWithOptions(imagePath, options);
    } else {
        await generator.generateCharacter(imagePath);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = CharacterGenerator;
