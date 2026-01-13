# Village Ledger Educational Game

## Overview

Village Ledger is an educational side-scrolling game built with HTML5 Canvas and React. The game teaches concepts about record-keeping and trust through a narrative set in an ancient village. Players interact with NPCs (Stone-worker, Fisherman, Village Elder) to experience how a dispute over a promise leads to the invention of a "Stone Tablet" ledger system. The game is optimized for touch-only input on iPad/tablet devices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React SPA** with TypeScript using Vite as the build tool
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** for server state management and API calls
- **Shadcn/UI** component library built on Radix primitives with Tailwind CSS styling
- **HTML5 Canvas** for the game rendering engine (`client/src/lib/gameEngine.ts`)

### Game Engine Design
- Custom vanilla JavaScript game engine using `requestAnimationFrame` for 60fps rendering
- Touch-only input system - screen divided into left/right zones for movement
- Player speed: 200 units/second, interaction range: 200 units (tablet-friendly)
- State machine for narrative progression: initial → got_stone → got_fish → dispute → elder_entering → solution → ledger_shown → resolved
- Character system with placeholder colored rectangles (Blue=Player, Green=Stone-worker, Orange=Fisherman, White=Elder)
- HUD displays a "Stone Tablet" ledger tracking debts/promises
- Dialogue system with typewriter effect using "Press Start 2P" retro font
- INTERACT button with 200ms fade transition in bottom-right corner

### Backend Architecture
- **Express.js** server with TypeScript
- Serves both API routes and static frontend assets
- In-memory storage implementation with interface for future database integration
- Vite dev server integration for hot module replacement during development

### Build System
- **Vite** for frontend bundling with React plugin
- **esbuild** for server-side TypeScript compilation
- Custom build script (`script/build.ts`) that bundles frequently-used dependencies to reduce cold start times
- Output goes to `dist/` directory with static assets in `dist/public/`

### Design System
- Retro educational game aesthetic inspired by Oregon Trail and Carmen Sandiego
- Earth tones and natural materials reflecting ancient civilization theme
- Typography uses monospace fonts for dialogue, bold sans-serif for UI labels
- Responsive canvas that handles different tablet aspect ratios

## External Dependencies

### Database
- **PostgreSQL** with Drizzle ORM for database operations
- Schema defined in `shared/schema.ts` with users table
- Drizzle Kit for migrations (`drizzle.config.ts`)
- `connect-pg-simple` for session storage

### UI Libraries
- **Radix UI** primitives for accessible components
- **Tailwind CSS** with custom theme configuration
- **Lucide React** for icons
- **Embla Carousel** for carousel components
- **Vaul** for drawer components
- **cmdk** for command palette

### Utilities
- **Zod** for schema validation with `drizzle-zod` integration
- **date-fns** for date formatting
- **class-variance-authority** for component variants
- **React Hook Form** with Zod resolver for form handling