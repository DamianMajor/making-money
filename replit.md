# Making Money - Educational Game Series

## Overview

"Making Money" is an educational game series designed to explore the fundamental question: "What is Money?" through short, focused chapters. The educational arc follows Austrian economics principles (without explicitly naming them), guiding players from the basics of trade through to understanding the properties of sound money. Each chapter teaches one core concept through gameplay — the player learns by doing, not by being lectured.

The current implementation is **Chapter 1: "The Trade"** — a top-down neighborhood game where a kid tries to start a lemonade stand and needs lemons. Through visiting neighbors and attempting trades, the player discovers the concept of **Double Coincidence of Wants**.

## Chapter Framework (Planned)

1. **Chapter 1: "The Trade"** — Double Coincidence of Wants (IMPLEMENTED)
2. **Chapter 2: "The Chain"** — Indirect Exchange / Trade Chains
3. **Chapter 3: "The Notebook"** — Record-Keeping / The Ledger
4. **Chapter 4: "Everyone Likes Cookies"** — Emergence of a Medium of Exchange
5. **Chapter 5: "The Cookie Problem"** — Properties of Sound Money (durable, divisible, portable, fungible, scarce)
6. **Chapter 6: "The Best Money Wins"** — Convergence on Hard Money (optional/advanced)

## Design Principles

- **Fun first.** The game must be enjoyable. Educational content is taught through gameplay, never through lectures.
- **No fail states.** Every interaction moves the player forward. Failed trades are funny and informative, not punishing.
- **The character is frustrated, not the player.** The player should feel clever and in control.
- **Short chapters.** Each chapter is 5-10 minutes, teaching one concept well.
- **Modern, relatable setting.** Lemonade stand in a neighborhood — no "history lesson" feeling.
- **Colorful and simple** visual style — bright, cheerful, like a children's book.

## User Preferences

- Preferred communication style: Simple, everyday language.
- No interpretation of changes beyond explicit requests — ask before making decisions.
- Education should feel organic, not like a classroom.
- Fun and player agency are the top priorities.
- Austrian economics foundation without explicitly naming it.
- Not interested in teaching savings accounts or interest.

## System Architecture

### Frontend
- **Technology Stack**: React SPA with TypeScript (Vite), Wouter for routing, TanStack Query for server state.
- **UI Framework**: Shadcn/UI component library (Radix primitives, Tailwind CSS).
- **Game Engine**: Custom HTML5 Canvas-based engine (`lemonadeEngine.ts`) — 60fps, tap-to-interact, top-down neighborhood map.
- **Design Resolution**: 800x500, scaled to fit viewport with aspect ratio preservation.
- **Core Mechanics**: Tap-to-visit houses, dialogue system with typewriter effect, trading mechanic, trade board (notebook), quiz system, badge rewards.
- **Visual Style**: Bright, colorful canvas-drawn art. Green grass, cheerful houses with distinct colors, drifting clouds, decorative elements (trees, flowers, mailbox, fire hydrant). Simple character sprites with bobbing animation.
- **Orientation**: Supports both portrait and landscape. Canvas letterboxes with black bars to maintain 800x500 aspect ratio.
- **Screen Flow**: Title → Name Input → Intro (3 screens) → Map → Visiting (dialogue) → Hamster Mini-game → Celebration → Quiz → Badge → Complete.
- **Neighbor Visit Gating**: Player must visit both Mrs. Garcia and Mr. Thompson before the Twins will have lemons available. Early visit to Twins shows "mom's at the store" dialogue.
- **Hamster Mini-game**: Backyard scene where player taps Sir Squeaks 3 times to catch him. Hamster moves erratically with increasing speed. Triggered during Twins' successful trade.
- **Chapter 1 Neighbors**:
  - Mrs. Garcia (yellow house) — has lemons, wants flowers watered. Player can't help → funny rejection.
  - Mr. Thompson (blue-gray house) — wants leaf raking (player can do), but has no lemons → half-match demonstration.
  - Zoe & Max / The Twins (purple house) — has lemons, wants hamster caught. Player can help → MATCH! (gated behind visiting other two neighbors first)
- **Trade Board**: Notebook icon on map. Tap to open lined-paper overlay showing discovered neighbor has/wants/can-help info. Fills in as player explores.
- **Quiz**: 2 questions about Double Coincidence of Wants. Non-punitive — wrong answers get "Try again" with no penalty.
- **Badge**: "Double Coincidence of Wants" badge awarded after quiz.

### Backend
- **Server**: Express.js with TypeScript for API routes and static asset serving.
- **Data Storage**: In-memory storage with an interface for future database integration.

### Legacy Game (Preserved)
- The original "Barter System" side-scrolling village game files are preserved in `client/src/lib/gameEngine.ts` and `client/src/pages/Game.tsx` but are not currently routed to. They can be accessed by updating `App.tsx` routing.

### Build System
- **Bundling**: Vite for frontend, esbuild for server-side TypeScript.
- **Optimization**: Custom build script for optimized dependencies.

## Key Files

- `client/src/lib/lemonadeEngine.ts` — Main game engine (Chapter 1)
- `client/src/pages/LemonadeStand.tsx` — React wrapper for the game canvas
- `client/src/App.tsx` — Routing (currently points to LemonadeStand)
- `client/src/lib/gameEngine.ts` — Legacy village game engine (preserved)
- `client/src/pages/Game.tsx` — Legacy game wrapper (preserved)

## External Dependencies

- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: `connect-pg-simple`.
- **UI Components**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, Vaul, cmdk.
- **Utilities**: Zod, date-fns, class-variance-authority, React Hook Form with Zod resolver.
