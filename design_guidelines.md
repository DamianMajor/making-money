# Design Guidelines: Village Ledger Educational Game

## Design Approach
**Retro Educational Game Aesthetic** - Drawing inspiration from classic educational games like Oregon Trail and Carmen Sandiego, combined with the minimalist charm of Monument Valley's geometric storytelling.

## Core Visual Principles
- **Geometric Simplicity**: Clean shapes with subtle textures to suggest materials (stone, wood, water)
- **Educational Clarity**: Every UI element must be immediately readable and unambiguous
- **Timeless Village Setting**: Earth tones and natural materials reflecting ancient civilization

## Typography System

**Dialogue Text**:
- Primary: Monospace font (Press Start 2P or similar retro game font)
- Size: 16-18px for readability on tablets
- Line height: 1.6 for comfortable reading in dialogue boxes

**UI Labels (Stone Tablet HUD)**:
- Font: Bold sans-serif or carved stone effect font
- Size: 14px for NAME/DEBT headers, 12px for entries
- All caps for stone tablet authenticity

**Interaction Button**:
- Font: Bold, rounded sans-serif
- Size: 20px, highly legible
- All caps ("INTERACT")

## Layout & Spacing System

**Canvas Structure**:
- Game viewport: Full screen with 16:9 or 4:3 aspect ratio support
- Safe zones: 24px padding from edges on all sides

**Dialogue Box (Bottom 20%)**:
- Height: Fixed 20% of viewport
- Padding: 32px horizontal, 24px vertical
- Border: 4px solid border with stone texture
- Background: Semi-opaque dark overlay (90% opacity) for contrast

**Stone Tablet HUD (Top-Right)**:
- Size: 240px width × 140px height
- Position: 24px from top and right edges
- Padding: 16px internal spacing
- Border: 6px beveled edge suggesting carved stone

**Touch Zones**:
- Left/Right movement: Full vertical height, split 50/50 horizontally
- Visual feedback area: Subtle 32px height indicator at bottom showing active zone

**Interact Button**:
- Size: 120px × 120px circular or 140px × 60px rounded rectangle
- Position: Bottom-right, 32px from edges
- Only visible when overlapping NPC (fade in/out transition 200ms)

## Component Design Specifications

**Character Rectangles** (Placeholder Phase):
- Player: 40px × 60px blue rectangle with 2px white outline
- Stone-worker: 40px × 60px green rectangle with tool icon
- Fisherman: 40px × 60px orange rectangle with fish icon
- Village Elder: 50px × 70px white rectangle with staff icon
- All rectangles: 4px rounded corners, drop shadow for depth

**Background Environment**:
- Ground plane: Earthy brown strip (80px height)
- Sky gradient: Warm sunset palette (peach to light blue)
- Village elements: Simple geometric buildings (rectangles with triangular roofs) in mid-ground
- Layered parallax: 3 layers (far buildings, mid buildings, foreground)

**Stone Tablet HUD Details**:
- Background: Beige/tan stone texture
- Border: Chiseled stone effect with darker edges
- Table format:
  - Header row: NAME | DEBT (separated by vertical divider)
  - Entry rows: Player name | Debt count
  - Row height: 32px
  - Column ratio: 60% name, 40% debt

**Dialogue Box Components**:
- Speaker label: Top-left, character name in brackets [STONE-WORKER]
- Text area: Centered, left-aligned text
- Continue indicator: Small pulsing arrow bottom-right when text complete
- Background pattern: Subtle papyrus or parchment texture

**Interact Button States**:
- Default (visible): Bright highlight, scale 1.0
- Active press: Scale 0.95, slight darkening
- Disabled (invisible): opacity 0, pointer-events none
- Transition: All state changes 150ms ease

## Animation Guidelines

**Character Movement**:
- Walk cycle: Simple 2-frame bob animation (150ms per frame)
- Idle: Subtle breathing animation (1s cycle)

**Village Elder Entrance**:
- Entry: Slide down from top-center over 800ms with ease-out
- Scale: Start at 0.8, grow to 1.0 during entrance

**UI Transitions**:
- Stone Tablet reveal: Slide in from right, 400ms
- Ledger entry population: Type-on effect, 40ms per character
- Dialogue fade: 200ms crossfade between speakers

**Touch Feedback**:
- Active zone highlight: 100ms pulse on touch
- Button press: Immediate scale reduction, bounce back on release

## Spatial Hierarchy

**Z-Index Layers** (front to back):
1. Dialogue Box (always on top)
2. Stone Tablet HUD
3. Interact Button
4. Player character
5. NPCs
6. Foreground props
7. Mid-ground village
8. Background sky

**Camera Follow**:
- Smooth lerp: Player stays centered horizontally with 0.1 smoothing
- Vertical: Fixed (no vertical camera movement)
- Bounds: Stop at world edges, don't show black void

## Educational Design Elements

**Progressive Disclosure**:
- Start: Empty Stone Tablet to emphasize its importance when introduced
- Teach: Clear cause-effect when Elder introduces the ledger
- Reinforce: Stone-worker's acknowledgment validates the system

**Visual Feedback**:
- Inventory changes: Small pop-up notification ("+1 STONE" appears above player)
- Ledger update: Gentle glow effect on Stone Tablet when entry added
- Quest progression: Subtle checkmark or progress indicator

This design creates an accessible, educationally focused retro game experience that clearly communicates the importance of record-keeping while maintaining engaging, tablet-friendly interactions.