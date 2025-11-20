# Môra UI v2 - Implementation Plan

**Status:** In Progress
**Last Updated:** 2025-11-20
**Architecture:** Core → Department → Space → Folder (4-Level Hierarchy)

---

## 🎯 Vision: The Big Picture

Môra UI is a **spatial navigation system** built around a central "Orb" that represents the core system. Users navigate through hierarchical levels:

```
CORE (Môra Orb + Departments)
  ↓ Click Department
DEPARTMENT (Spaces Grid)
  ↓ Click Space
SPACE (Folder Tree + Visual/Explorer modes)
  ↓ Click Folder
FOLDER (Documents, Objects, Mycelium Graph)
```

### Key Principles:
1. **Spatial Navigation** - Each level feels like "zooming in" to a deeper layer
2. **Organic Design** - Breathing animations, glass morphism, natural motion
3. **Single Source of Truth** - All navigation state in Zustand store (`lib/store/moraState.ts`)
4. **Layer-Based Rendering** - Each level is a separate component in `components/layers/`
5. **No Clutter** - Clean, minimal, focused UI at each level

---

## 📂 Current Implementation Status (Mora UI v2 Shell)

### ✅ What's Already Built:

#### 1. **Core Architecture** (COMPLETE)

**File:** `lib/store/moraState.ts`
```typescript
- viewLevel: 'core' | 'department' | 'space' | 'folder'
- activeDepartmentId: string | null
- activeSpaceId: string | null
- navigateToCore(), navigateToDepartment(), navigateToSpace()
```
**Status:** ✅ Working - Clean Zustand store with navigation helpers

---

#### 2. **Shell & ViewPort** (COMPLETE)

**File:** `components/layout/MoraShell.tsx`
- Global background (OrganicBackground)
- ViewPort wrapper
- Placeholder for ChatDock (bottom overlay)

**File:** `components/layout/ViewPort.tsx`
- Renders layers based on `viewLevel` from store
- Smooth AnimatePresence transitions between levels
- Core → Department → Space (placeholder) implemented

**Status:** ✅ Working - Clean separation of concerns

---

#### 3. **CoreLayer** (COMPLETE)

**File:** `components/layers/CoreLayer.tsx`

**Features:**
- Central Môra Orb (using `MoraOrb` component)
- 4 Department satellites orbiting the center
- Click department → `navigateToDepartment(id)`
- Mock data for departments (Engineering, Design, Ops, Product)

**Status:** ✅ Working - Visual design matches the vision

---

#### 4. **DepartmentLayer** (COMPLETE)

**File:** `components/layers/DepartmentLayer.tsx`

**Features:**
- Back button → `navigateToCore()`
- Header shows active department name
- Grid of Spaces (3 mock spaces: Alpha, Beta, Gamma)
- Click space → `navigateToSpace(id)`

**Status:** ✅ Working - Clean navigation flow

---

### 🚧 What's Still Missing:

#### 5. **SpaceLayer** (TODO)

**File:** `components/layers/SpaceLayer.tsx` (needs to be created)

**Requirements:**
- Back button → `navigateToDepartment()`
- Header shows active space name
- **Two Views:**
  - **Visual Mode:** Mycelium graph (using `MyceliumGraph2D`)
  - **Explorer Mode:** Folder tree list
- Toggle button to switch between views
- Click folder → `navigateToFolder()` (needs to be added to store)

**Mock Data Needed:**
- Folders/objects for each space
- Use existing `mockSnapshots` from `lib/mockData.ts`

---

#### 6. **FolderLayer** (TODO)

**File:** `components/layers/FolderLayer.tsx` (needs to be created)

**Requirements:**
- Back button → `navigateToSpace()`
- Header shows active folder path
- Display folder contents:
  - Documents
  - Sub-folders
  - Mycelium connections
- Integrate with Saimôr Core API (`/v1/tree`)

---

#### 7. **ChatDock** (TODO)

**File:** `components/ui/ChatDock.tsx` (needs to be created)

**Requirements:**
- Dynamic Island style (bottom center, expands on interaction)
- Floating above all layers (z-index 50+)
- Collapsed state: Small pill with Môra icon
- Expanded state: Chat interface with AI responses
- Should work across all view levels
- Use `OrganicInput` component for message input

**Integration:**
- Add to `MoraShell.tsx` as overlay
- Keep state in separate store or context

---

#### 8. **Global Command Bar** (TODO)

**File:** `components/ui/CommandBar.tsx` (partially exists as `GlobalCommandBar.tsx`)

**Requirements:**
- Keyboard shortcut: `Cmd/Ctrl + K`
- Search across all levels (departments, spaces, folders, objects)
- Quick navigation
- Actions (create, delete, etc.)

**Integration:**
- Add to `MoraShell.tsx` as overlay
- Hook into store for navigation

---

#### 9. **Core API Integration** (TODO)

**Endpoints Needed:**
- `GET /v1/departments` - List all departments
- `GET /v1/departments/:id/spaces` - List spaces in department
- `GET /v1/spaces/:id/tree` - Get folder tree for space
- `GET /v1/folders/:id/contents` - Get folder contents

**Files to Update:**
- `lib/api.ts` - Add new endpoints
- `lib/hooks/useApi.ts` - Create hooks for each endpoint
- Replace mock data in layers with real API calls

**Current Blocker:**
- Core API 403 errors (JWT validation issue)
- See `GEMINI3_COMPLETE_ROADMAP.md` for details

---

### ⚠️ Deprecated / Old Files (DO NOT USE)

These files are from the old v1 architecture and should **not** be used or extended:

#### Old Routes:
- ❌ `app/organic/page.tsx` - Old organic dashboard approach
- ❌ `app/field/page.tsx` - Direct field view (should go through hierarchy)
- ❌ `app/folder/page.tsx` - Direct folder view (should go through hierarchy)
- ❌ `app/insights/page.tsx` - Old insights page
- ❌ `app/spaces/[id]/field/page.tsx` - Old space routes
- ❌ `app/spaces/[id]/folder/page.tsx` - Old space routes
- ❌ `app/spaces/[id]/insights/page.tsx` - Old space routes

#### Old Components:
- ❌ `app/home/page.legacy.tsx` - **2000+ lines of old dashboard logic**
  - This is the OLD implementation with everything mixed together
  - DO NOT extend or reference this file
  - Only kept for reference during migration

- ❌ `components/organic/DashboardLayout.tsx` - Old dashboard shell
- ❌ `components/organic/BootSequence.tsx` - Startup animation (may re-use later)
- ❌ `components/canvas/OrganicField.tsx` - Old field view wrapper

#### Old State Management:
- ❌ `store/spaces.ts` - Old spaces store (use `moraState.ts` instead)
- ❌ `lib/hooks/useSpaces.ts` - Old spaces hook

---

### ✅ Reusable Components (Keep & Use)

These components are **design-system level** and work with both old and new architecture:

#### Organic Components (Design System):
- ✅ `OrganicBackground` - Animated spore background
- ✅ `MoraOrb` - Central breathing orb
- ✅ `ConnectorNode` - Interactive node buttons
- ✅ `DataCluster` - Floating stat badges
- ✅ `OrganicInput` - Chat input bar
- ✅ `NavIcon` - Navigation icon buttons
- ✅ `NodeDetailsPanel` - Detail view for objects
- ✅ `OrganicStatePanel` - System status panel
- ✅ `MyceliumCanvas` - Organic node canvas with parallax
- ✅ `OrganicNode` - Single breathing node

#### Canvas Components:
- ✅ `MyceliumGraph2D` - 2D mycelium graph renderer
- ✅ `MyceliumBackground` - Background layer for graph
- ✅ `CameraControls` - Pan/zoom controls for canvas

---

## 🗺️ File Structure (New Architecture)

```
mora-ui/
├── app/
│   ├── home/
│   │   ├── page.tsx ✅ NEW - Just renders <MoraShell />
│   │   └── page.legacy.tsx ❌ OLD - 2000+ lines (deprecated)
│   └── layout.tsx
│
├── components/
│   ├── layout/
│   │   ├── MoraShell.tsx ✅ NEW - Main shell wrapper
│   │   └── ViewPort.tsx ✅ NEW - Layer renderer
│   │
│   ├── layers/ ✅ NEW - One file per view level
│   │   ├── CoreLayer.tsx ✅ DONE
│   │   ├── DepartmentLayer.tsx ✅ DONE
│   │   ├── SpaceLayer.tsx 🚧 TODO
│   │   └── FolderLayer.tsx 🚧 TODO
│   │
│   ├── organic/ ✅ KEEP - Reusable design components
│   │   ├── OrganicBackground.tsx
│   │   ├── MoraOrb.tsx
│   │   ├── ConnectorNode.tsx
│   │   ├── OrganicInput.tsx
│   │   └── ... (18 components)
│   │
│   ├── canvas/ ✅ KEEP - Graph rendering
│   │   ├── MyceliumGraph2D.tsx
│   │   └── MyceliumBackground.tsx
│   │
│   └── ui/ 🚧 TODO - Global overlays
│       ├── ChatDock.tsx
│       └── CommandBar.tsx
│
├── lib/
│   ├── store/
│   │   └── moraState.ts ✅ NEW - Single source of truth
│   ├── hooks/
│   │   ├── useApi.ts ✅ KEEP
│   │   └── useRealtime.ts ✅ KEEP
│   └── api.ts ✅ KEEP - Core API client
│
└── Mora_UI_Blueprint/
    └── implementation_plan.md ✅ THIS FILE
```

---

## 📖 How Other Agents Should Work With Môra UI

> **Important for Gemini, Codex, and other AI agents working on this codebase:**

### Entry Point
Start here: `app/home/page.tsx`
```typescript
export default function HomePage() {
  return <MoraShell />;
}
```
**That's it!** The entire UI is rendered through `MoraShell`.

---

### Understanding the Architecture

#### 1. **Navigation State** → `lib/store/moraState.ts`
All navigation state lives in ONE place:
```typescript
const viewLevel = useMoraStore(state => state.viewLevel);
const navigateToDepartment = useMoraStore(state => state.navigateToDepartment);
```

**Never** create separate navigation state in components.

---

#### 2. **View Levels** → `components/layout/ViewPort.tsx`
ViewPort reads `viewLevel` and renders the correct layer:
```typescript
if (viewLevel === 'core') return <CoreLayer />
if (viewLevel === 'department') return <DepartmentLayer />
if (viewLevel === 'space') return <SpaceLayer />
if (viewLevel === 'folder') return <FolderLayer />
```

**To add a new level:**
1. Create `components/layers/NewLayer.tsx`
2. Add to ViewPort.tsx switch
3. Add navigation function to moraState.ts

---

#### 3. **Layer Components** → `components/layers/*.tsx`
Each layer is a **full-screen view** at a specific hierarchy level.

**Rules for creating layers:**
- Always include a back button (except CoreLayer)
- Use `useMoraStore` for navigation
- Keep UI focused on current level (no nested levels)
- Use organic design components from `components/organic/`

**Example template:**
```typescript
export const MyLayer: React.FC = () => {
  const navigateBack = useMoraStore(state => state.navigateToParent);

  return (
    <div className="relative w-full h-full p-10">
      {/* Back Button */}
      <button onClick={navigateBack}>
        <ArrowLeft />
      </button>

      {/* Content */}
      <div className="flex-1">
        {/* Your layer content */}
      </div>
    </div>
  );
};
```

---

#### 4. **Design Components** → `components/organic/*.tsx`
Reusable UI components. **Use these instead of creating new ones:**
- `MoraOrb` - Central orb
- `ConnectorNode` - Clickable nodes
- `OrganicInput` - Chat input
- `DataCluster` - Stat badges
- `OrganicBackground` - Animated background
- ...and 18 more

**Never** rebuild these from scratch.

---

#### 5. **API Integration** → `lib/api.ts`
To add new API endpoints:
```typescript
// 1. Add to lib/api.ts
export async function getDepartments(token: string) {
  const res = await fetch(`${CORE_API_URL}/v1/departments`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

// 2. Create hook in lib/hooks/useApi.ts
export function useDepartments() {
  return useQuery(['departments'], () => getDepartments(token));
}

// 3. Use in layer component
const { data: departments } = useDepartments();
```

**Current blocker:** Core API returns 403 (see GEMINI3_COMPLETE_ROADMAP.md)

---

#### 6. **Adding New Features**

**For Spaces/Folders visualizations:**
- Create/update `components/layers/SpaceLayer.tsx` or `FolderLayer.tsx`
- Use existing `MyceliumGraph2D` for visual mode
- Add new view modes as needed

**For ChatDock:**
- Create `components/ui/ChatDock.tsx`
- Add to `MoraShell.tsx` as overlay (z-index 50+)
- Use `OrganicInput` for message input
- Keep chat state separate from navigation state

**For Core API connection:**
- Fix JWT validation issue first (see P0 blocker)
- Add endpoints to `lib/api.ts`
- Create hooks in `lib/hooks/useApi.ts`
- Replace mock data in layers

---

### ⚠️ Common Pitfalls to Avoid

1. **DON'T** use `app/home/page.legacy.tsx` as reference
   - It's 2000+ lines of old code
   - Different architecture
   - Only kept for migration reference

2. **DON'T** create parallel navigation systems
   - Only use `useMoraStore` for navigation
   - Don't add URL routing for internal navigation
   - Keep it simple: One store, one ViewPort

3. **DON'T** build new organic components from scratch
   - Check `components/organic/` first
   - Reuse existing components
   - Match the established design language

4. **DON'T** mix view levels
   - CoreLayer should only show departments
   - DepartmentLayer should only show spaces
   - No nesting of layers within layers

5. **DON'T** add complex state to layers
   - Layers should be mostly stateless
   - Global state goes in Zustand stores
   - Local UI state (hover, etc.) is fine

---

**Last Updated:** 2025-11-20
**Next Review:** After P0 (Core → Department navigation test)
**Status:** Foundation complete, building layers next
