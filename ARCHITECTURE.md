# SAIMÔR OS - Frontend Architecture

> Last updated: 2026-01-26

## Overview

SAIMÔR is an intelligent knowledge operating system. The frontend (mora-ui) renders the visual interface.

```
┌─────────────────────────────────────────────────────────────┐
│                      SAIMÔR OS                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    MoraShell                         │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │StarField│ │Mycelium │ │ViewPort │ │  Dock   │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  │                    │                                │   │
│  │         ┌──────────┴──────────┐                    │   │
│  │         │     View Router     │                    │   │
│  │    ┌────┴────┬────┴────┬────┴────┐                │   │
│  │    │Universe │Dept     │Space    │Folder          │   │
│  │    │View     │Layer    │Layer    │Layer           │   │
│  │    └─────────┴─────────┴─────────┴────────┘       │   │
│  └─────────────────────────────────────────────────────┘   │
│                         │                                   │
│  ┌─────────────────────┴─────────────────────────────┐    │
│  │                   MÔRA Orb                         │    │
│  │              (AI Intelligence)                     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
mora-ui/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Auth entry (WelcomeScreen)
│   ├── home/page.tsx      # OS entry (MoraShell)
│   ├── login/page.tsx     # Redirect to /
│   └── layout.tsx         # Root layout
│
├── components/
│   ├── os/                # ⭐ CORE OS COMPONENTS
│   │   ├── shell/         # MoraShell (main shell)
│   │   ├── views/         # (future: UniverseView, etc.)
│   │   └── navigation/    # (future: ViewPort, Dock)
│   │
│   ├── auth/              # Authentication UI
│   │   ├── WelcomeScreen.tsx
│   │   └── LockScreen.tsx
│   │
│   ├── mora/              # MÔRA Intelligence UI
│   │   ├── MoraOrb.tsx    # The glowing orb
│   │   ├── Dock.tsx       # Bottom navigation
│   │   ├── ResonanceRoom.tsx  # Chat interface
│   │   └── Spotlight.tsx  # Cmd+K search
│   │
│   ├── home/              # View components
│   │   ├── UniverseView.tsx   # Main orbital view
│   │   └── ClientHealthDashboard.tsx
│   │
│   ├── layers/            # Zoom levels
│   │   ├── DepartmentLayer.tsx
│   │   ├── SpaceLayer.tsx
│   │   └── FolderLayer.tsx
│   │
│   ├── visual/            # Background effects
│   │   ├── StarField.tsx
│   │   └── NeuralGrid.tsx
│   │
│   ├── organic/           # Organic UI elements
│   │   ├── MyceliumOverlay.tsx
│   │   └── NodeDetailPanel.tsx
│   │
│   ├── panes/             # Floating panes
│   │   ├── PaneManager.tsx
│   │   └── *.tsx
│   │
│   └── layout/            # Layout utilities
│       ├── ViewPort.tsx   # View router
│       └── UserCursor.tsx
│
├── lib/
│   ├── store/             # Zustand stores
│   │   ├── moraState.ts   # Global app state
│   │   └── paneStore.ts   # Pane management
│   │
│   ├── hooks/
│   │   ├── shell/         # ⭐ Shell-specific hooks
│   │   │   ├── useShellEvents.ts
│   │   │   ├── useAwareness.ts
│   │   │   ├── useRealtime.ts
│   │   │   └── useKeyboardShortcuts.ts
│   │   └── *.ts           # Other hooks
│   │
│   └── api/               # API clients
│       ├── api.ts         # Main API client
│       ├── awarenessClient.ts
│       └── realtimeClient.ts
│
└── ARCHITECTURE.md        # This file
```

## Navigation Flow

```
/                   → WelcomeScreen (auth)
    ↓ authenticated
/home               → MoraShell
    ↓ ViewPort routes based on viewLevel
    ├── core        → UniverseView (orbital planets)
    ├── department  → DepartmentLayer (moons)
    ├── space       → SpaceLayer (stars/folders)
    └── folder      → FolderLayer (nodes/files)
```

## Key Components

### MoraShell (`components/os/shell/MoraShell.tsx`)
The main application shell. Contains:
- Background layers (stars, mycelium)
- ViewPort (content router)
- UI overlays (dock, orb, resonance, spotlight)
- Interaction layers (cursors, ghost)

### ViewPort (`components/layout/ViewPort.tsx`)
Routes to different views based on `viewLevel` in store:
- `core` → UniverseView
- `department` → DepartmentLayer
- `space` → SpaceLayer
- `folder` → FolderLayer

### MoraOrb (`components/mora/MoraOrb.tsx`)
The glowing AI orb in bottom-right. Shows awareness state.

### Dock (`components/mora/Dock.tsx`)
Bottom navigation bar with app shortcuts.

## State Management

Uses Zustand for state:

```typescript
// moraState.ts
{
    viewLevel: 'core' | 'department' | 'space' | 'folder',
    viewMode: 'owner' | 'demo' | 'workspace',
    user: User | null,
    companies: Company[],
    activeCompanyId: string | null,
    orbState: OrbState,
    // ... navigation methods
}
```

## Hooks

### Shell Hooks (`lib/hooks/shell/`)

| Hook | Purpose |
|------|---------|
| `useShellEvents` | Event bus for agency events |
| `useAwareness` | Polls orb state API |
| `useRealtime` | WebSocket for ghost presence |
| `useKeyboardShortcuts` | Global shortcuts (Cmd+K) |

## API Integration

Backend: `api.saimor.world`

```
/health              → Server health
/v1/departments      → Get departments
/v1/spaces           → Get spaces
/v1/folders          → Get folders
/v1/nodes            → Get nodes
/v1/semantic/search  → Semantic search
/v1/mindloop/*       → Intelligence events
/v1/mora/agent/*     → MÔRA Agent (Clawdbot-style)
```

## Development

```bash
cd mora-ui
npm install
npm run dev
# → http://localhost:3000
```

## Environment Variables

```env
NEXT_PUBLIC_CORE_API_URL=/api/core
NEXT_PUBLIC_JWT_TOKEN=eyJ...
NEXT_PUBLIC_AI_PROVIDER=gemini
NEXT_PUBLIC_AI_API_KEY=AIza...
NEXT_PUBLIC_AI_MODEL=gemini-2.0-flash-exp
```
