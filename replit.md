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
- **Auto-trigger Elder Celebration**: Elder walks toward player (targetX = player.x + 50) when both debts settled; dialogue triggers automatically when Elder arrives at player position (uses elderWalkingToCelebrate flag)
- **Woodcutter Settlement Fix**: Now correctly checks for and deducts BOTH 1 Stone + 1 Fish (was only taking fish)
- **Post-Settlement NPC Dialogue**: Both woodcutter and stone-worker remind player to fix roof when both debts settled
- **Stone Tablet Ledger Updates**: All entries show "SETTLED" when debts are paid (replaces OWED/VERIFIED)
- **Stone Tablet Popup Width**: Loop 2 expanded to 720px for full text visibility; Loop 1 remains 620px
- **Loop 1 Wisdom Text Size**: Increased from 16px to 20px with 34px line spacing for better readability
- **Stone Tablet Speaker Portrait**: Shows tablet icon with text lines instead of NPC face when speaker is "STONE TABLET"
- **2-Second Storm Buffer**: Reduced delay after roof fix before storm clouds animation begins
- **Center Cloud Animation**: Added center clouds that slowly fade in over 3 seconds during storm
- **Rainfall Animation**: New 3-second rainfall phase between clouds and night transition
- **Storm Sequence**: clouds 2.5s → rainfall 3s → night fade 3s → quiz
- **Quiz Wrong Answer Feedback**: Shows explanations for wrong answers with pagination, correct answers highlighted, retry button
- **Stone Tablet Columns**: 25/75 split with 780px popup width and 15px font for debt column to fit long text
- **Rainfall During Night Transition**: Rain continues and fades out during night transition for smooth blend
- **Quiz Review Screen**: After correct quiz answers, shows paginated review of all questions with educational note about money as debt tracking
- **Darker Green**: Changed correct answer highlighting from #22C55E to #166534 for better readability on light backgrounds
- **Web Audio API Sound System**: Complete SoundManager rewrite using AudioContext, AudioBuffer, and GainNode for advanced audio manipulation
- **Pitch-Varied Footsteps**: Alternating pitch (1.0 and 0.95) for natural walking sound variation
- **Layered Brawl Audio**: playBrawlWithLayers() plays main brawl sound + 2-3 randomly selected fight layer sounds (fightcartoon, fight-cat, fightcrash, fightintro, fightmartialarts, fightyell) staggered over 4 seconds
- **Dynamic Background Music**: backgroundMusicDay loops during daytime, fades out at storm, backgroundMusicNight fades in at night transition and loops until game restart
- **Crowd Applause**: Plays alongside quiz-correct sound when player achieves 100% quiz score
- **Improved Audio Button**: Resized to match inventory panel height (square button) for visual consistency
- **Clickable Inventory Popup**: Tapping inventory HUD opens enlarged popup showing all 4 items (Wood, Stone, Fish, Berries) with colored icons, counts, and descriptions; tap anywhere outside to close
- **Talking Bounce Animation**: Characters now bounce subtly (2.5px sine wave, ~3 cycles/sec) when they are the current speaker in dialogue, only while text is being typed (stops when typewriter completes)
- **Clickable In-World Stone Tablet**: Tapping the Stone Tablet sprite in the game world opens the expanded popup view (same as tapping HUD), triggering any game interactions as well
- **Dialogue-Aware Tablet Popup**: When dialogue is active, the tablet popup is smaller (350px height) and positioned higher to leave room for the dialogue box; overlay is lighter (55% opacity)
- **Horizontal Choice Boxes**: Choice buttons now display horizontally within the dialogue box area, fitting multiple options side-by-side without popup overlay
- **Double Coincidence of Wants Dialogue**: Woodcutter and Stone-worker interactions now demonstrate the economic problem - player needs wood/stone but can't offer what NPCs want (fish), teaching the concept of bartering challenges
- **Sound Guard Flags**: Added woodReceiveSoundPlayed and stoneReceiveSoundPlayed flags to prevent triple sound playback when receiving items in Loop 2
- **Boo/Failure Timing**: Adjusted to overlap fight ending by 2 seconds (triggers at 2s instead of 3s)
- **Fisherman Dialogue Simplified**: Now states "I want some berries! I'll trade 1 fish for each berry" for clearer trading mechanics
- **Storm Text Updated**: Changed from "THE STORM APPROACHES..." to "A storm approaches..." with 5-second fade-out spanning clouds and rainfall animations
- **Post-Fishing Hint Text**: Changed from "Debts verified!" to appropriate guidance messages directing player to Stone Tablet or NPCs
- **Post-Verification Hint Text**: After Stone Tablet verification, now directs player to "Settle your debts with the Woodcutter and Stone-worker..."

## External Dependencies

- **Database**: PostgreSQL with Drizzle ORM for database operations and migrations.
- **Session Management**: `connect-pg-simple` for session storage.
- **UI Components**: Radix UI (primitives), Tailwind CSS, Lucide React (icons), Embla Carousel, Vaul (drawers), cmdk (command palette).
- **Utilities**: Zod (schema validation), date-fns (date formatting), class-variance-authority, React Hook Form with Zod resolver.