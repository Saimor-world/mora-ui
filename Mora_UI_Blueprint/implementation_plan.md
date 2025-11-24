# Mora UI V2 - Implementation Plan

## Vision
A spatial, organic OS interface ("Môra") that acts as a calm, intelligent layer over the Saimôr Core.
- **Metaphor**: Mycelium, Orbs, Galaxies.
- **Navigation**: Zoom-in (Core -> Department -> Space -> Folder).
- **Tech**: Next.js 15, Zustand, Tailwind, Framer Motion.

## Phase 1: Foundation (DONE)
- [x] Clean Shell (`MoraShell`, `ViewPort`).
- [x] State Management (`useMoraStore`).
- [x] Basic Layers (`CoreLayer`, `DepartmentLayer`).
- [x] Legacy Isolation (moved old files to `*.legacy.tsx`).

## Phase 2: Core Integration (DONE)
- [x] API Client (`lib/api/coreClient.ts`) with JWT support.
- [x] Automatic Fallback Token Generation (Dev Mode).
- [x] Type Definitions (`lib/types/core.ts`).
- [x] Store Data Fetching (`loadDepartments`, `loadSpacesForDepartment`).
- [x] Real Data in Layers (`CoreLayer`, `DepartmentLayer`).

## Phase 3: Space & Folder Layers (IN PROGRESS)
- [x] SpaceLayer Scaffold (Visual/List toggle).
- [ ] Connect SpaceLayer to real data (Graph/Tree).
- [x] FolderLayer Scaffold.
- [ ] Implement file browsing.

## Phase 4: Interaction & AI (TODO)
- [x] ChatDock UI (Dynamic Island).
- [ ] Connect ChatDock to AI backend.
- [ ] Global Command Bar.

## How to Run
1.  **Backend**: Ensure Saimôr Core is running at `http://localhost:8081`.
2.  **Env**: Create `.env.local` with `NEXT_PUBLIC_SAIMOR_CORE_JWT`.
3.  **Frontend**: `npm run dev` (port 3002).

## Architecture Rules
1.  **State**: All UI state and data fetching goes through `useMoraStore`.
2.  **Components**: Keep components pure and visual. Logic belongs in the store or hooks.
3.  **Legacy**: Do not touch `app/home/page.legacy.tsx` or `components/organic/DashboardLayout.tsx`.
