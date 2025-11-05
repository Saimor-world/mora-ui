# Môra UI - Project Status

**Last Update:** 2025-11-04 12:05
**Session:** Initial Setup Complete
**Status:** 🟢 Phase 1 Complete - Ready for Phase 2

---

## ✅ Completed (Phase 1)

### 1. Project Foundation
- ✅ Next.js 15.5.6 + TypeScript + Tailwind CSS
- ✅ shadcn/ui components system setup
- ✅ ESLint configuration
- ✅ Git ignore + environment config

### 2. 3-Column Layout
- ✅ **Lens (Left Panel):**
  - Mode Switcher (Folder ↔ Field)
  - Spaces Navigation (Home, Work, Projects)
  - Recent files list
  - Footer with version info

- ✅ **Canvas (Center Panel):**
  - Folder Mode implementation
  - Tree View (hierarchical with expand/collapse)
  - List View (flat with sorting by name/modified)
  - Toolbar with view switcher

- ✅ **Insights (Right Panel):**
  - Context Panel (object details)
  - Workflow Traces section (placeholder)
  - Broadcast Inbox section (placeholder)
  - Footer stats (objects/relations count)

### 3. API Integration
- ✅ API Client (`lib/api.ts`) with:
  - Auth interceptor (Bearer Token)
  - CORE_BASE_URL: `https://voice.saimor.world`
  - Expected endpoints: `/objects`, `/relations`, `/snapshots`, `/broadcast`
  - Fallback to Dashboard endpoints

- ✅ TypeScript DTOs (`lib/types.ts`):
  - `MoraObject`, `Relation`, `Snapshot`, `Insight`, `RunTrace`
  - `Space`, `Department`

### 4. Mock Data
- ✅ Tree View: 2 Spaces, 2 Departments, 2 Projects, 4 Objects
- ✅ List View: 6 Objects with paths and timestamps
- ✅ Selection state management (highlighted items)

### 5. Design System
- ✅ Dark theme with gold primary (#F5B800)
- ✅ Green-tinted background (hsl(160, 50%, 7%))
- ✅ CSS variables for consistent theming
- ✅ Responsive hover states and transitions

---

## 📦 Project Structure

```
mora-ui/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home (3-column layout)
│   └── globals.css         # Tailwind + CSS variables
├── components/
│   ├── lens/
│   │   └── Lens.tsx        # Left panel with mode switcher
│   ├── canvas/
│   │   ├── Canvas.tsx      # Center panel wrapper
│   │   ├── FolderMode.tsx  # Folder Mode container
│   │   └── FolderMode/
│   │       ├── TreeView.tsx   # Hierarchical tree
│   │       └── ListView.tsx   # Flat file list
│   └── insights/
│       ├── Insights.tsx       # Right panel wrapper
│       └── ContextPanel.tsx   # Object details display
├── lib/
│   ├── api.ts              # API client with auth
│   ├── types.ts            # TypeScript interfaces
│   └── utils.ts            # cn() utility
├── .env.local              # Environment variables
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
└── tailwind.config.ts      # Tailwind + shadcn/ui config
```

---

## 🚀 Running the Project

```bash
# Install dependencies (already done)
npm install

# Start dev server
npm run dev
# → http://localhost:3001 (port 3000 was in use)

# Production build
npm run build
npm start
```

---

## 🎯 Next Steps (Phase 2)

### 1. Field Mode v0.1 (Priority: High)
- [ ] Install React Three Fiber (`@react-three/fiber`, `@react-three/drei`)
- [ ] Create `components/canvas/FieldMode/Scene.tsx`
- [ ] Implement simple nodes/edges rendering
- [ ] Add Timeline Slider (t0, t1, t2 snapshots)
- [ ] Node interactions (hover, click)

### 2. Workflow Runner v0.1 (Priority: Medium)
- [ ] Create `components/insights/WorkflowRunner.tsx`
- [ ] Flow selector dropdown (n8n flows)
- [ ] Trigger button + parameter inputs
- [ ] RunTrace visualizer (steps with status)
- [ ] Integration with `N8N_WEBHOOK_URL`

### 3. Broadcast v0.1 (Priority: Medium)
- [ ] Create `components/insights/BroadcastInbox.tsx`
- [ ] ReferencePin component (timeline markers)
- [ ] PilzCap indicators on objects
- [ ] Broadcast message list
- [ ] POST to `/broadcast` endpoint

### 4. Real API Integration (Priority: Low - depends on Backend)
- [ ] Connect to Core API once endpoints are ready
- [ ] Replace mock data with real API calls
- [ ] Handle loading/error states
- [ ] Add React Query for data fetching

---

## 🔗 Integration Points

### CORE API (Backend-Claude #1 / #3)
**Base URL:** `https://voice.saimor.world`
**Auth:** Bearer Token (from Dashboard)

**Expected Endpoints (TBD):**
- `GET /objects` - List objects
- `GET /objects/:id` - Get object details
- `GET /relations?sourceId=` - Get relations
- `GET /snapshots?ts=t0,t1,t2` - Get timeline snapshots
- `POST /broadcast` - Create broadcast
- `GET /email/threads` - Get email threads

**Already Available:**
- `GET /api/dashboard/data` - Dashboard data
- `GET /api/dashboard/memory/facts` - Memory facts (can be used as objects)

### n8n Webhooks (TBD)
**Base URL:** `https://n8n.voice.saimor.world`

**Expected Flows:**
1. `/webhook/email-digest` - POST {startTs, endTs, spaceId?}
2. `/webhook/broadcast-doc` - POST {sourceId, targetIds[], message}
3. `/webhook/duplicate-hunter` - POST {spaceId, threshold?}

---

## 📊 Build Stats

**Latest Build:**
```
Route (app)                                 Size  First Load JS
┌ ○ /                                    1.36 kB         103 kB
└ ○ /_not-found                            993 B         103 kB
+ First Load JS shared by all             102 kB
```

**Dependencies:**
- react: ^18.3.1
- next: ^15.0.3
- tailwindcss: ^3.4.15
- typescript: ^5.6.3
- clsx + tailwind-merge (for cn() utility)
- lucide-react (icons, not yet used)

---

## 🐛 Known Issues / Todos

1. **CORS:** Backend needs to add `localhost:3001` (not 3000!) to allowed origins
2. **Auth Token:** Currently using .env.local placeholder - needs real token from Dashboard
3. **Mode Switching:** Lens mode switcher doesn't actually switch Canvas content yet (needs state management)
4. **Context Panel:** Not connected to Tree/List selection yet (needs shared state)
5. **No Loading States:** All views are static, no loading/error handling

---

## 📝 Notes for Backend Team

### CORS Configuration Needed
```python
# Backend: Add to CORS allowed origins
CORS_ORIGINS = [
    "http://localhost:3001",  # mora-ui dev server (NOT 3000!)
    "http://localhost:3000",  # fallback
    # ... production domains
]
```

### Endpoint Priority
1. **High:** `/objects`, `/relations` - needed for Folder Mode real data
2. **Medium:** `/snapshots` - needed for Field Mode Timeline
3. **Low:** `/broadcast`, `/email/threads` - can use mock data for now

---

## 🎉 Session Summary

**Time:** ~30 minutes
**Lines of Code:** ~800 lines (configs + components)
**Components Created:** 8 (Lens, Canvas, Insights, FolderMode, TreeView, ListView, ContextPanel)
**API Client:** Ready with auth + DTOs
**Build Status:** ✅ Successful production build
**Dev Server:** ✅ Running on http://localhost:3001

**Next Session:** Field Mode v0.1 with React Three Fiber 🌐

---

**Môra UI - Dual Mode Vision** 🚀
