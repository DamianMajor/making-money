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
- **x=100** - Player Home (starting position, has hole in roof that can be fixed with wood)
- **x=700** - Woodcutter (FIRST NPC - needs Sharp Stone for broken axe)
- **x=1480** - Village Elder (separate from Stone Tablet, with spacing)
- **x=1600** - Stone Tablet / Village Center marker
- **x=2000** - Berry Bush (for foraging berries, gated until Fisherman gives fish)
- **x=2500** - Stone-worker (gives stone, owes fish) - has originalX for reset
- **x=3200** - Fisherman (trades berries for fish, has fishing pole and pond) - stays at fishing hole, no walking to center

### NPC Movement System
NPCs can walk toward a target position (targetX property):
- Woodcutter and Stone-worker have `originalX` to store their starting positions
- After giving items on credit, Woodcutter and Stone-worker set `targetX` to Village Center and walk there at 80 units/second
- Fisherman stays at his fishing hole (does NOT walk to center)
- This ensures NPCs are gathered at town center when player returns with fish
- On game reset or Loop 2 start, NPCs return to original positions

### Fisherman Gating
- Fisherman only trades berries for fish AFTER player has initiated debts (has wood AND stone)
- Before debts initiated: "I'm still fishing... haven't caught anything yet!"
- This prevents players from getting fish early and bypassing the intended game flow

### Brawl Trigger System (Credit-First)
Loop 1 brawl trigger uses requirement-based checking:
- **phase === 'got_fish_ready_settle'** (verbal promise path after trading with Fisherman)
- **inventory.stone >= 1** (player has stone to give Woodcutter)
- **inventory.fish >= 3** (player has 3 fish from Fisherman trade: 1 for Woodcutter + 2 for Stone-worker)
- **player.x within 200px of Village Center (x=1600)**

Loop 2 settlement is handled by the Village Elder at the Stone Tablet:
- **Both debts recorded** → Elder settles all debts peacefully → celebration animation → quiz → success
- **Some debts recorded** → Elder settles recorded debts, unrecorded debts cause dispute → brawl
- **No debts recorded** → Full confrontation/brawl like Loop 1

### Celebration Animation
When Elder successfully settles all recorded debts, a 3-second celebration plays:
- Confetti particles in 5 colors (gold, red, teal, purple, green) falling across screen
- Musical notes (♪ ♫) bouncing above NPCs at Village Center
- "DEBTS SETTLED!" text pulsing in green with black outline at top of screen

### Home/Roof Repair System
- Player's hut starts with a visible dark hole in the roof
- After obtaining wood, player can interact with home to fix the roof
- Fixing roof: consumes wood, shows patched roof graphic, triggers happy mood
- After repair, a reminder prompts player to settle outstanding debts (if any)

### NPC Interaction Range & Direct Tap
- NPC interaction range: 180 units (reduced for more precise targeting)
- Home interaction range: 120 units
- Players can tap directly on NPCs, home hut, or berry bush to interact (within range)
- INTERACT button shows target name: "INTERACT (Woodcutter)", "INTERACT (Home)", etc.

### Happy Face Timer
- Happy mood (happy.png) triggers when receiving items, fixing roof, or settling debts
- Automatically returns to neutral after 3 seconds via moodTimer (extended from 2s)

### Night Transition Animation
When player completes Loop 2 successfully and returns home:
- Roof auto-repairs if not already fixed
- 4-second night transition plays:
  - Day-to-night fade (70% dark overlay)
  - Moon with glow and craters fades in
  - 30 twinkling stars appear
  - "A PEACEFUL NIGHT..." text
- Then quiz begins

### Brawl Animation
- Large dust cloud (size 220) covers player + all 3 NPCs
- POW/BAM/CRASH text cycling above
- Positioned 80px left of center to cover clustered NPCs
- Lasts 4 seconds before fail screen

### Background Parallax
- Background huts fade gradually as camera moves right (not sudden cutoff)
- Full opacity until 40% across world, then fades to 15% by 80%
- Makes fisherman area feel more remote/outside village

### Loop 1 Settlement Phase (Interaction-Based Confrontation)
The settlement phase requires player to interact with each NPC:
1. Player arrives at Village Center with items → auto-transition to `settlement` phase
2. NPCs move to Village Center (Woodcutter left, Stone-worker right)
3. Player taps Woodcutter → Woodcutter claims 3 Fish (inflated from 1) → player protests → `woodcutterDisputed = true`
4. Player taps Stone-worker → Stone-worker claims 4 Fish (inflated from 2) → player protests → `stoneworkerDisputed = true`
5. Player taps Elder → Elder tries to check Stone Tablet → finds no records → Woodcutter triggers brawl
6. Fail screen displays lesson about written records being essential

State tracking: `woodcutterDisputed` and `stoneworkerDisputed` flags
Dynamic hints guide player through each step of settlement

### NPC Movement System
NPCs can walk toward a target position (targetX property):
- Woodcutter and Stone-worker have `originalX` to store their starting positions
- After giving items on credit, Woodcutter and Stone-worker set `targetX` to Village Center and walk there at 80 units/second
- During settlement phase: NPCs move to flank player (Woodcutter to x-100, Stone-worker to x+100 after disputes)
- Fisherman stays at his fishing hole (does NOT walk to center)
- On game reset or Loop 2 start, NPCs return to original positions

### Two-Loop Game State System

**Loop 1 (Failure Path - Credit-First, Verbal Promises):**
NPCs give items immediately on credit with verbal promises. No escort to tablet.
1. `intro` → `need_wood` - Storm approaching, need wood from Woodcutter
2. `need_wood` → `got_wood_need_stone` - Woodcutter gives WOOD immediately, walks to village center
3. `got_wood_need_stone` → `got_stone_need_fish` - Stone-worker gives STONE immediately, walks to center
4. Player collects 3 berries from Berry Bush
5. `got_stone_need_fish` → `got_fish_ready_settle` - Fisherman TRADES 3 berries for 3 fish
6. `got_fish_ready_settle` → `settlement` - Player interacts with each NPC individually
7. `settlement` → `confrontation` → `brawl` → `fail` - Elder mediation fails, brawl triggered

**Loop 2 (Success Path - Escort-to-Tablet Recording):**
NPCs offer a choice: verbal promise OR walk to Stone Tablet together to record the debt.
1. `loop2_need_wood` - Player chooses: "verbal promise" or "record on Stone Tablet"
2. If "record": NPC escorts player to Village Center, records debt, THEN gives item
3. `loop2_escorting_woodcutter` / `loop2_escorting_stoneworker` - Escort phases
4. Partial recording supported - can record some debts but not others
5. Settlement outcomes based on what was recorded:
   - ALL debts recorded → Elder settles peacefully → quiz → success
   - SOME debts recorded → Elder settles recorded, unrecorded cause dispute → brawl
   - NO debts recorded → full confrontation/brawl like Loop 1
6. `loop2_return` → `complete_success` → Quiz tests understanding

### Loop 2 Escort Behavior
During Loop 2 escort phases, NPCs move directly toward the Village Center:
- NPC moves at 180 units/second toward its target position
- Woodcutter target: x=1550 (left of center)
- Stone-worker target: x=1650 (right of center)
- Auto-trigger fires when both player AND NPC are within 150 units of center
- Delivery dialogue queues, item given after dialogue advances

**Key Design Principles:**
- Items given on CREDIT (not earned through tasks) - creates trust-based social contract
- Berry Bush always interactable - prevents backtracking fatigue
- Conflict happens during Settlement Phase at Town Center - makes brawl a result of failed memory/gaslighting

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