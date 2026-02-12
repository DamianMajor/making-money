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
- **Badge System**: 6 collectible badges (Double Coincidence of Wants, Debt, No Trust No Trade, The Ledger, Debt Settled, Money Scholar) with persistent tray HUD (X/6 progress), tap-to-expand panel, golden glow animation on earn, sparkle popup, and badge-centric success screen.
- **Smart Path**: After DCW explanation, players can decline verbal credit and suggest a recording system via text input. Keyword matching (write/record/ledger/tablet/etc) skips Loop 1 failure and jumps directly to Loop 2 success path with elder introducing stone tablet.
- **Checkpoint Quizzes**: Distributed "Quick Check!" single-question pop-ups after brawl and first ledger recording, plus shortened 3-question final quiz. Fun labels and immediate feedback.
- **Slingshot Balloon-Pop Mini-Game**: During disco party celebration, a "Test Your Aim" platform appears in world-space. Player walks to platform to activate the slingshot. Angry Birds-style pull-and-release mechanic with arc physics (gravity 400px/s²). Near-circular balloons float in world-space with bobbing motion. Chain-pop flood-fill for same-color clusters. Force threshold (speed < 150px/s bounces with bop sound). Collision detection for disco ball (25pts), NPCs (5pts, "Oops!"), speakers (10pts), and DJ booth (10pts) with dedicated hit sounds. Rubber band stretch sound while aiming, stretch release + random woosh on launch.
- **Party Flow**: Party song plays once through (no loop/fade). When song ends naturally, 35-second storm countdown starts with pulsing red warning. Player must walk to hut before countdown expires. Auto-walk to hut on countdown expiry.
- **DJ Booth**: 25% scaled up (120x75px), speakers 300% larger (180x156px cabinets) in world-space, disco ball with collision.
- **Badge Tray**: Positioned to the left of the inventory box (not top-right corner).
- **Audio System**: Web Audio API with `AudioContext` for dynamic soundscapes, including pitch-varied footsteps, layered brawl audio, and dynamic background music. Audio preloading and `resumeContext()` for compatibility.
- **Visual Style**: Painted/illustrated backgrounds, pixel-art character sprites, earth tones, natural materials, and monospace fonts for dialogue ("Press Start 2P") with bold sans-serif for UI. Responsive canvas design for tablet aspect ratios.
- **Music Strategy**: Reflection screen plays standard background music (backgroundmusic-day.mp3) instead of money song. Party song (money-yell-open.mp3) loads with SoundManager on first interaction, maximizing impact during celebration.
- **Screen Flow**: Loading → Reflection → Intro → Game, with phased loading and asset optimization (compressed sprites, background PNGs, and audio files).

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