# Making Money - Educational Game Series

## Overview

"Making Money" is an educational game series exploring the fundamental question: **"What is Money?"** — where it comes from, why we need it, what makes good money vs bad money. The first lesson, "The Barter System," is a side-scrolling game set in an ancient village where players experience a world with no money and discover how and why it came to exist. Players resolve disputes over promises, leading to the creation of a "Stone Tablet" ledger system. Optimized for touch-only input on iPad/tablet devices, targeting a broad audience interested in interactive learning.

## Long-Term Vision

- **Multi-chapter structure**: Each lesson covers a different aspect of money's evolution (barter, ledgers, coins, banking, etc.)
- **Face-capture photo booth**: Future feature where players photograph their own face with different expressions (neutral, sad, happy, silly) at game start. These faces are superimposed onto the player character and react based on game events. Plan: build directly into this app using browser Camera API, store locally as canvas data/base64.
- **Pre/post reflection**: Players answer "What is money to you?" before playing, then review their answer after completing the lesson.

## User Preferences

- Preferred communication style: Simple, everyday language.
- No interpretation of changes beyond explicit requests — ask before making decisions.
- Keyword highlighting: only "double coincidence of wants" and "ledger" (not debt/debts).

## System Architecture

### Frontend
- **React SPA** with TypeScript using Vite.
- **Wouter** for routing.
- **TanStack Query** for server state management.
- **Shadcn/UI** component library, based on Radix primitives and Tailwind CSS.
- **HTML5 Canvas** powers the custom game engine.

### Game Engine
A custom JavaScript game engine provides a 60fps experience with a click-to-walk input system.
- **Interaction Mechanics**: Player movement, tight interaction ranges for NPCs and objects.
- **UI Elements**: "Stone Tablet" HUD for tracking debts, dialogue system with typewriter effect, "INTERACT" button with fade transitions, color-coded multiple-choice dialogue.
- **World & NPCs**: A 3800px wide world with distinct locations and NPCs with defined movement patterns and central interaction points.
- **Character Sprites**: Generated 2D pixel-art sprites for Player, Stone Worker, Fisherman, Village Elder, and Woodcutter. Sprites loaded with chroma key green background removal (samples corner pixel, Euclidean distance tolerance=80, 30-unit anti-alias band). Stored in `client/public/sprites/`. Most characters normalized to 100x140 dimensions; Stone Worker is 10% larger (110x154). Walking animation uses squash/stretch cycle with directional mirroring (facingDirection property). Draw coordinates rounded to whole pixels to prevent sub-pixel flickering. No name labels above sprites. Player feet at feetY = groundY + 20 + 15px down. NPC feet at feetY = groundY + 20 + 12px down.
- **Game Progression (Two-Loop System)**:
    - **Loop 1 (Failure Path)**: Focuses on verbal promises and their failure, leading to disputes and consequences of unrecorded agreements.
    - **Loop 2 (Success Path)**: Introduces the Stone Tablet for recording debts, with choices between verbal promises and recording. Explores "NPC-First" and "Elder-First" settlement approaches and includes escort mechanics for debt recording.
- **Core Mechanics**:
    - **Item Gifting on Credit**: Encourages understanding of social contracts.
    - **Brawl Trigger System**: Conditional triggers based on game state.
    - **Celebration/Failure Animations**: Visual feedback for game outcomes.
    - **Home/Roof Repair**: A mini-task for tangible progress.
    - **Stone Tablet Direct Interaction**: Allows players to verify records independently.
    - **"Give-In" Failure Path**: Introduces mechanics where agreeing to inflated demands leads to complications.
    - **Mood System**: playerMood state tracks neutral/happy/angry. Face image rendering removed (placeholder for future face-capture feature). Mood logic preserved.
    - **Environmental Transitions**: Night transitions, thunderstorms, parallax backgrounds, and night background crossfade (8-second transition triggered when debts settled in Loop 2).
    - **Double Coincidence of Wants**: Dialogue system demonstrates the economic problem of bartering challenges, rejecting player offers until credit is established.
    - **Badge System**: Awards celebratory popups with badges for learning key concepts like "Double Coincidence of Wants" and "Ledger Master."
    - **Audio System**: Utilizes Web Audio API with `AudioContext` for dynamic soundscapes, including pitch-varied footsteps, layered brawl audio, and dynamic background music transitions. Audio preloaded during intro screen via `preloadAudio()` for instant playback on game start. `resumeContext()` called on user gesture for iOS/Safari compatibility.

### Visual Style
- Background environments are **painted/illustrated style** (not pixel-art retro). Proportions may be revised in future.
- Character sprites are pixel-art style.
- Earth tones, natural materials, monospace fonts for dialogue ("Press Start 2P"), bold sans-serif for UI.
- Responsive canvas design for various tablet aspect ratios.

### Backend
- **Express.js** server with TypeScript for API routes and static asset serving.
- In-memory storage with an interface for future database integration.

### Build System
- **Vite** for frontend bundling, **esbuild** for server-side TypeScript.
- Custom build script for optimized dependencies.

## Key Technical Notes

- Berry bush: player stops at bushX - 30px to stand beside it, not on top (reduced from 60px).
- Failure/boo timing: Failure sound plays 0.25s before fail screen (at brawlTimer=3.75s), boo plays 2s after failure sound starts.
- Sound system: loads 35 sounds, mute/unmute via localStorage key `villageLedger_soundSettings`.
- Stone Tablet: graphic removed but interaction area preserved, popup shows on arrival or direct click.
- Celebration timing: applauseDuration = fullDuration - 12 seconds (min 2s).
- Game title displayed as "THE BARTER SYSTEM" in-game UI, series title "MAKING MONEY" on intro screen. Start button text is "Start".
- Hut overlay drawn at 1.5x scale (hutScale=1.5), anchored relative to playerHomeX position on walking path layer, offset -50px left and +50px down. No "Home" label.
- Character positions: Player at x=170 (+20px right, +15px down from feet), woodcutter at x=835 (120x168, 20% larger), fisherman at x=3025, stone worker at x=2150, berry bush at x=2550.
- Character spacing: Auto-walk targets include 40px offset based on approach direction to prevent overlap during interactions.
- Walking direction fix: Woodcutter and stone worker sprites naturally face opposite direction - fixed with sprite flip in rendering (facing = -facing for these IDs only).
- NPC facing: All NPCs (except fisherman, berry bush, and village elder) face toward the player when idle. Village elder orientation is inverted. Fisherman faces AWAY from player by default (back turned); turns to face player only during active dialogue interaction when player is nearby.
- Village elder behavior: During brawl, elder walks backwards (facing the fight/player, inverted orientation) while moving away to targetX.
- Hint pulse system: When player attempts premature interactions in Loop 2 (e.g., settling debts before recording on Stone Tablet), hint box text pulses with golden highlight for 1.5 seconds.
- Stream sound trigger: Starts fading in at berryBush.x - 400, full volume at fisherman position, symmetric fade when moving away.
- Shadows: Positioned at groundY+15 (moved 10px down from original +5), not affected by character offset.
- Sprite backgrounds: Blue (#0000FF) instead of green for chroma key — prevents earth-tone outfit colors from being removed.
- Foreground dust particles: 195 particles (50% increase from 130), allowed to overlap up to 150px above hint box top. All 3 dust layers transition from golden (255,223,150) to blue/grey (140,160,200) during night crossfade.
- Dialogue language: "Village Center" / "Town Center" replaced with "the Great Stone" throughout. "Village in chaos" failure message changed to "Settlement in chaos". All "village" references in dialogue changed to "settlement".
- Fail screen: Red overlay removed, only bordered card box remains.
- Intro screen: Title "MAKING MONEY", lesson label, and Start button. Features falling "money rain" animation — pixel-art icons of historical money forms (shells, beads, gold bars, coins, rai stone, cattle, salt, tea bricks, feathers, cocoa beans) slowly drift down with gentle sway and periodic sparkle effects. Canvas-based animation behind the title UI. Background music (money_song_1.mp3) plays immediately on title screen display, loops continuously, and stops when Start is pressed. Falls back to playing on first user interaction if autoplay is blocked by the browser.
- Money rain icons: 20 transparent PNG icons covering money evolution — ancient (shells, beads, cattle, chicken, fish, salt, tea bricks, feathers, cocoa beans, rai stone, gold bars, coins) and modern (banknotes, credit cards, modern coins, silver coins, Bitcoin, yen, yuan, euro). Blue backgrounds removed via scripts/process-money-icons.cjs. White edge artifacts trimmed before background removal. Cattle icons always rendered at maximum size (72px). All icons appear at equal frequency. A single 4-character-wide green binary matrix strip streams vertically down the screen on the left or right edge, layered behind all icons.
- Interact button: Hidden (drawInteractButton returns early). Code preserved for future re-enabling.
- Inventory icons: Pixel-art item icons loaded from /sprites/item-{name}.png (slingshot, wood, stone, fish, berries) replace colored circle placeholders in inventory HUD. Falls back to colored circles if images haven't loaded.
- Lightning flash: Two lightning images (lightning-flash-1.jpg, lightning-flash-2.jpg) flashed back-to-back at 1/12s each (~83ms per frame) during thunderstorm and rainfall animations. Images drawn at 85% opacity on top of background only (clipped to bgHeight), behind all other layers (characters, trees, UI, dialogue box).
- Loop 2 player start: x=190, facingDirection=1 (faces right). Loop 1 player start: x=185.
- Settlement positioning: Woodcutter targetX = villageCenterX + 160, Stone Worker targetX = villageCenterX - 160, Village Elder targetX = villageCenterX - 45 (closer to Stone Ledger, +15px right from original -60). Spread apart to prevent overlap during both first and second debt settlements.
- Carving trigger distance: Player needs to be within 350px of villageCenterX for carving sequence to trigger.
- NPC overlap: Characters can now pass through each other smoothly without popping/flashing. Removed enforceNPCSpacing visual offset system (kept tablet exclusion only).
- Sprite cleanup: Bottom 3% of sprite images scanned for white/light artifacts and removed during chroma key processing.
- Night layer crossfade: Walking path, berry bush, hut (all 3 states), close trees, and far trees all crossfade to night versions alongside the background during the 8-second night transition. Night assets stored as *-night.png in client/public/. Moon/overlay removed after roof is fixed (only during pre-roof storm phase). Storm clouds removed from all animations (only darkening overlay and rain remain).
- Fight audio: Always play fightCrash, fightMartialArts, fightCat; randomly play fightIntro or fightYell; never play fightCartoon.
- Thunder: Loops continuously from debt settlement until rain graphics end, then stops.
- Dialogue portraits: Character sprite thumbnails rendered in dialogue box instead of colored squares. Uses processedSprites (chroma-keyed) for player, woodcutter, stone-worker, fisherman, village-elder. Stone Tablet gets a drawn tablet icon. Portraits drawn from top of icon box (drawY = portraitY + 2) to show faces clearly without clipping. Character images enlarged 30% beyond icon box (scale multiplier 1.69x).
- Elder positioning: Starting position x=1470 (10px further from tablet than original 1480). During brawl, elder backs away to villageCenterX-200. During confrontation, elder moves to villageCenterX-45.
- NPC settlement behavior: When player chooses "Let's check the Stone Tablet together!", NPCs walk toward the tablet (woodcutter to villageCenterX+80, stone worker to villageCenterX-80) then spread out after reading.
- Ledger entry updates: Entry name field is 'PLAYER'; settlement/verification updates match on debt field (e.debt.includes('WOODCUTTER') or e.debt.includes('STONE-WORKER')), not name field.
- Character positions: Player at x=185 (+35px right, +15px down from feet), woodcutter at x=835 (120x168, 20% larger, bottom 10px trimmed), fisherman at x=3025 (115x161, 15% larger), stone worker at x=2150, berry bush at x=2550.
- Inventory detail popup: Uses item icons (item-{name}.png) instead of colored circles. Falls back to circles if icons not loaded.
- Player facing: After final debt settlement, player automatically faces the village elder during celebration dialogue.

## External Dependencies

- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: `connect-pg-simple`.
- **UI Components**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, Vaul, cmdk.
- **Utilities**: Zod, date-fns, class-variance-authority, React Hook Form with Zod resolver.
