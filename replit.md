# Village Ledger Educational Game

## Overview

Village Ledger is an educational side-scrolling game designed to teach concepts of record-keeping and trust within a narrative-driven experience. Set in an ancient village, players interact with NPCs to resolve a dispute over a promise, leading to the creation and adoption of a "Stone Tablet" ledger system. The game aims to provide a unique learning experience through engaging gameplay, emphasizing the importance of verifiable records. It is optimized for touch-only input on iPad/tablet devices, targeting a broad audience interested in interactive learning.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **React SPA** with TypeScript using Vite for building.
- **Wouter** for client-side routing.
- **TanStack Query** for server state management.
- **Shadcn/UI** component library, based on Radix primitives and styled with Tailwind CSS.
- **HTML5 Canvas** powers the game engine.

### Game Engine
A custom JavaScript game engine provides a 60fps experience with a click-to-walk input system. Key features include:
- **Interaction Mechanics**: Player movement at 200 units/second, with tight 25-unit interaction ranges for NPCs and objects.
- **UI Elements**: A "Stone Tablet" HUD tracks debts, a dialogue system features a typewriter effect, and an "INTERACT" button with fade transitions. Multiple-choice dialogue options are color-coded.
- **World & NPCs**: A 3500px wide world includes distinct locations (Player Home, Woodcutter, Stone-worker, Berry Bush, Village Elder, Fisherman). NPCs (Woodcutter, Stone-worker, Fisherman, Village Elder) have defined movement patterns, with some moving to a central village area for interaction.
- **Game Progression (Two-Loop System)**:
    - **Loop 1 (Failure Path)**: Focuses on verbal promises and their failure, leading to disputes and a "brawl" animation scenario. Players experience the consequences of unrecorded agreements.
    - **Loop 2 (Success Path)**: Introduces the Stone Tablet, allowing players to record debts. NPCs offer choices between verbal promises and recording. This loop explores both "NPC-First" and "Elder-First" settlement approaches, leading to different outcomes based on record-keeping. Escort mechanics ensure debts are recorded at the Stone Tablet.
- **Core Mechanics**:
    - **Item Gifting on Credit**: Encourages social contract understanding rather than task-based earning.
    - **Brawl Trigger System**: Conditional triggers based on game state, inventory, and player location.
    - **Celebration/Failure Animations**: Visual feedback for game outcomes (confetti, musical notes for success; dust clouds, text for brawl).
    - **Home/Roof Repair**: A mini-task consuming wood, adding a tangible element of progress.
    - **Stone Tablet Direct Interaction**: Allows players to verify records independently, emphasizing trustless verification.
    - **"Give-In" Failure Path**: Introduces mechanics where agreeing to inflated demands leads to further complications, reinforcing the game's lessons.
    - **Mood System**: Visual "happy face" feedback for positive actions.
    - **Environmental Transitions**: Night transitions, thunderstorms, and parallax backgrounds enhance immersion.

### Backend
- **Express.js** server with TypeScript for API routes and static asset serving.
- In-memory storage, designed with an interface for future database integration.
- Vite dev server integration for hot module replacement.

### Build System
- **Vite** for frontend bundling, **esbuild** for server-side TypeScript.
- Custom build script (`script/build.ts`) optimizes dependencies for faster cold starts.

### Design System
- Retro educational game aesthetic (Oregon Trail, Carmen Sandiego inspired).
- Earth tones, natural materials, monospace fonts for dialogue, and bold sans-serif for UI.
- Responsive canvas design for various tablet aspect ratios.

## Recent Changes (January 2026)

- **Clickable Stone Tablet HUD**: Tapping the Stone Tablet box in the HUD opens a 620px wide centered popup showing either elder wisdom (Loop 1) or ledger entries (Loop 2)
- **NPC Click Detection Fix**: Click detection now prioritizes the NPC whose center is closest to your tap point (not closest to the player), making it easier to select overlapping NPCs
- **NPC Spacing Overhaul (Settlement)**: Woodcutter at +80 (right), Stone-worker at -100 (left of tablet) from village center for easy individual selection
- **Return Home Sequence**: After Elder celebrates all debts settled, player returns home → fixes roof if needed → enters hut (disappears) → 2.5s dark clouds rolling animation with "THE STORM APPROACHES..." text → night transition → quiz
- **Elder Celebration**: checkAllDebtsSettled() now triggers showCelebration immediately when both debts are paid, with Elder thanking the Stone Tablet system
- **Settlement Logic Fix**: NPCs now accept fair fish amounts after Elder verification alone (elderVerified flag), without requiring the debt to be recorded first. Dialogue adapts based on whether the Tablet or Elder confirmed the amount.
- **Z-Order Fix**: Player passes behind fisherman sprite when in fishing area (x: 3100-3250)
- **Position Adjustments**: Berry Bush moved to x=2050, Stone-worker starting position moved to x=2550
- **Inventory Icon Centering**: Icons offset +4px down and right to center in inventory box
- **Loop 1 Stone Worker Fix**: Auto-transitions to settlement phase when stone worker is at village center in got_fish_ready_settle phase
- **NPC Spacing**: Increased from 60 to 80 pixels at village center for better interaction selection
- **Inventory HUD**: All 4 items (Wood, Stone, Fish, Berries) now visible from game start; HUD aligned at y=24 with Stone Tablet box
- **NPC Movement Fix**: Added `isWalking` state tracking with immediate `bobOffset` reset on arrival, preventing stuck bouncing animation
- **NPC Collision Fix**: Uses `renderOffsetX` visual offset only (reset each tick), doesn't modify actual npc.x to prevent pushing
- **NPC Spacing Overhaul**: Woodcutter targets +120, Stone-worker targets +180/+220 from village center to prevent overlap with Elder; Fisherman at x=3175
- **Stone Tablet Loop 1**: Displays elder wisdom text ("A promise remembered only by one...") instead of NAME/DEBT columns until Loop 2
- **Stone Tablet HUD Height**: Increased to 185px to accommodate wisdom text without overflow
- **Loop 2 Hint Text**: Changed from "Go to the Elder" to "Go to the Stone Tablet" for verification phase
- **Give-In Brawl Trigger**: Added confession dialogue and brawl trigger when player returns to NPC without fish after settling first inflated debt (works for both Woodcutter-first and Stone-worker-first paths)
- **Settlement Fix**: Marks woodcutterSettled/stoneWorkerSettled IMMEDIATELY when payment made (not in onComplete) to prevent re-trigger bugs
- **Choice Color Coding**: Procurement phase (green=record, red=promise), Settlement phase (green=consult tablet, red=give-in)
- **Gaslight Failure Path**: `resourcesDepleted` flag properly set when paying inflated demands, making second debt impossible to pay
- **Interaction Priority**: NPCs checked before Stone Tablet in getTappedInteractable() to prevent overlap issues
- **Runtime Error Prevention**: Try-catch blocks and guards around timeout chains in home interaction
- **Loop 2 Return Hint**: Changed to "Return home to fix your roof before the storm!" after both debts settled
- **Auto-trigger Elder Celebration**: Elder walks toward player (targetX = player.x + 50) when both debts settled, triggers celebration without manual interaction
- **Woodcutter Settlement Fix**: Now correctly checks for and deducts BOTH 1 Stone + 1 Fish (was only taking fish)
- **Post-Settlement NPC Dialogue**: Both woodcutter and stone-worker remind player to fix roof when both debts settled
- **Stone Tablet Ledger Updates**: All entries show "SETTLED" when debts are paid (replaces OWED/VERIFIED)
- **Stone Tablet Popup Width**: Loop 2 expanded to 720px for full text visibility; Loop 1 remains 620px
- **Loop 1 Wisdom Text Size**: Increased from 16px to 20px with 34px line spacing for better readability
- **Stone Tablet Speaker Portrait**: Shows tablet icon with text lines instead of NPC face when speaker is "STONE TABLET"
- **3-Second Storm Buffer**: Added delay after roof fix before storm clouds animation begins

## External Dependencies

- **Database**: PostgreSQL with Drizzle ORM for database operations and migrations.
- **Session Management**: `connect-pg-simple` for session storage.
- **UI Components**: Radix UI (primitives), Tailwind CSS, Lucide React (icons), Embla Carousel, Vaul (drawers), cmdk (command palette).
- **Utilities**: Zod (schema validation), date-fns (date formatting), class-variance-authority, React Hook Form with Zod resolver.