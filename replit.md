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

- **NPC Spacing**: NPCs use `renderOffsetX` for visual separation without pushing, with 50px exclusion radius around Stone Tablet to keep it clickable
- **Pond Positioning**: Shifted pond/fishing graphics left 60px and down 25px below ground horizon
- **Wood in Inventory HUD**: Wood now displays with brown color (#8B4513) and 'W' label, with proper `woodIntroduced` flag tracking
- **Stone Tablet Loop 1**: Elder wisdom dialogue about trustless verification: "A promise remembered only by one is easily forgotten by another"
- **Choice Color Coding**: Procurement phase (green=record, red=promise), Settlement phase (green=consult tablet, red=give-in) with context-aware detection
- **Gaslight Failure Path Fix**: `resourcesDepleted` flag properly set when paying inflated demands, making second debt impossible to pay (intentional failure path)

## External Dependencies

- **Database**: PostgreSQL with Drizzle ORM for database operations and migrations.
- **Session Management**: `connect-pg-simple` for session storage.
- **UI Components**: Radix UI (primitives), Tailwind CSS, Lucide React (icons), Embla Carousel, Vaul (drawers), cmdk (command palette).
- **Utilities**: Zod (schema validation), date-fns (date formatting), class-variance-authority, React Hook Form with Zod resolver.