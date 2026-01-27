# SAIMOR OS - Frontend Architecture

> Last updated: 2026-01-27

## Overview

The mora-ui frontend is a Next.js (App Router) application. The active OS shell is
`components/os/shell/MoraShell.tsx`, which renders the universe view and all OS
surfaces (dock, orb, spotlight, panes).

Key entry points:
- `/` -> WelcomeScreen (login)
- `/home` -> MoraShell (OS)
- `app/layout.tsx` -> root layout and providers
- `middleware.ts` -> auth gating for protected routes

## Directory Map (active)

```
mora-ui/
  app/
    page.tsx
    home/page.tsx
    login/page.tsx
    api/auth/[...nextauth]/route.ts
    api/core/[...slug]/route.ts
    api/demo/reset/route.ts
  components/
    os/
      shell/MoraShell.tsx
    home/
      UniverseView.tsx
      UniverseControls.tsx
      StarField.tsx
    layout/
      ViewPort.tsx
    mora/
      MoraOrb.tsx
      Dock.tsx
      Spotlight.tsx
      CursorAgent.tsx
      MoraLivingBackground.tsx
      PaneManager.tsx
    panes/
      AppLibraryPane.tsx
      FinderPane.tsx
      GridPane.tsx
      DocumentPane.tsx
      SettingsPane.tsx
      ChatPane.tsx
      TimelinePane.tsx
    providers/
      MoraSessionProvider.tsx
  lib/
    store/
      moraState.ts
      paneStore.ts
    hooks/
      shell/*
    api/
      coreClient.ts
      filesClient.ts
      moraAgentClient.ts
      realtimeClient.ts
  middleware.ts
  ARCHITECTURE.md
```

## Navigation Flow

```
/        -> WelcomeScreen
/home    -> MoraShell
            -> ViewPort decides view by viewLevel
               - core -> UniverseView
               - department -> DepartmentLayer
               - space -> SpaceLayer
               - folder -> FolderLayer
```

## OS Surfaces (Keep Set)

- Home/Universe (UniverseView)
- Files/Finder (FinderPane)
- Grid (GridPane)
- Search (Spotlight -> DocumentPane)
- Settings (SettingsPane)
- Auth/Lock/Logout (WelcomeScreen, LockScreen)
- Confirmation flow (ConfirmationCard + ActionRegistry)

## State Management

- `moraState` holds universe navigation state (viewLevel, active company, user).
- `paneStore` owns the pane stack and frontmost pane invariant.

## API Integration

All frontend API calls use the `/api/core/*` rewrite defined in `next.config.js`.
This targets the core backend (`https://api.saimor.world/*`) or local proxying
depending on environment.

Primary clients live in `lib/api/*` and are used by the shell and panes.

## Development

```bash
cd mora-ui
npm install
npm run dev
# http://localhost:3000
```

## Environment (examples)

```env
NEXT_PUBLIC_CORE_API_URL=/api/core
NEXT_PUBLIC_DISABLE_WEBGL=true
```
