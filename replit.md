# Making Money - Educational Game Series

## Overview

"Making Money" is an educational game series designed to explore the fundamental question: "What is Money?" and its origins, necessity, and qualities. The initial lesson, "The Barter System," is a side-scrolling game set in an ancient village. Players experience a world without money, confronting disputes over promises that lead to the creation of a "Stone Tablet" ledger system. The game is optimized for touch-only input on iPad/tablet devices, aiming for a broad audience interested in interactive learning about economic concepts. The long-term vision includes a multi-chapter structure covering various aspects of money's evolution, face-capture for character customization, and pre/post reflection exercises to deepen player understanding.

## User Preferences

- Preferred communication style: Simple, everyday language.
- No interpretation of changes beyond explicit requests — ask before making decisions.
- Keyword highlighting: only "double coincidence of wants" and "ledger" (not debt/debts).

## System Architecture

### Frontend
- **Technology Stack**: React SPA with TypeScript (Vite), Wouter for routing, TanStack Query for server state.
- **UI Framework**: Shadcn/UI component library (Radix primitives, Tailwind CSS).
- **Game Engine**: Custom HTML5 Canvas-based JavaScript engine (60fps, click-to-walk).
- **Core Mechanics**: Dialogue system, NPC interaction, "Stone Tablet" HUD for debt tracking, item gifting on credit, brawl triggers, mood system, environmental transitions, "Double Coincidence of Wants" demonstration, and a badge system.
- **Game Progression**: Features a two-loop system (Failure Path with verbal promises, Success Path with Stone Tablet for recording debts), including "NPC-First" and "Elder-First" settlement approaches and escort mechanics. A "Smart Path" allows players to suggest a recording system via keyword matching, skipping the initial failure loop.
- **Badge System**: 6 collectible badges (Double Coincidence of Wants, Debt, The Ledger, Debt Settled, Money Scholar, Music Scholar) with persistent HUD and tap-to-expand panel.
- **Quiz System**: Two types: DJ Quiz (1-2 questions, gated, leads to song choice) and Final Quiz (5 review questions, non-gated). Questions are sourced from a centralized `quizBank.ts`. Includes "Quick Check!" pop-ups.
- **Slingshot Balloon-Pop Mini-Game**: An "Angry Birds"-style physics-based mini-game during the party, with score tracking and collision detection for various world elements.
- **Party Flow**: Time-based event with a storm countdown and progressive atmospheric effects, requiring player action (roof repair). Party graphics fade after repair.
- **Audio System**: Web Audio API with `AudioContext` for dynamic soundscapes, including layered audio, dynamic background music, and independent volume controls persisted to localStorage.
- **Visual Style**: Painted/illustrated backgrounds, pixel-art character sprites, earth tones, natural materials, and monospace/sans-serif fonts. Responsive canvas design.
- **Music Strategy**: Dynamic music loading and playback, with a focus on maximizing impact during celebration.
- **Song Choice Mechanic**: Players select from 11 celebration genres after passing the DJ Quiz, each with a dedicated remix audio file, lazy-loaded on selection. Mid-party song change allowed once.
- **Music Collection HUD**: Vinyl record icon shows progress (X/11), expands to a panel to view and select unlocked genres. Persistence across sessions via localStorage.
- **2-Playthrough Gold Record Path**: Designed for collecting all 11 genres in two playthroughs, utilizing various in-game actions and bonus questions.
- **Record Rewards**: Slingshot score, disco ball hit, and NPC bonus knowledge checks award random uncollected genre records.
- **Player Customization**: Player name input for dialogue and ledger entries. Music Scholar badge unlocks a toggleable disco avatar sprite.
- **Settings Menu**: Provides access to sound settings, game instructions, credits, fullscreen toggle, and game restart/reset options.
- **End-of-Game Reflection**: Players can provide and revise their definition of money, which is displayed on the success screen.
- **Screen Flow**: Phased loading and asset optimization for smooth transitions from loading to gameplay.

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