# 🌿 Gemini 3 - Complete Môra OS Roadmap

**Date:** 2025-11-19
**From:** Claude Code
**To:** Gemini 3 (Complete OS Development)
**Priority:** 🔥 Critical Path Forward

---

## 🎯 Executive Summary

Môra UI hat eine **solide Foundation**, aber 3 kritische Probleme blockieren den Launch:

1. 🔴 **Core API 403 Forbidden** - Keine echten Daten
2. 🟡 **Mycelium Graph nicht interactive** - Nodes can't be opened
3. 🟡 **View lädt nicht richtig** - Performance/Loading issues

**Danach:** Komplette Platform-Vision (Multi-Space OS, MCP Integration, Filesystem)

---

## 📊 Current Status: Was funktioniert

### ✅ Bereits gebaut & funktional:

#### UI Components (Antigravity)
- **OrganicBackground** - Animated spores + mycelium connections
- **MoraOrb** - Breathing central orb (4 states: idle/speaking/processing/listening)
- **DataCluster** - Floating stats satellites
- **ConnectorNode** - Interactive node tiles
- **OrganicInput** - Chat bar mit @ mention system
- **InsightCard** - Event notification cards
- **OrganicSidebar** - 20px navigation
- **NodeDetailsPanel** - Detail view für nodes (NEW)
- **SpaceSwitcher** - Space selection component (NEW)

#### Views
- **`/organic`** - New organic dashboard (80% done)
- **`/home`** - Original home page (stable)
- **`/field`** - Mycelium graph view (needs improvement)
- **`/folder`** - Folder/hierarchy view (stable)

#### Core Features
- **MyceliumGraph2D** - Canvas-based graph rendering
- **Real-Time Events** - Polling system (3s interval)
- **Filesystem Integration** - Browser File System Access API
- **Deep-Linking** - `?focus=node1,node2` support
- **JWT Auth** - Token-based authentication
- **Spaces System** - Multi-space architecture (foundation ready)

#### Hooks & State
- `useRealtime()` - Real-time event streaming
- `useFilesystem()` - Local file access
- `useSaimorCore()` - Generic Core API polling
- `useSnapshots()` - Graph data fetching
- Zustand stores für session, spaces

---

## 🔴 CRITICAL BLOCKERS (Must fix NOW)

### 1. Core API 403 Forbidden Error

**Problem:**
```
GET /v1/snapshots → 403 Forbidden
GET /v1/mindloop → 403 Forbidden
```

**Current State:**
- JWT Token vorhanden (valid until 2025-01-20)
- Token wird gesendet: `Authorization: Bearer eyJhbGci...`
- Health endpoint (`/v1/health`) funktioniert
- Aber: Protected endpoints return 403

**Impact:**
- 🚫 Keine echten Daten in der UI
- 🚫 Mycelium graph zeigt mock data
- 🚫 Real-time events don't work
- 🚫 Can't test full workflow

**Location:**
- `lib/api.ts:30-50` - Auth header configuration
- `lib/config.ts` - JWT token loading
- `.env.local` - Token storage

**What to check:**
1. **Core API JWT validation:**
   - Is token format correct?
   - Is token signature valid?
   - Are required claims present? (tenant, role, sub)
   - Check Core API logs for 403 reason

2. **Endpoint permissions:**
   - Does owner role have access to `/v1/snapshots`?
   - Are these endpoints behind different auth?
   - Check Core API route guards

3. **CORS/Headers:**
   - Is Authorization header reaching Core?
   - Check browser network tab for actual headers sent

**Test Commands:**
```bash
# Test with curl directly
curl http://localhost:8081/v1/snapshots \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Check Core logs
# Look for: 403 reason, JWT validation errors
```

**Expected Fix:**
- Either: Fix JWT validation in Core
- Or: Generate new token with correct permissions
- Or: Update UI auth flow

---

### 2. Mycelium Graph - No Interactivity

**Problem:**
User sagt: "ich will sache oeffnen, interagieren koennen"

**Current State:**
- Nodes render beautifully
- Nodes breathe, glow, sway
- But: Click does nothing meaningful
- No detail panel opens
- No context menu
- Can't drag nodes
- Can't deep-dive into node

**Location:**
- `components/canvas/MyceliumGraph2D.tsx:700-900` - Click handlers
- `components/canvas/FieldMode.tsx` - Selection logic
- `components/organic/NodeDetailsPanel.tsx` - Detail view (exists but not wired)

**What to add:**

1. **Click → Open Details:**
```tsx
// In MyceliumGraph2D.tsx
function handleNodeClick(node: GraphNode) {
  setSelectedNode(node);
  // Open NodeDetailsPanel with:
  // - Node title, description, metadata
  // - Connected nodes (edges)
  // - Tags, creation date
  // - Actions: Edit, Delete, Open in folder, Copy link
}
```

2. **Hover → Highlight Connections:**
```tsx
function handleNodeHover(node: GraphNode) {
  // Highlight all connected nodes
  // Brighten edges
  // Show mini-tooltip with node title
}
```

3. **Double-Click → Deep Dive:**
```tsx
function handleNodeDoubleClick(node: GraphNode) {
  // If node has children → Zoom into subgraph
  // If node is file → Open file content view
  // If node is URL → Open in new tab
}
```

4. **Right-Click → Context Menu:**
```tsx
function handleNodeRightClick(node: GraphNode, event: MouseEvent) {
  event.preventDefault();
  showContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      { label: 'Open Details', action: () => openDetails(node) },
      { label: 'Focus', action: () => focusNode(node) },
      { label: 'Hide Node', action: () => hideNode(node) },
      { label: 'Copy Link', action: () => copyLink(node) },
      { label: 'Delete', action: () => deleteNode(node) },
    ]
  });
}
```

5. **Drag Nodes:**
```tsx
// Enable node dragging
// Update position in graph
// Save new layout (optional)
```

**Expected Outcome:**
- Click node → Details panel slides in from right
- Hover node → Connections light up
- Double-click → Zoom into node's subgraph
- Right-click → Context menu appears
- Drag → Node repositions

---

### 3. View lädt nicht / Performance Issues

**Problem:**
User sagt: "es lädt nicht ich kann es nicht sehen"

**Possible Causes:**

1. **Loading State Not Visible:**
   - No loading spinner
   - No progress indicator
   - User sees blank screen while data loads

2. **Canvas Rendering Blocked:**
   - MyceliumGraph2D waits for data but shows nothing
   - No fallback UI while loading

3. **Build/Dev Server Issue:**
   - TypeScript errors blocking render
   - Component crash without error boundary

4. **Performance Bottleneck:**
   - Too many particles rendering (80 spores + graph)
   - Animation frame rate drops
   - Browser freezes

**Location:**
- `components/canvas/OrganicField.tsx` - Main view
- `components/canvas/MyceliumGraph2D.tsx` - Graph rendering
- `components/organic/OrganicBackground.tsx` - Background animations

**What to add:**

1. **Loading States:**
```tsx
export default function OrganicField() {
  const { data, isLoading, error } = useSnapshots();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <MoraOrb state="processing" scale={1.2} />
        <p className="mt-8 text-emerald-200">Myzelium erwacht...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Verbindung zum Kern fehlgeschlagen</p>
          <p className="text-sm text-white/50 mt-2">{error.message}</p>
          <button onClick={() => window.location.reload()}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // Normal view
  return <MyceliumGraph2D data={data} />;
}
```

2. **Error Boundaries:**
```tsx
// Wrap in error boundary
<ErrorBoundary fallback={<ErrorView />}>
  <OrganicField />
</ErrorBoundary>
```

3. **Performance Optimization:**
```tsx
// Reduce particles on slower devices
const intensity = useMemo(() => {
  const fps = measureFPS();
  return fps < 30 ? 0.5 : 1.0;
}, []);

<OrganicBackground intensity={intensity} />
```

4. **Progressive Loading:**
```tsx
// Load graph in stages
1. Show background + orb immediately
2. Fade in stats clusters
3. Render graph nodes (chunked)
4. Finally: Add particle effects
```

**Expected Outcome:**
- Always shows something (loading state, error state, or content)
- Smooth 60fps animations
- Graceful degradation on slower devices

---

## 🎨 UI Improvements (After Blockers Fixed)

### High Priority

#### 1. Mycelium Graph Visual Improvements

**User wants:** "nicht 3D 3D aber halt im myzell stil"

**Current:** Basic 2D canvas with circles and lines
**Target:** Organic, flowing, mycelium-like network

**Enhancements:**
1. **Node Morphing:**
   - Not perfect circles → Organic blob shapes
   - Use SVG path morphing or metaballs
   - Irregular edges like cell membranes

2. **Edge Flow Animation:**
   - Particles flow along edges (nutrients)
   - Speed varies based on edge "strength"
   - Glow effect intensifies when data passes

3. **Organic Clustering:**
   - Nodes group naturally (force-directed layout)
   - Clusters form "colonies" with shared background glow
   - Related nodes pull together

4. **Depth Perception (Pseudo-3D):**
   - Larger nodes = closer (z-axis)
   - Blur distant nodes slightly
   - Parallax effect on scroll/pan
   - Shadows below nodes (not full 3D rendering)

5. **Bioluminescence:**
   - Nodes pulse at different frequencies
   - Glow spreads to nearby nodes (infection-style)
   - Brighten on activity (new connection, edit)

**Reference Styles:**
- Slime mold growth patterns
- Neural network visualizations
- Mushroom mycelium networks
- Bioluminescent plankton

**Code Location:**
- `components/canvas/MyceliumGraph2D.tsx` - Complete rewrite of rendering
- Consider using D3-force for organic layout
- Or: Custom physics simulation

---

#### 2. Organic Field Polish

**File:** `components/canvas/OrganicField.tsx`

**Add:**
1. **Smooth Transitions:**
   - All animations 0.7s ease-in-out
   - Stagger entrance animations (delay)
   - Fade in/out on mount/unmount

2. **Interactive Elements:**
   - Hover effects on all clusters/nodes
   - Scale + glow on hover
   - Tooltip on hover (debounced)

3. **Responsive Layout:**
   - Mobile: Hide some clusters
   - Tablet: Adjust positions
   - Desktop: Full layout

4. **Color Harmony:**
   - Use consistent mora-forest, mora-gold palette
   - Emerald accents for active states
   - White/low-opacity for passive elements

---

#### 3. Bottom Chat Bar Integration

**Current:** MoraChat is right sidebar (300px)
**Target:** OrganicInput as bottom bar (80px height)

**Changes:**
1. **WorkspaceShell Layout:**
```tsx
<div className="h-screen flex flex-col">
  {/* Main content */}
  <div className="flex-1 flex overflow-hidden">
    <Lens />
    <Canvas />
    <Insights />
  </div>

  {/* Bottom chat bar */}
  <div className="h-20 border-t border-white/5 bg-mora-forest/90 backdrop-blur-xl">
    <OrganicInput onSend={handleMessage} />
  </div>
</div>
```

2. **@ Mention System:**
   - `@Môra` → AI assistant
   - `@node:{id}` → Reference node in message
   - `@space:{name}` → Switch space context

3. **Voice Input (Optional):**
   - Mic button → Speech-to-text
   - Browser Web Speech API
   - Fallback: Text input only

---

#### 4. Role-Based UI

**Vision:** Different views based on user role

**Implementation:**
```tsx
const role = useSessionStore(state => state.activeRole);

// Owner: Full access + system metrics
if (role === 'owner') {
  return (
    <>
      <MyceliumGraph2D interactionMode="full" />
      <DataCluster label="CPU" icon={Cpu} />
      <DataCluster label="Network" icon={Activity} />
      <DataCluster label="Storage" icon={Database} />
    </>
  );
}

// Collaborator: Project-focused view
if (role === 'collaborator') {
  return (
    <>
      <MyceliumGraph2D interactionMode="limited" />
      {/* Only show assigned nodes */}
    </>
  );
}

// Observer: Read-only
if (role === 'observer') {
  return (
    <MyceliumGraph2D interactionMode="view-only" />
  );
}
```

---

#### 5. Blueprint Mode (Developer Debug)

**Add Toggle:**
```tsx
const [blueprintMode, setBlueprintMode] = useState(false);

return (
  <>
    {/* Top-right toggle */}
    <button
      onClick={() => setBlueprintMode(!blueprintMode)}
      className="absolute top-6 right-6 z-50"
    >
      <Layers className="w-4 h-4" />
      Blueprint: {blueprintMode ? 'ON' : 'OFF'}
    </button>

    {/* Show labels when active */}
    {blueprintMode && (
      <>
        <div className="absolute top-20 left-10 bg-blue-600/90 text-white text-xs px-2 py-1">
          MyceliumGraph2D - {graphStats?.fps} FPS
        </div>
        <div className="absolute top-20 right-10 bg-blue-600/90 text-white text-xs px-2 py-1">
          {snapshot.nodes.length} nodes · {snapshot.edges.length} edges
        </div>
        {/* More debug labels */}
      </>
    )}
  </>
);
```

**Shows:**
- Component boundaries
- Performance metrics (FPS)
- Node/edge counts
- Event flow visualization
- API call status

---

## 🚀 Môra OS - Complete Platform Vision

### Phase A: Foundation (Current) ✅

**Status:** 80% Complete
- [x] React 19 + Next.js 15 + TypeScript
- [x] TailwindCSS + Organic Design System
- [x] Core API Integration (JWT auth)
- [x] Real-time event system (polling)
- [x] Mycelium graph rendering
- [x] Antigravity UI components
- [ ] Fix Core API 403 ← BLOCKER
- [ ] Add node interactivity ← BLOCKER
- [ ] Fix loading states ← BLOCKER

---

### Phase B: Data Integration 🔄

#### 1. Filesystem Integration (70% done)

**Status:** Components built, needs Core endpoint

**What works:**
- Browser File System Access API
- Recursive directory scanning
- File metadata extraction
- Beautiful UI for file browser

**What's missing:**
- Core API endpoint: `POST /v1/objects/batch/from-filesystem`
- Auto-sync / file watcher
- Content extraction (text files → embeddings)

**Next Steps:**
1. Core implements batch import endpoint
2. UI sends file metadata to Core
3. Core creates objects in graph
4. Files appear in mycelium view

**Code:**
- ✅ `lib/filesystem/browser.ts` - FS Access API
- ✅ `lib/hooks/useFilesystem.ts` - React hook
- ✅ `components/filesystem/FilesystemBrowser.tsx` - UI
- ⏳ Core endpoint needed

---

#### 2. Notion Integration (0% done)

**Goal:** Sync Notion pages/databases into Môra graph

**Requirements:**
- Notion API OAuth flow
- Page content extraction
- Database schema mapping
- Bi-directional sync (optional)

**Core Endpoint Needed:**
```
POST /v1/objects/batch/from-notion
{
  "pages": [...],
  "databases": [...],
  "workspace_id": "..."
}
```

**UI Flow:**
1. User clicks "Connect Notion"
2. OAuth popup → Notion authorization
3. Select workspace, pages to sync
4. Background job syncs content
5. Pages appear in graph

**Next Steps:**
1. Notion API key setup
2. Core implements Notion client
3. UI OAuth flow
4. Background sync worker

---

#### 3. GitHub Integration (0% done)

**Goal:** Repos, issues, PRs in Môra graph

**What to sync:**
- Repositories (as nodes)
- Issues (linked to repos)
- Pull Requests (linked to files)
- Commits (timeline)
- Code files (filesystem-like)

**Core Endpoint Needed:**
```
POST /v1/objects/batch/from-github
{
  "repos": [...],
  "org": "...",
  "include_issues": true,
  "include_prs": true
}
```

---

#### 4. Email Integration (Future)

**Goal:** Gmail/Outlook threads in graph

**Challenges:**
- Privacy concerns (local-only?)
- OAuth complexity
- Volume (thousands of emails)
- Spam filtering

---

### Phase C: Multi-Space Platform 🌳

**Vision:** Môra as White-Label Platform (see VISION.md)

#### Key Concepts:

1. **Space Isolation:**
   - Each space = separate mycelium
   - Own data sources, branding, settings
   - No data leakage between spaces

2. **Space Creation:**
   ```tsx
   interface Space {
     id: string;
     name: string;
     icon: string; // Emoji or logo URL
     branding: {
       logo?: string;
       primaryColor: string;
       secondaryColor: string;
     };
     sources: SpaceSource[]; // Filesystem, Notion, GitHub, etc.
     members: SpaceMember[]; // Owner, collaborators, observers
   }
   ```

3. **Use Cases:**
   - **Freelancer:** Client A, Client B, Client C, Personal
   - **Team:** Product, Marketing, Engineering, Operations
   - **Enterprise:** Project Alpha, Project Beta, Company Docs
   - **Personal:** Work, Personal, Hobbies, Learning

4. **Routes:**
   ```
   /                    → Space selection
   /spaces/new          → Create space
   /spaces/{id}/field   → Space-isolated graph
   /spaces/{id}/folder  → Space-isolated folders
   /spaces/{id}/chat    → Space-isolated chat
   ```

**Implementation Status:**
- [x] TypeScript interfaces (`lib/types/space.ts`)
- [x] Zustand store (`store/spaces.ts`)
- [x] SpaceSwitcher component
- [ ] Space creation flow
- [ ] Space-scoped API calls
- [ ] Core: Space database schema

**Priority:** Medium (after Core API 403 fixed)

---

### Phase D: MCP Integration 🔌

**Vision:** Môra as MCP Server (see MCP_INTEGRATION_VISION.md)

#### Tier 1: Môra AS MCP Server

**Goal:** Other tools (Claude Code, Cursor) can use Môra's knowledge

**6 Core Tools to Expose:**
1. `mora_search_objects` - Semantic search
2. `mora_create_broadcast` - Connect ideas
3. `mora_find_duplicates` - Detect similar files
4. `mora_suggest_connections` - AI suggestions
5. `mora_analyze_resonance` - Relevance scoring
6. `mora_get_insights` - Extract insights

**Implementation:**
```json
// @saimor/mora-mcp-server
{
  "name": "@saimor/mora-mcp-server",
  "version": "0.1.0",
  "mcpServers": {
    "mora": {
      "command": "npx",
      "args": ["-y", "@saimor/mora-mcp-server"],
      "env": {
        "MORA_API_URL": "http://localhost:8081",
        "MORA_JWT_TOKEN": "..."
      }
    }
  }
}
```

**Next Steps:**
1. Create MCP server package
2. Implement 6 tools
3. Test with Claude Code
4. Publish to npm
5. Documentation

**Priority:** High (after Phase B)

---

#### Tier 2: Môra USES MCP Servers

**Goal:** Môra consumes external MCP servers (GitHub, Notion, etc.)

**Example:**
```tsx
// In Môra UI/Core
const githubMCP = new MCPClient('github');
const repos = await githubMCP.call('list_repos', { org: 'saimor' });

// Import into Môra graph
await createObjects(repos.map(repo => ({
  title: repo.name,
  source: { type: 'github', url: repo.html_url }
})));
```

**Benefit:**
- No custom integrations needed
- Use existing MCP ecosystem
- Future-proof (new sources via MCP)

**Priority:** Medium

---

#### Tier 3: Bidirectional MCP Mesh

**Goal:** Full MCP ecosystem integration

**Vision:**
```
Claude Code
    ↕ (MCP)
   Môra ←→ GitHub MCP
    ↕
 Cursor ←→ Notion MCP
    ↕
Obsidian
```

**Priority:** Low (future)

---

### Phase E: Intelligence & Search 🧠

#### 1. Semantic Search

**Goal:** Find objects by meaning, not just keywords

**Requirements:**
- Vector database (Qdrant, Pinecone, Weaviate, pgvector)
- Embedding generation (OpenAI, local model)
- Similarity search API

**Core Endpoint:**
```
POST /v1/search/semantic
{
  "query": "project documentation about authentication",
  "top_k": 10,
  "threshold": 0.7
}

Response:
{
  "results": [
    {
      "object_id": "obj_123",
      "title": "Auth System Design",
      "score": 0.92,
      "snippet": "..."
    }
  ]
}
```

**UI Integration:**
- Search bar in OrganicInput
- Results as highlighted nodes in graph
- Relevance shown as glow intensity

**Priority:** High

---

#### 2. RAG Chat (Context-Aware)

**Goal:** Chat with AI about your knowledge graph

**Flow:**
1. User asks: "What did I work on last week?"
2. System retrieves relevant objects (RAG)
3. LLM generates response with context
4. Response includes node links

**Core Endpoint:**
```
POST /v1/chat/completion
{
  "message": "What did I work on last week?",
  "context_size": 10,
  "include_sources": true
}

Response:
{
  "message": "Last week you worked on...",
  "sources": ["obj_123", "obj_456"],
  "tokens_used": 850
}
```

**UI:**
- Bottom chat bar (OrganicInput)
- Message history
- Source citations (clickable nodes)

**Priority:** High

---

#### 3. Auto-Tagging & Classification

**Goal:** AI suggests tags, categories for objects

**Example:**
```
File: "product_roadmap_2025.md"
→ AI suggests: #product, #roadmap, #2025, #planning
```

**Implementation:**
- Background job after object creation
- LLM analyzes content
- Suggests tags/categories
- User approves or edits

**Priority:** Medium

---

### Phase F: Performance & Scale ⚡

#### 1. Virtualization (10k+ Nodes)

**Problem:** Can't render 10k nodes in canvas

**Solution:**
- Only render visible nodes (viewport culling)
- LOD (Level of Detail): Far nodes = dots, close nodes = full
- Clustering: Group distant nodes into meta-nodes

**Libraries:**
- `react-window` / `react-virtualized`
- Custom viewport culling in canvas

**Priority:** Medium

---

#### 2. WebGL Rendering

**Problem:** Canvas 2D slow for complex graphs

**Solution:**
- Migrate to WebGL (Three.js, PixiJS)
- GPU-accelerated rendering
- Particle systems

**Trade-off:**
- More complex code
- Better performance
- Harder to debug

**Priority:** Low (only if needed)

---

#### 3. Progressive Loading

**Current:** Load all data at once
**Better:** Load in stages

```tsx
1. Load critical nodes (recent, starred)
2. Load first-degree connections
3. Load full graph in background
4. Stream updates via WebSocket
```

**Priority:** Medium

---

### Phase G: Advanced Features 🎯

#### 1. Keyboard Shortcuts (Vim Mode)

**Goal:** Power users never touch mouse

**Shortcuts:**
- `j/k` - Navigate nodes
- `/` - Search
- `o` - Open node details
- `c` - Create new object
- `gg/G` - Go to top/bottom
- `?` - Help overlay

**Implementation:**
- Global keyboard listener
- Modal stack (search, help, etc.)
- Vim-style command palette

**Priority:** Medium

---

#### 2. Export/Import

**Formats:**
- Markdown (entire graph as folder structure)
- JSON (raw data)
- PDF (visual snapshot)
- CSV (metadata)

**Use Cases:**
- Backup
- Migration
- Sharing
- Analysis

**Priority:** Low

---

#### 3. Collaboration (Real-Time)

**Goal:** Multiple users editing same space

**Requirements:**
- WebSocket for real-time updates
- Operational Transform or CRDT
- User presence indicators
- Conflict resolution

**Example:**
- User A edits node title
- User B sees update instantly
- Cursor positions shown
- Changes highlighted

**Priority:** Low (future)

---

#### 4. Mobile App

**Options:**
- PWA (Progressive Web App)
- React Native
- Capacitor

**Challenges:**
- Touch interactions (no hover)
- Smaller screen (different layouts)
- Offline support

**Priority:** Low

---

## 📋 Complete Priority Matrix

### 🔴 P0: CRITICAL (Do NOW)

1. **Fix Core API 403 Forbidden**
   - Debug JWT validation
   - Fix auth headers
   - Test all protected endpoints
   - **Time:** 1-2 hours
   - **Blocker:** Everything else

2. **Add Node Interactivity**
   - Click → Details panel
   - Hover → Highlight connections
   - Right-click → Context menu
   - **Time:** 3-4 hours
   - **Blocker:** User can't use UI

3. **Fix Loading States**
   - Add loading spinners
   - Error boundaries
   - Graceful fallbacks
   - **Time:** 2 hours
   - **Blocker:** UI seems broken

---

### 🟡 P1: HIGH (Do This Week)

4. **Mycelium Graph Visual Improvements**
   - Organic node shapes
   - Edge particle flow
   - Better clustering
   - **Time:** 1 day

5. **Bottom Chat Bar**
   - Move from sidebar to bottom
   - @ mention system
   - Voice input (optional)
   - **Time:** 4 hours

6. **Filesystem Sync to Core**
   - Core endpoint implementation
   - UI triggers sync
   - Files appear in graph
   - **Time:** 1 day (Core + UI)

7. **Semantic Search MVP**
   - Vector DB setup
   - Embedding generation
   - Search UI
   - **Time:** 2 days

---

### 🟢 P2: MEDIUM (Next 2 Weeks)

8. **Notion Integration**
   - OAuth flow
   - Page sync
   - Core endpoint
   - **Time:** 3 days

9. **Multi-Space System**
   - Space creation flow
   - Space switching
   - Space-scoped data
   - **Time:** 3 days

10. **MCP Server (Tier 1)**
    - 6 core tools
    - npm package
    - Documentation
    - **Time:** 4 days

11. **RAG Chat**
    - Context retrieval
    - LLM integration
    - Source citations
    - **Time:** 2 days

12. **Role-Based UI**
    - Owner/Collaborator/Observer views
    - Permission checks
    - **Time:** 2 days

---

### 🔵 P3: LOW (Future)

13. **GitHub Integration** - 3 days
14. **Email Integration** - 5 days
15. **Keyboard Shortcuts** - 2 days
16. **Export/Import** - 2 days
17. **Virtualization (10k nodes)** - 3 days
18. **WebGL Rendering** - 5 days
19. **Blueprint Mode** - 1 day
20. **Progressive Loading** - 2 days
21. **Real-Time Collaboration** - 2 weeks
22. **Mobile App** - 4 weeks

---

## 🛠️ Immediate Action Plan (Next 8 Hours)

### Hour 1-2: Fix Core API 403

**Gemini 3 Tasks:**
1. Test Core API directly:
   ```bash
   curl http://localhost:8081/v1/snapshots \
     -H "Authorization: Bearer $(cat .env.local | grep JWT_TOKEN | cut -d= -f2)"
   ```

2. Check Core logs for 403 reason

3. If JWT invalid:
   - Generate new JWT with correct claims
   - Update `.env.local`
   - Restart dev server

4. If permissions wrong:
   - Update Core API route guards
   - Ensure owner role has access

5. Test in UI:
   - Refresh `/organic` page
   - Check browser console
   - Verify real data loads

---

### Hour 3-4: Add Node Click Handlers

**File:** `components/canvas/MyceliumGraph2D.tsx`

**Tasks:**
1. Implement `handleNodeClick`:
   ```tsx
   function handleNodeClick(node: GraphNode, event: MouseEvent) {
     setSelectedNode(node);
     // Open NodeDetailsPanel
   }
   ```

2. Wire up to canvas click detection:
   ```tsx
   canvas.addEventListener('click', (e) => {
     const clickedNode = getNodeAtPosition(e.offsetX, e.offsetY);
     if (clickedNode) handleNodeClick(clickedNode, e);
   });
   ```

3. Show NodeDetailsPanel:
   ```tsx
   {selectedNode && (
     <NodeDetailsPanel
       node={selectedNode}
       onClose={() => setSelectedNode(null)}
     />
   )}
   ```

4. Add hover highlight:
   ```tsx
   function handleNodeHover(node: GraphNode | null) {
     setHoveredNode(node);
     // Render connected nodes with glow
   }
   ```

---

### Hour 5-6: Fix Loading States

**Files:**
- `components/canvas/OrganicField.tsx`
- `components/canvas/FieldMode.tsx`

**Tasks:**
1. Add loading view:
   ```tsx
   if (isLoading) {
     return (
       <div className="h-full flex flex-col items-center justify-center">
         <MoraOrb state="processing" scale={1.5} />
         <p className="mt-8 text-emerald-200 text-lg animate-pulse">
           Myzelium erwacht...
         </p>
       </div>
     );
   }
   ```

2. Add error view:
   ```tsx
   if (error) {
     return (
       <div className="h-full flex flex-col items-center justify-center">
         <div className="text-center max-w-md">
           <h2 className="text-2xl text-red-400 mb-4">
             Verbindung zum Kern fehlgeschlagen
           </h2>
           <p className="text-white/50 mb-6">{error.message}</p>
           <button
             onClick={() => window.location.reload()}
             className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-full"
           >
             Erneut versuchen
           </button>
         </div>
       </div>
     );
   }
   ```

3. Add error boundary:
   ```tsx
   <ErrorBoundary>
     <OrganicField />
   </ErrorBoundary>
   ```

4. Test all states:
   - Loading (delay API response)
   - Error (break API URL)
   - Success (normal flow)

---

### Hour 7-8: Test & Polish

**Tasks:**
1. **Full User Flow Test:**
   - Open `/organic`
   - Wait for data load (spinner should show)
   - Click a node (details panel opens)
   - Hover another node (connections highlight)
   - Check browser console (no errors)

2. **Performance Check:**
   - Open DevTools Performance tab
   - Record 10 seconds
   - Check FPS (should be ~60)
   - Check memory (shouldn't grow unbounded)

3. **Visual Polish:**
   - All transitions smooth (0.7s)
   - Colors consistent (mora-forest, mora-gold)
   - No flickering on load
   - Responsive (test mobile size)

4. **Document Changes:**
   - Update GEMINI_HANDOFF.md with progress
   - List remaining issues
   - Note any decisions made

---

## 📚 Key Files Reference

### Core Components
- `components/canvas/OrganicField.tsx` - Main organic view
- `components/canvas/MyceliumGraph2D.tsx` - Graph rendering (1100+ lines)
- `components/canvas/FieldMode.tsx` - Field mode wrapper
- `components/workspace/OrganicShell.tsx` - Layout shell

### Organic Components
- `components/organic/OrganicBackground.tsx` - Animated background
- `components/organic/MoraOrb.tsx` - Central breathing orb
- `components/organic/DataCluster.tsx` - Floating stats
- `components/organic/ConnectorNode.tsx` - Interactive node tiles
- `components/organic/OrganicInput.tsx` - Chat input bar
- `components/organic/NodeDetailsPanel.tsx` - Node details view
- `components/organic/SpaceSwitcher.tsx` - Space selector

### Hooks & State
- `lib/hooks/useRealtime.ts` - Real-time events
- `lib/hooks/useFilesystem.ts` - Filesystem access
- `lib/hooks/useSaimorCore.ts` - Core API polling
- `lib/hooks/useApi.ts` - API calls
- `store/spaces.ts` - Space state
- `store/session.ts` - Session state

### API & Config
- `lib/api.ts` - Core API client (AUTH HEADERS HERE)
- `lib/config.ts` - Environment config
- `lib/realtime.ts` - Real-time manager
- `lib/filesystem/browser.ts` - File System Access API

### Styles
- `tailwind.config.ts` - Design tokens
- `app/globals.css` - Global styles

### Documentation
- `GEMINI_HANDOFF.md` - Handoff for Gemini 2 (UI focus)
- `ANTIGRAVITY_INTEGRATION_PLAN.md` - Integration spec
- `VISION.md` - Multi-space platform vision
- `CORE_UPDATE_SESSION_8.md` - Recent updates
- `AGENT_ACCESS.md` - Public URLs & auth

---

## 🎯 Success Metrics

### Phase 0 (Critical) - Success When:
- ✅ Core API returns real data (no 403)
- ✅ Click node → Details panel opens
- ✅ Hover node → Connections light up
- ✅ Loading states always visible
- ✅ No blank screens
- ✅ 60fps animations

### Phase 1 (UI Polish) - Success When:
- ✅ Graph looks organic (not geometric)
- ✅ Particles flow along edges
- ✅ Bottom chat bar works
- ✅ @ mentions trigger actions
- ✅ Role-based views work
- ✅ Mobile responsive

### Phase 2 (Data) - Success When:
- ✅ Filesystem syncs to Core
- ✅ Files appear in graph
- ✅ Notion pages sync
- ✅ Real-time updates work
- ✅ Semantic search finds relevant nodes

### Phase 3 (Platform) - Success When:
- ✅ Multiple spaces created
- ✅ Space switching works
- ✅ Data isolated per space
- ✅ MCP server published
- ✅ External tools can use Môra

---

## 🤝 Questions for Team

1. **Core API 403:**
   - What's the JWT validation logic in Core?
   - Which role has access to `/v1/snapshots`?
   - Should we regenerate JWT?

2. **Architecture:**
   - Keep polling or switch to WebSocket?
   - Vector DB preference? (Qdrant, Pinecone, pgvector)
   - Should spaces be in frontend or backend DB?

3. **Priorities:**
   - Is MCP integration priority?
   - Should we do multi-space before or after data integrations?
   - Mobile app in roadmap?

4. **Design:**
   - How organic should graph be? (reference designs?)
   - Should we keep current color palette or adjust?
   - Any specific interaction patterns user wants?

---

## 🚀 Let's Ship This!

**Gemini 3, your mission:**

1. **TODAY (8 hours):**
   - Fix Core API 403 ✅
   - Add node interactivity ✅
   - Fix loading states ✅
   - Test everything ✅

2. **THIS WEEK:**
   - Mycelium visual improvements
   - Bottom chat bar
   - Filesystem sync
   - Semantic search MVP

3. **NEXT 2 WEEKS:**
   - Notion integration
   - Multi-space system
   - MCP server
   - RAG chat

**You got this!** 💪

Die Foundation ist solid, jetzt machen wir daraus ein richtiges OS. 🌿

---

**Status:** 🎯 Complete Roadmap
**Next:** Fix P0 blockers, then execute phase by phase
**Goal:** Production-ready Môra OS

🌿 **Das Myzelium wartet auf dich, Gemini 3!**
