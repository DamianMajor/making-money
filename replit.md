# Village Ledger Educational Game

## Overview

Village Ledger is an educational side-scrolling game built with HTML5 Canvas and React. The game teaches concepts about record-keeping and trust through a narrative set in an ancient village. Players interact with NPCs (Stone-worker, Fisherman, Village Elder) to experience how a dispute over a promise leads to the invention of a "Stone Tablet" ledger system. The game is optimized for touch-only input on iPad/tablet devices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React SPA** with TypeScript using Vite as the build tool
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** for server state management and API calls
- **Shadcn/UI** component library built on Radix primitives with Tailwind CSS styling
- **HTML5 Canvas** for the game rendering engine (`client/src/lib/gameEngine.ts`)

### Game Engine Design
- Custom vanilla JavaScript game engine using `requestAnimationFrame` for 60fps rendering
- Touch-only input system - screen divided into left/right zones for movement
- Player speed: 200 units/second, interaction range: 200 units (tablet-friendly)
- Character system with placeholder colored rectangles (Blue=Player, Brown=Woodcutter, Gray=Stone-worker, Orange=Fisherman, White=Elder)
- HUD displays a "Stone Tablet" ledger tracking debts/promises
- Dialogue system with typewriter effect using "Press Start 2P" retro font
- INTERACT button with 200ms fade transition in bottom-right corner
- Multiple choice dialogue system with red/green color-coded buttons

### World Layout (3500px wide)
- **x=100** - Player Home (starting position)
- **x=700** - Woodcutter (FIRST NPC - needs Sharp Stone for broken axe)
- **x=1480** - Village Elder (separate from Stone Tablet, with spacing)
- **x=1600** - Stone Tablet / Village Center marker
- **x=2000** - Berry Bush (for foraging berries, gated until Fisherman gives fish)
- **x=2500** - Stone-worker (gives stone, owes fish) - has originalX for reset
- **x=3200** - Fisherman (gives fish, owes 3 berries) - has originalX for reset

### NPC Movement System
NPCs can walk toward a target position (targetX property):
- Stone-worker and Fisherman have `originalX` to store their starting positions
- After giving items, NPCs set `targetX` to Village Center and walk there at 80 units/second
- This ensures NPCs are gathered at town center when player returns with berries
- On game reset or Loop 2 start, NPCs return to original positions

### Brawl Trigger System
The brawl trigger uses requirement-based checking (not phase-based):
- **phase === 'got_berries'** (verbal promise path)
- **inventory.fish >= 1** (player has fish)
- **inventory.berries >= 3** (player has 3 berries)
- **player.x within 200px of Village Center (x=1600)**
This ensures the brawl triggers when all requirements are met on the verbal promise path.

### Confrontation Dialogue Flow
The confrontation is a staged payment sequence:
1. Player says "Stone-worker! I'm here with your fish, as promised."
2. Stone-worker disputes: "One fish?! I clearly remember TWO fish!"
3. Player tries to pay Fisherman with berries
4. Fisherman disputes: "Three berries? I'm certain you promised SIX!"
5. Player protests, leading to brawl animation

### Two-Loop Game State System
The game uses a "Groundhog Day" narrative structure with two loops:

**Loop 1 (Failure Path):**
1. `intro` → `need_wood` - Storm approaching, need wood from Woodcutter
2. `need_wood` → `need_stone` - Woodcutter's axe broken, need Sharp Stone
3. `need_stone` → `got_stone` - Stone-worker gives stone on verbal promise (owes fish)
4. `got_stone` → `got_fish` - Fisherman gives fish on verbal promise (owes 3 berries)
5. `got_fish` → `got_berries` - Collect 3 berries from Berry Bush
6. `got_berries` → `confrontation` → `brawl` → `fail` - Return to Village Center triggers gaslighting dispute and brawl

**Loop 2 (Success Path):**
1. Same flow but with choice dialogue offering "verbal promise" vs "record on Stone Tablet"
2. Recording debts on the ledger prevents gaslighting
3. Elder settles debts peacefully using the ledger
4. Quiz tests player's understanding
5. Success screen with educational message

### Backend Architecture
- **Express.js** server with TypeScript
- Serves both API routes and static frontend assets
- In-memory storage implementation with interface for future database integration
- Vite dev server integration for hot module replacement during development

### Build System
- **Vite** for frontend bundling with React plugin
- **esbuild** for server-side TypeScript compilation
- Custom build script (`script/build.ts`) that bundles frequently-used dependencies to reduce cold start times
- Output goes to `dist/` directory with static assets in `dist/public/`

### Design System
- Retro educational game aesthetic inspired by Oregon Trail and Carmen Sandiego
- Earth tones and natural materials reflecting ancient civilization theme
- Typography uses monospace fonts for dialogue, bold sans-serif for UI labels
- Responsive canvas that handles different tablet aspect ratios

## External Dependencies

### Database
- **PostgreSQL** with Drizzle ORM for database operations
- Schema defined in `shared/schema.ts` with users table
- Drizzle Kit for migrations (`drizzle.config.ts`)
- `connect-pg-simple` for session storage

### UI Libraries
- **Radix UI** primitives for accessible components
- **Tailwind CSS** with custom theme configuration
- **Lucide React** for icons
- **Embla Carousel** for carousel components
- **Vaul** for drawer components
- **cmdk** for command palette

### Utilities
- **Zod** for schema validation with `drizzle-zod` integration
- **date-fns** for date formatting
- **class-variance-authority** for component variants
- **React Hook Form** with Zod resolver for form handling