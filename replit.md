# Village Ledger Educational Game

## Overview

Village Ledger is an educational side-scrolling game designed to teach concepts of record-keeping and trust through a narrative-driven experience. Set in an ancient village, players resolve a dispute over a promise, leading to the creation and adoption of a "Stone Tablet" ledger system. The game aims to provide a unique learning experience via engaging gameplay, emphasizing the importance of verifiable records. It is optimized for touch-only input on iPad/tablet devices, targeting a broad audience interested in interactive learning, and explores business visions of interactive educational content and market potential in EdTech.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **World & NPCs**: A 3500px wide world with distinct locations and NPCs with defined movement patterns and central interaction points.
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

### Backend
- **Express.js** server with TypeScript for API routes and static asset serving.
- In-memory storage with an interface for future database integration.

### Build System
- **Vite** for frontend bundling, **esbuild** for server-side TypeScript.
- Custom build script for optimized dependencies.

### Design System
- Retro educational game aesthetic (Oregon Trail, Carmen Sandiego inspired).
- Earth tones, natural materials, monospace fonts for dialogue, and bold sans-serif for UI.
- Responsive canvas design for various tablet aspect ratios.

## External Dependencies

- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: `connect-pg-simple`.
- **UI Components**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, Vaul, cmdk.
- **Utilities**: Zod, date-fns, class-variance-authority, React Hook Form with Zod resolver.