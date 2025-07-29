# Elk NPCs

## Overview

Elk NPCs have been added to the game as non-player characters that provide life and movement to the game world. They are similar to the player character but with their own animations and behaviors.

## Features

### Elk Animation System
- **Location**: `src/animations/elk.js`
- **Animations**: Idle animations for all 4 directions (up, down, left, right)
- **Frame Rate**: Slower than character (300ms vs 200ms) for more natural elk movement
- **Sprite Size**: 32x22 pixels (same as character)

### NPC Management System
- **Location**: `src/game/npc-manager.js`
- **Supports**: Multiple NPC types (currently elk)
- **Behaviors**: Autonomous behavior patterns
- **Rendering**: Integrated with the main game loop

### Elk Behavior
- **Direction Changes**: 30% chance every 3 seconds to change direction
- **Movement Animation**: 20% chance to briefly animate movement
- **Idle Animation**: Continuous idle animation cycles
- **Autonomous**: No player input required

## Implementation Details

### ElkAnimation Class
```javascript
const { ElkAnimation } = require('./src/animations/elk');
const elk = new ElkAnimation();
```

### NPC Manager
```javascript
const { NPCManager } = require('./src/game/npc-manager');
const npcManager = new NPCManager();
npcManager.addNPC('elk', x, y);
```

### Game Integration
- Elk NPCs are automatically initialized when the game starts
- They are rendered alongside the player character
- Each elk has its own animation state and position

## Usage

1. **Start the game**: `node start.js`
2. **Move around**: Use arrow keys to move the character
3. **Observe elk**: Watch the elk NPCs animate and change directions
4. **Quit**: Press 'Q' to exit

## Technical Notes

- Elk sprites are stored in `src/assets/elk/idle/`
- Each direction has 3 animation frames (0, 1, 2)
- The animation cycles through: 0 → 1 → 0 → 2 → 0...
- Elk NPCs are positioned at fixed locations in the game world
- The system is extensible for adding more NPC types

## Future Enhancements

- Movement patterns (wandering, following paths)
- Interaction with player character
- Different elk behaviors (grazing, alert, etc.)
- Sound effects for elk
- More NPC types (deer, birds, etc.) 