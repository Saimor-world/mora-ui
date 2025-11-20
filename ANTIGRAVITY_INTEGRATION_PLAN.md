# 🌊 Antigravity x Môra UI - Vollständige Integration

**Status:** Ready for Implementation
**Created:** 2025-11-19 08:15 CET
**Ziel:** Organische Transformation des gesamten Myzelium-Systems

---

## 📦 Was Antigravity gebaut hat

### Components Library (`components/organic/`)

1. **OrganicBackground.tsx** (137 lines)
   - Canvas-basierter animated background
   - 80 floating particles ("spores") mit Biolumineszenz
   - Mycelium connections zwischen nearby particles
   - Breathing gradient background (3.3s cycle)
   - Props: `intensity`, `breathingSpeed`

2. **MoraOrb.tsx** (69 lines)
   - Zentraler breathing/pulsing orb
   - 4 States: `idle | speaking | processing | listening`
   - 3 Layers: Outer halo, Middle aura, Core orb
   - Orbiting particles ("electrons")
   - Scale prop für verschiedene Größen

3. **DashboardLayout.tsx** (218 lines) ⭐ KOMPLEX
   - **Role-based UI:** Owner, Collaborator, Observer
   - **Blueprint Mode Toggle** - Developer view mit labels
   - Adaptive Sidebar Navigation (20px width)
   - MoraOrb im Zentrum
   - DataClusters für Owner (CPU, Network, Security)
   - Project cards für Collaborator
   - Right Intelligence Panel (Insights, Charts)
   - Bottom OrganicInput bar

4. **ConnectorNode.tsx** (89 lines)
   - Node mit Icon + Label
   - Mycelium root animation bei Selection
   - Status indicator (connected/idle)
   - Staggered entrance animation via `delay` prop

5. **OrganicInput.tsx** (84 lines)
   - Bottom chat bar (rounded capsule)
   - **@ Mention System** mit dropdown suggestions
   - @Môra (AI) + @Collaborators
   - Mic + Send buttons
   - Animated entrance when typing

6. **DataCluster.tsx** (32 lines)
   - Floating data label mit icon
   - Animated float movement
   - Positioning via top/left/right/bottom props
   - Delay for staggered animation

7. **InsightCard.tsx** (22 lines)
   - Small card für Insights/Events
   - Type: success | alert
   - Glow effect on status dot

8. **NavIcon.tsx** (21 lines)
   - Sidebar navigation icon
   - Active state mit left bar indicator
   - Hover tooltip

9. **RoleCard.tsx** (30 lines)
   - Role selection card (Owner, Collaborator, Observer)
   - Hover effects mit lift + glow

### Hooks

10. **useSaimorCore.ts** (38 lines)
    - Generic Core API polling hook
    - Endpoint + interval + token
    - Returns: `{ data, loading, error }`
    - Fallback/mock data support

### Styling

11. **tailwind.config.ts** - Extensions
    ```typescript
    colors: {
      "mora-forest": "#0E1F18",  // Deep green-black
      "mora-gold": "#CEB676",     // Warm gold
      "mora-glass": "rgba(255, 255, 255, 0.03)",
    }

    animations: {
      float: "float 6s ease-in-out infinite",
      "pulse-slow": "pulse-slow 4s ease-in-out infinite",
      "draw-root": "draw-root 1.5s ease-out forwards",
      "spin-reverse-slow": "spin-reverse-slow 12s linear infinite",
      "spin-slower": "spin-slower 16s linear infinite",
    }
    ```

---

## 🔗 Bestehende Môra UI Architektur

### Core Components

1. **MyceliumGraph2D.tsx** (1100+ lines)
   - Canvas 2D mycelium rendering
   - Node breathing (3.3s cycle)
   - Edge particle flow
   - Bioluminescence effects
   - Semantic event signals
   - Focus/selection system

2. **FieldMode.tsx** (300+ lines)
   - Main field view container
   - Floating organisms pattern (no fixed header)
   - Timeline scrubbing
   - Stats overlay (top-left)
   - Navigation buttons (bottom-right)
   - Role-based field hints

3. **Canvas.tsx**
   - Wrapper mit health check
   - FieldMode / FolderMode switcher
   - Deep-linking support (?focus=node1,node2)

4. **WorkspaceShell.tsx**
   - AppProvider wrapper
   - Lens, Canvas, Insights, MoraChat layout
   - Space-aware routing

5. **MoraChat.tsx**
   - Right sidebar chat
   - Message history
   - AI responses

### Hooks

- `useRealtime.ts` - Real-time events
- `useFilesystem.ts` - File system integration
- `useApi.ts` - Core API calls
- `useSemanticEvents.ts` - Mindloop events

### Store

- `spaces.ts` - Multi-space management (Zustand)
- `session.ts` - User session state

---

## 🎯 Integration Strategy

### Phase 1: Background & Atmosphere ✨

**Goal:** Replace static gradients mit animated organic background

**Files to modify:**
- `components/canvas/FieldMode.tsx`

**Implementation:**
```tsx
import { OrganicBackground } from '@/components/organic/OrganicBackground';

export default function FieldMode({ spaceId }) {
  return (
    <div className="h-full relative overflow-hidden">
      {/* NEW: Animated Organic Background */}
      <OrganicBackground
        intensity={1.2}
        breathingSpeed={3300}
      />

      {/* Existing: Gradient overlay (reduced opacity) */}
      <div className="absolute inset-0 bg-[radial-gradient(...)] opacity-30">
        {/* ... rest of FieldMode ... */}
      </div>
    </div>
  );
}
```

**Result:**
- Animated spores floating in background
- Mycelium connections forming/dissolving
- Breathing intensity matches existing 3.3s cycle

---

### Phase 2: MoraOrb als Central Focus 🔮

**Goal:** Integriere MoraOrb als "Herz des Myzeliums"

**Location:** Center of FieldMode when no node selected

**Implementation:**
```tsx
import { MoraOrb } from '@/components/organic/MoraOrb';

export default function FieldMode() {
  const { selection } = useMyceliumSelection();
  const [orbState, setOrbState] = useState<'idle' | 'processing' | 'speaking'>('idle');

  // Detect AI activity
  useEffect(() => {
    if (semanticEvents.length > 0) {
      setOrbState('processing');
      setTimeout(() => setOrbState('idle'), 2000);
    }
  }, [semanticEvents]);

  return (
    <>
      <MyceliumGraph2D ... />

      {/* NEW: Central Orb (nur wenn kein Node selected) */}
      {!selection && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <MoraOrb
            state={orbState}
            scale={0.8}
          />
        </div>
      )}
    </>
  );
}
```

**States:**
- `idle` - Pulsing gently
- `processing` - When semantic events incoming
- `speaking` - When AI chat responds

---

### Phase 3: Organic Stats Overlay 📊

**Goal:** Replace PanelCard stats mit DataClusters

**Current:** Top-left static panel
**New:** Floating DataClusters around the field

**Implementation:**
```tsx
import { DataCluster } from '@/components/organic/DataCluster';
import { Cpu, Activity, Database } from 'lucide-react';

// Replace static panel:
<div className="absolute top-6 left-6 ...">

// With floating clusters:
<>
  <DataCluster
    top="10%"
    left="8%"
    label={`${snapshot.nodes.length} Nodes`}
    icon={Database}
    delay={0}
  />
  <DataCluster
    top="15%"
    right="8%"
    label={`${snapshot.edges.length} Edges`}
    icon={Activity}
    delay={0.5}
  />
  <DataCluster
    bottom="20%"
    left="10%"
    label={hasLiveSnapshots ? '🟢 Live' : '🟡 Demo'}
    icon={Cpu}
    delay={1}
  />
</>
```

---

### Phase 4: Enhanced Node Selection 🎯

**Goal:** ConnectorNodes für wichtige/pinned nodes

**Use Case:** Frequently accessed nodes get special visual treatment

**Implementation:**
```tsx
import { ConnectorNode } from '@/components/organic/ConnectorNode';

// In FieldMode, detect pinned/important nodes:
const importantNodes = snapshot.nodes.filter(n => n.tags?.includes('important'));

return (
  <>
    <MyceliumGraph2D ... />

    {/* Floating connector nodes around periphery */}
    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-12">
      {importantNodes.slice(0, 5).map((node, i) => (
        <ConnectorNode
          key={node.id}
          icon={getIconForType(node.type)}
          label={node.title.slice(0, 10)}
          isSelected={selection?.node.id === node.id}
          onSelect={() => handleNodeSelect(node)}
          delay={i * 200}
          status="connected"
        />
      ))}
    </div>
  </>
);
```

---

### Phase 5: Organic Chat Integration 💬

**Goal:** Replace MoraChat sidebar mit OrganicInput bar

**Current:** Right sidebar (300px width)
**New:** Bottom floating chat bar

**Layout Change:**
```tsx
// WorkspaceShell.tsx
<div className="h-screen flex flex-col">
  {/* Main content takes full height minus chat bar */}
  <div className="flex-1 flex">
    <Lens />
    <Canvas />
    <Insights />
  </div>

  {/* NEW: Bottom Chat Bar */}
  <div className="h-24 flex items-center justify-center border-t border-white/5 bg-mora-forest/80 backdrop-blur-xl">
    <OrganicInput onSend={handleChatMessage} />
  </div>
</div>
```

**@ Mention Integration:**
- `@Môra` → Triggers AI chat
- `@Username` → Mention collaborators
- Custom mentions: `@Space`, `@Node:{id}`

---

### Phase 6: Role-Based Views 👤

**Goal:** Adapt UI based on user role (from session store)

**Use DashboardLayout concepts:**
- **Owner:** See system metrics (DataClusters), full access
- **Collaborator:** See project cards, limited nodes
- **Observer:** Minimal, read-only view

**Implementation:**
```tsx
import { useSessionStore } from '@/store/session';

export default function FieldMode() {
  const activeRole = useSessionStore(state => state.activeRole);

  return (
    <>
      <MyceliumGraph2D
        interactionMode={activeRole === 'observer' ? 'view-only' : 'full'}
      />

      {/* Owner: Full stats */}
      {activeRole === 'owner' && (
        <>
          <DataCluster top="10%" left="8%" label="CPU Load" icon={Cpu} />
          <DataCluster top="10%" right="8%" label="Network" icon={Activity} />
        </>
      )}

      {/* Collaborator: Task cards */}
      {activeRole === 'collaborator' && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
          {/* Project cards */}
        </div>
      )}

      {/* Observer: Just watching text */}
      {activeRole === 'observer' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h2 className="text-4xl font-thin text-white/10 tracking-[1em]">WATCHING</h2>
        </div>
      )}
    </>
  );
}
```

---

### Phase 7: Blueprint Mode 🔍

**Goal:** Developer mode für debugging

**Toggle:** Top-right button (like in DashboardLayout)

**Shows:**
- Component labels
- Performance metrics
- Event flow visualization
- Node/edge counts

**Implementation:**
```tsx
const [blueprintMode, setBlueprintMode] = useState(false);

return (
  <>
    {/* Blueprint Toggle */}
    <button
      onClick={() => setBlueprintMode(!blueprintMode)}
      className="absolute top-6 right-6 z-50 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs"
    >
      <Layers className="w-4 h-4" />
      {blueprintMode ? 'Blueprint: On' : 'Visual Mode'}
    </button>

    {/* Show labels when active */}
    {blueprintMode && (
      <>
        <div className="absolute top-20 left-10 bg-blue-600/90 text-white text-[10px] px-2 py-1">
          ➔ MyceliumGraph2D
        </div>
        <div className="absolute top-20 right-10 bg-blue-600/90 text-white text-[10px] px-2 py-1">
          ➔ Stats: {graphStats?.fps} FPS
        </div>
      </>
    )}
  </>
);
```

---

### Phase 8: useSaimorCore Hook Merger 🔌

**Goal:** Replace/enhance existing API hooks mit useSaimorCore

**Current hooks:**
- `useSnapshots()` - Fetch snapshots
- `useHealthCheck()` - Core API health
- `useRealtime()` - Event polling

**New pattern:**
```tsx
// Enhanced hook with fallback
import { useSaimorCore } from '@/lib/hooks/useSaimorCore';
import { mockSnapshots } from '@/lib/mockData';

export function useSnapshots() {
  const { data, loading, error } = useSaimorCore<SnapshotsResponse>(
    '/snapshots',
    5000,  // 5s interval
    getJwtToken()
  );

  // Fallback to mock data
  const snapshots = data?.snapshots || mockSnapshots;

  return {
    data: snapshots,
    isLoading: loading,
    error,
    isLive: !error  // True if Core API responding
  };
}
```

---

## 🔄 Migration Path

### Step 1: Add Components (Non-Breaking)
```bash
✅ DONE - Antigravity components already in components/organic/
✅ DONE - Tailwind config extended
```

### Step 2: FieldMode Background (Low Risk)
- Add `<OrganicBackground />` below existing gradients
- Adjust opacity of gradients
- Test performance with 80 particles

**Estimated time:** 15 minutes

### Step 3: Add MoraOrb (Medium Risk)
- Add orb in center when no selection
- Wire up state changes (idle/processing/speaking)
- Ensure doesn't conflict with MyceliumGraph2D

**Estimated time:** 30 minutes

### Step 4: Replace Stats Panel (Medium Risk)
- Comment out old panel
- Add DataClusters
- Verify positioning looks good

**Estimated time:** 20 minutes

### Step 5: Bottom Chat Bar (High Risk - Layout Change)
- Modify WorkspaceShell layout (flex-col)
- Move MoraChat logic to OrganicInput
- Test @ mention system

**Estimated time:** 1 hour

### Step 6: Role-Based UI (Medium Risk)
- Add role checks in FieldMode
- Conditionally render elements
- Test with different roles

**Estimated time:** 45 minutes

### Step 7: Blueprint Mode (Low Risk)
- Add toggle button
- Add debug labels
- Optional: only in dev mode

**Estimated time:** 20 minutes

### Step 8: ConnectorNodes (Low Risk)
- Add floating nodes for important items
- Wire up click handlers

**Estimated time:** 30 minutes

---

## 📊 Performance Considerations

### OrganicBackground
- **80 particles** + connections = ~100 draw calls/frame
- **Optimization:** Use requestAnimationFrame efficiently
- **Fallback:** Reduce particle count on slower devices

### MoraOrb
- 3 nested divs with blur effects
- **Optimization:** Use CSS transforms (GPU accelerated)
- **Fallback:** Disable blur on low-end devices

### Canvas Layers
- MyceliumGraph2D (existing canvas)
- OrganicBackground (new canvas)
- **Solution:** Use z-index separation, both on requestAnimationFrame

---

## 🎨 Design Harmony

### Color Palette Unification
```css
/* Antigravity */
--mora-forest: #0E1F18
--mora-gold: #CEB676

/* Existing Môra */
--emerald-950: #0a1612 (similar to mora-forest)
--emerald-500: #10b981 (accent)
--amber-500: #f59e0b (similar to mora-gold)
```

**Strategy:** Gradually replace emerald-950 with mora-forest, keep emerald-500 as accent

### Animation Timing
```
Existing: 3.3s breathing (MyceliumGraph2D)
Antigravity: 3.3s breathing (OrganicBackground)
✅ ALIGNED - Same frequency for coherent feel
```

---

## 🚀 Next Steps

1. **Test OrganicBackground** performance with MyceliumGraph2D
2. **Design MoraOrb states** mapping (idle/speaking/processing → app events)
3. **Prototype bottom chat bar** layout in Figma/code
4. **Define role permissions** (owner/collaborator/observer capabilities)
5. **Build ConnectorNode** interaction patterns

---

## 📁 Files to Create/Modify

### New Files
- ✅ `components/organic/*.tsx` (9 components) - DONE
- ✅ `lib/hooks/useSaimorCore.ts` - DONE
- `lib/hooks/useOrganicChat.ts` - NEW (wraps OrganicInput logic)

### Files to Modify
- `components/canvas/FieldMode.tsx` - Add OrganicBackground, MoraOrb, DataClusters
- `components/workspace/WorkspaceShell.tsx` - Flex-col layout for bottom chat
- `components/chat/MoraChat.tsx` - Extract logic, migrate to OrganicInput
- `app/globals.css` - Add glass-panel utility class
- `lib/hooks/useApi.ts` - Integrate useSaimorCore pattern

---

## ✅ Testing Checklist

- [ ] OrganicBackground renders without lag (60fps target)
- [ ] MoraOrb state changes smooth
- [ ] DataClusters position correctly on all screen sizes
- [ ] Bottom chat bar doesn't cover canvas content
- [ ] @ mentions trigger correct actions
- [ ] Blueprint mode shows all debug info
- [ ] Role switching changes UI correctly
- [ ] ConnectorNodes animate smoothly
- [ ] No z-index conflicts
- [ ] Keyboard shortcuts still work
- [ ] Mobile responsive (hide some clusters)

---

## 🎯 Success Metrics

- [ ] Organic feel throughout entire app
- [ ] Performance maintained (60fps)
- [ ] All existing features still work
- [ ] New features (@ mentions, blueprint mode) operational
- [ ] Code remains maintainable
- [ ] User feedback positive

---

**Ready to implement?** Let's start with Phase 1 (Background) and build incrementally! 🌿
