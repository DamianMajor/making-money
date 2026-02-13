# Making Money - Educational Game Series

## Overview

"Making Money" is an educational game series designed to explore the fundamental question: "What is Money?" and its origins, necessity, and qualities. The initial lesson, "The Barter System," is a side-scrolling game set in an ancient village. Players experience a world without money, confronting disputes over promises that lead to the creation of a "Stone Tablet" ledger system. The game is optimized for touch-only input on iPad/tablet devices, aiming for a broad audience interested in interactive learning about economic concepts. The long-term vision includes a multi-chapter structure covering various aspects of money's evolution, a face-capture photo booth feature for character customization, and pre/post reflection exercises to deepen player understanding.

## User Preferences

- Preferred communication style: Simple, everyday language.
- No interpretation of changes beyond explicit requests — ask before making decisions.
- Keyword highlighting: only "double coincidence of wants" and "ledger" (not debt/debts).

## System Architecture

### Frontend
- **Technology Stack**: React SPA with TypeScript using Vite, Wouter for routing, TanStack Query for server state management.
- **UI Framework**: Shadcn/UI component library, built on Radix primitives and Tailwind CSS.
- **Game Engine**: Custom HTML5 Canvas-based JavaScript game engine providing a 60fps experience with click-to-walk input.
- **Interaction Mechanics**: Player movement, tight interaction ranges for NPCs and objects, "Stone Tablet" HUD for debt tracking, dialogue system with typewriter effect and multiple-choice options, "INTERACT" button.
- **World & NPCs**: A 3800px wide world with distinct locations and NPCs possessing defined movement patterns and interaction points.
- **Character Sprites**: 2D pixel-art sprites for main characters, loaded with chroma key background removal. Walking animations include squash/stretch cycles and directional mirroring.
- **Game Progression**: Features a two-loop system (Failure Path exploring verbal promises and a Success Path introducing the Stone Tablet for recording debts), including "NPC-First" and "Elder-First" settlement approaches and escort mechanics.
- **Core Mechanics**: Item gifting on credit, brawl trigger system, celebration/failure animations, home/roof repair mini-task, direct Stone Tablet interaction, "Give-In" failure path, mood system (neutral/happy/angry), environmental transitions (night, thunderstorms, parallax backgrounds), "Double Coincidence of Wants" demonstration, and a badge system for learning concepts.
- **Badge System**: 6 collectible badges (Double Coincidence of Wants, Debt, The Ledger, Debt Settled, Money Scholar, Music Scholar) with persistent tray HUD (X/6 progress), tap-to-expand panel (2 rows of 3), golden glow animation on earn, circular sparkle popup (no rectangular glow), and badge-centric success screen with "Your Journey" reflection comparison. All 5 core badges are earnable on both the normal path and the smart path in a single playthrough. Music Scholar requires collecting all 11 genres across multiple playthroughs.
  - DCW badge: Awarded at fisherman berry-for-fish trade (player discovers the match via trade selection)
  - Debt badge: Awarded on first debt taken (verbal promise in Loop 1 OR smart path woodcutter credit)
  - The Ledger: Awarded at second Stone Tablet carving (both paths)
  - Debt Settled: Awarded when all debts paid off (both paths)
  - Money Scholar: Awarded after final quiz (both paths)
  - Music Scholar: Awarded when all 11 genre records are collected (checked on every record unlock)
- **Smart Path**: After DCW explanation, players can decline verbal credit and suggest a recording system via text input. Keyword matching (write/record/ledger/tablet/etc) skips Loop 1 failure and jumps directly to Loop 2 success path with elder introducing stone tablet.
- **Quiz System**: Two distinct quiz types: (1) DJ Quiz - 1-2 questions during party (DCW/Debt topics on first play, Ledger+mixed on repeat) with hint-on-wrong, retry, second-chance backup question, and storm failure on double-fail; gates song genre choice. (2) Final Quiz - 5 shuffled review questions (1 DCW + 1 debt + 2 ledger + 1 extra credit bonus) after hut/storm sequence, non-gated, leads directly to success screen. Questions sourced from centralized `quizBank.ts` (20 questions across 4 categories: dcw, debt, ledger, extra_credit). Plus distributed "Quick Check!" checkpoint pop-ups after brawl and first ledger recording.
- **Slingshot Balloon-Pop Mini-Game**: During disco party celebration, a "Test Your Aim" platform appears in world-space. Player walks to platform to activate the slingshot. Angry Birds-style pull-and-release mechanic with arc physics (gravity 400px/s²). Near-circular balloons float in world-space with bobbing motion. Chain-pop flood-fill for same-color clusters. Force threshold (speed < 150px/s bounces with bop sound). 8% ricochet chance on balloon hits (bounces off instead of popping; subsequent balloon hits have 50/50 pop odds). Collision detection for disco ball (25pts, plays DJ transition effects), NPCs (5pts, "Oops!"; elder plays record scratch), speakers (10pts), and DJ booth (10pts, plays record scratch) with dedicated hit sounds. Rubber band stretch sound while aiming, stretch release + random woosh on launch. Score target of 50 points earns "Party Champion" label on success screen. Score HUD visible during gameplay.
- **Party Flow**: Party song plays once through (no loop/fade). When song ends naturally, 35-second storm countdown starts with pulsing red warning (hidden after roof repair). Player must walk to hut before countdown expires. If countdown expires, storm failure triggers (rain sound + heavy rain visuals, hut floods, countdown restarts). Progressive storm atmosphere: thunder plays at 25/15/10/7/5/3 seconds remaining, screen shake intensifies in last 10 seconds, full-screen darkening overlay, rain drops increase, text pulses faster and grows larger (22-36px with red glow shadow). Party graphics (speakers, DJ booth, lights) fade out over 2 seconds after roof is repaired.
- **Fisherman Trade**: Fisherman expresses hunger and mentions having plenty of fish without hinting at berries. Player uses trade selection popup to discover berry-for-fish match themselves. DCW badge awarded at successful trade.
- **NPC Stone Tablet Reactions**: Woodcutter and stone-worker have follow-up dialogue after seeing their agreements carved into the Great Stone ("seeing it carved in stone makes it feel real").
- **DJ Booth**: 25% scaled up (120x75px), speakers 300% larger (180x156px cabinets) in world-space, disco ball with collision.
- **Badge Tray**: Positioned to the left of the inventory box (not top-right corner).
- **Audio System**: Web Audio API with `AudioContext` for dynamic soundscapes, including pitch-varied footsteps, layered brawl audio, and dynamic background music. Audio preloading and `resumeContext()` for compatibility.
- **Visual Style**: Painted/illustrated backgrounds, pixel-art character sprites, earth tones, natural materials, and monospace fonts for dialogue ("Press Start 2P") with bold sans-serif for UI. Responsive canvas design for tablet aspect ratios.
- **Music Strategy**: Reflection screen plays standard background music (backgroundmusic-day.mp3) instead of money song. Party song (money-yell-open.mp3) loads with SoundManager on first interaction, maximizing impact during celebration.
- **Song Choice Mechanic**: After passing DJ Quiz during party, player picks from 11 celebration genres (Classic Hip-Hop, Rock, K-Pop, Reggae, Yacht Rock, 80's Hairband, Trap, Pop, 80's Funk, Disco, Funk) displayed as a 2-column color-coded button grid. Each genre has its own dedicated remix audio file, lazy-loaded on selection to minimize memory usage. Mid-party song change allowed once via DJ Elder interaction. Record scratch placeholder sound on song transitions. Seamless auto-advancing DJ transitions with 2.5s minimum wait + audio preload check, with 8s timeout fallback to prevent deadlocks.
- **Music Collection HUD**: Vinyl record icon on HUD positioned next to badge tray icon (visible after first genre unlock) showing X/11 progress with circular golden glow on new unlock. Tap to expand collection panel with all 11 genres (unlocked highlighted, locked grayed out), "Standard" background music option, "No Background Music" mute option, and NOW PLAYING indicator. Unlocked genres persist across sessions via localStorage (`makingMoney_unlockedGenres`). Players can switch background music to any unlocked genre during gameplay. Music collection panel disabled during party to prevent interference. Temporary "Reset Records" button on loading screen for testing.
- **3-Songs-Per-Game Reward System**: DJ quiz choice (1) + mid-party change (1) + random completion bonus (1) = 3 possible genre unlocks per game. First playthrough: Funk record unlocked 5s after party start. Repeat playthroughs: random uncollected genre unlocked 5s after party start (based on play history). Record reward popups require tap to dismiss (no auto-dismiss). Denial of second song change includes follow-up encouraging replay.
- **Progressive Difficulty**: Playthrough count tracked via `makingMoney_completionCount` in localStorage. First play: DJ quiz uses DCW+Debt questions, final quiz excludes private/shared ledger questions (ids 8,9,10). Second+ play: DJ quiz uses Ledger+mixed questions, final quiz includes all ledger questions including private/shared topics.
- **Berry Bush Eating**: Pick 3 berries, choice to eat 2 (leaves 1 - insufficient for fisherman trade), one restock visit allowed (+3 berries), bush empties after restock. Eat choice appears both on initial pick and after restock.
- **Laser Projectors**: World-space fixed positions with light fixture bases, beams sweep from village-relative coordinates.
- **Confetti**: World-relative particles spanning full worldWidth, scrolling naturally with camera.
- **Player Name Input**: After reflection screen, players enter their name (max 15 characters, optional skip). Name stored in localStorage (`makingMoney_playerName`). Player name replaces "YOU" in dialogue speaker labels and "PLAYER" in Stone Tablet ledger entries throughout gameplay.
- **Disco Avatar**: Players who earn the Music Scholar badge (all 11 records collected) unlock a disco outfit character sprite (`player-disco.png`). Toggle available in Music Collection panel. Pure cosmetic swap — same dimensions, animations, hitbox. Choice persisted in localStorage (`makingMoney_useDiscoSprite`).
- **End-of-Game Reflection**: After final quiz, if player provided an initial "What is Money?" answer, a React overlay shows their original answer and asks "Would you change your answer?" New answer saved to localStorage (`makingMoney_postReflection`) and displayed alongside original on success screen in the "YOUR JOURNEY" section.
- **Screen Flow**: Loading → Reflection → Name Input → Intro → Game, with phased loading and asset optimization (compressed sprites, background PNGs, and audio files).
- **Reset Records Button**: On loading screen, clears `makingMoney_unlockedGenres`, `makingMoney_completionCount`, `makingMoney_playerName`, `makingMoney_useDiscoSprite`, and `makingMoney_postReflection` from localStorage.

### Backend
- **Server**: Express.js with TypeScript for API routes and static asset serving.
- **Data Storage**: In-memory storage with an interface for future database integration.

### Build System
- **Bundling**: Vite for frontend, esbuild for server-side TypeScript.
- **Optimization**: Custom build script for optimized dependencies.

## External Dependencies

- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: `connect-pg-simple`.
- **UI Components**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, Vaul, cmdk.
- **Utilities**: Zod, date-fns, class-variance-authority, React Hook Form with Zod resolver.