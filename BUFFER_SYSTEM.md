# Buffer System Documentation

## Overview

The buffer system provides efficient double-buffered rendering for the terminal-based game. It uses a frame buffer to store rendered content and only updates the terminal for cells that have actually changed, significantly improving performance.

## Architecture

### Core Components

1. **Cell Class** (`src/renderer/frame-buffer.js`)
   - Stores individual cell data: character, ANSI color, z-index
   - Tracks dirty state for optimization
   - Provides comparison methods for diffing

2. **FrameBuffer Class** (`src/renderer/frame-buffer.js`)
   - Manages double-buffered 2D grid of cells
   - Handles dirty region tracking
   - Provides diffing between frames
   - Supports sprite rendering and area clearing

3. **BufferedRenderer Class** (`src/renderer/buffered-renderer.js`)
   - High-level renderer that uses FrameBuffer
   - Integrates with existing TerminalRenderer
   - Provides optimized terminal updates
   - Maintains compatibility with existing game code

## Key Features

### Double Buffering
- `currentFrame`: Active buffer being written to
- `previousFrame`: Previous frame for comparison
- Automatic buffer swapping at end of each frame

### Dirty Region Tracking
- Only marks cells that actually change as dirty
- Optimizes diffing by only comparing dirty cells
- Supports full redraw when needed (terminal resize, corruption)

### Efficient Terminal Updates
- Groups changes by row for minimal cursor movement
- Batches consecutive changes for single terminal writes
- Handles ANSI color codes efficiently

### Z-Index Support
- Each cell has a z-index for layering
- Higher z-index cells render on top
- Useful for UI elements, effects, etc.

### Sprite Line Support
- Preserves ANSI color codes in sprite data
- Handles complex sprites with embedded color information
- Maintains compatibility with existing sprite format

## Usage

### Basic Setup

```javascript
const TerminalRenderer = require('./src/renderer/terminal-renderer');
const BufferedRenderer = require('./src/renderer/buffered-renderer');

const terminalRenderer = new TerminalRenderer();
const bufferedRenderer = new BufferedRenderer(terminalRenderer);
```

### Rendering Content

```javascript
// Render a single character
bufferedRenderer.renderChar(x, y, '@', '32', 1);

// Render text
bufferedRenderer.renderText(x, y, 'Hello World', '31', 2);

// Render a sprite
const sprite = [
    ['*', '*', '*'],
    ['*', 'O', '*'],
    ['*', '*', '*']
];
bufferedRenderer.renderSprite(x, y, sprite, '33', 1);

// Clear an area
bufferedRenderer.clearArea(x, y, width, height);
```

### Frame Rendering

```javascript
// At the end of each frame
bufferedRenderer.render(); // Applies changes to terminal
```

## Performance Benefits

### Before Buffer System
- Every frame: Clear entire screen + redraw everything
- Constant flickering and screen updates
- Poor performance with many sprites

### After Buffer System
- Only updates cells that actually changed
- Minimal terminal I/O
- Smooth rendering with no flickering
- Scales well with complex scenes

## Statistics and Debugging

```javascript
const stats = bufferedRenderer.getStats();
console.log(stats);
// Output:
// {
//   width: 80,
//   height: 24,
//   totalCells: 1920,
//   dirtyCells: 15,
//   nonEmptyCells: 45,
//   dirtyRegions: 15,
//   fullRedraw: false,
//   changesThisFrame: 15,
//   isInitialized: true
// }
```

## Integration with Game Loop

The buffer system is integrated into the game loop:

1. **Update Phase**: Game logic updates positions, animations
2. **Render Phase**: Content is written to buffer (not terminal)
3. **Buffer Render**: Only changed cells are sent to terminal
4. **Buffer Swap**: Current frame becomes previous frame

## Advanced Features

### Terminal Resize Handling
```javascript
// Automatically resizes buffer when terminal changes
bufferedRenderer.handleResize();
```

### Force Full Redraw
```javascript
// Useful for debugging or terminal corruption
bufferedRenderer.forceFullRedraw();
```

### Direct Buffer Access
```javascript
const { FrameBuffer } = require('./src/renderer/frame-buffer');
const buffer = new FrameBuffer(80, 24);

// Direct cell manipulation
buffer.setCell(x, y, char, color, zIndex);
buffer.setCells(x, y, sprite, color, zIndex);

// Get diff for custom rendering
const diff = buffer.getOptimizedDiff();
```

## Color Support

The buffer system supports ANSI color codes:

- `'31'` - Red
- `'32'` - Green  
- `'33'` - Yellow
- `'34'` - Blue
- `'35'` - Magenta
- `'36'` - Cyan
- `'37'` - White
- `null` - Default terminal color

## Best Practices

1. **Always call `render()` at the end of each frame**
2. **Use appropriate z-indexes for layering**
3. **Clear areas before rendering new content**
4. **Handle terminal resize events**
5. **Monitor performance with `getStats()`**

## Troubleshooting

### Game not responding
- Check if `render()` is being called each frame
- Verify buffer is initialized properly

### Performance issues
- Monitor dirty cell count with `getStats()`
- Consider reducing update frequency
- Check for unnecessary full redraws

### Visual artifacts
- Call `forceFullRedraw()` to reset buffer
- Check for terminal resize events
- Verify sprite dimensions match expectations

## Future Enhancements

- **Transparency support**: Alpha blending for effects
- **Animation interpolation**: Smooth movement between frames
- **Particle systems**: Efficient particle rendering
- **Shader-like effects**: Post-processing on buffer
- **Multi-buffer support**: Separate buffers for different layers 