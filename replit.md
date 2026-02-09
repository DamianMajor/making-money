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
- **Character Sprites**: Generated 2D pixel-art sprites for Player, Stone Worker, Fisherman, Village Elder, and Woodcutter. Sprites loaded with chroma key green background removal (samples corner pixel, Euclidean distance tolerance=80, 30-unit anti-alias band). Stored in `client/public/sprites/`.
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
    - **Mood System**: Visual feedback for positive actions.
    - **Environmental Transitions**: Night transitions, thunderstorms, and parallax backgrounds.
    - **Double Coincidence of Wants**: Dialogue system demonstrates the economic problem of bartering challenges, rejecting player offers until credit is established.
    - **Badge System**: Awards celebratory popups with badges for learning key concepts like "Double Coincidence of Wants" and "Ledger Master."
    - **Audio System**: Utilizes Web Audio API with `AudioContext` for dynamic soundscapes, including pitch-varied footsteps, layered brawl audio, and dynamic background music transitions.

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

- Berry bush: player stops at bushX - 60px to stand beside it, not on top.
- Boo sound: uses setTimeout(2000) with state guard to play during fail screen, not during fight.
- Sound system: loads 34 sounds, mute/unmute via localStorage key `villageLedger_soundSettings`.
- Stone Tablet: graphic removed but interaction area preserved, popup shows on arrival or direct click.
- Celebration timing: applauseDuration = fullDuration - 10 seconds (min 2s).
- Game title displayed as "THE BARTER SYSTEM" in-game UI, series title "Making Money" on intro screen.

## External Dependencies

- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: `connect-pg-simple`.
- **UI Components**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, Vaul, cmdk.
- **Utilities**: Zod, date-fns, class-variance-authority, React Hook Form with Zod resolver.
