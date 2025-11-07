# 🍄 Môra UI - Demo Guide

**Status:** ✅ WORKING! Running on http://localhost:3001
**Date:** 2025-11-05
**API:** Core API @ http://localhost:8081

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Core API running on port 8081

### Setup & Run

```bash
# 1. Start Core API (in separate terminal)
cd C:/Users/mf4hr/saimor-core/core
python run.py
# ✅ Core API will run on http://localhost:8081

# 2. Start mora-ui Dev Server
cd C:/mora-ui
npm install  # First time only
npm run dev
# ✅ Dev Server will run on http://localhost:3001 (or 3000 if available)

# 3. Open Browser
# Navigate to: http://localhost:3001
```

---

## ✅ What's Working

### 1. **API Connection**
- ✅ Core API Health: `http://localhost:8081/v1/health`
- ✅ JWT Authentication: Token validated
- ✅ Endpoints responding:
  - `/v1/objects` - 7 mock objects
  - `/v1/relations` - Relational data
  - `/v1/snapshots` - 3 timeline snapshots (t0, t1, t2)

### 2. **Features Implemented (Phase 1-6)**

#### **Lens Panel (Left)**
- Mode switcher: Folder Mode ↔ Field Mode
- Filter controls
- Search functionality

#### **Canvas Panel (Center)**
- **Folder Mode:**
  - Tree View (hierarchical structure)
  - List View (flat list with details)
  - Context Panel (selected item details)

- **Field Mode (3D):**
  - 3D Graph visualization (React Three Fiber)
  - Timeline scrubber (t0 → t1 → t2)
  - OrbitControls (drag to rotate, scroll to zoom)
  - **🍄 Mycelium Network:**
    - Organic curved threads between nodes
    - Color-coded by relationship type:
      - 🔵 Blue = references
      - 🟢 Green = derives_from
      - 🟠 Orange = related_to
    - Animated pulsing (weight-based)
    - Pilz-Caps on hub nodes (3+ connections)
    - Broadcast Waves system

#### **Insights Panel (Right)**
- Real-time stats
- Connection count
- Relationship insights
- Live/Offline status indicator

### 3. **Workflow Runner**
- Framer Motion powered animations
- n8n webhook integration (ready)
- Run traces visualization

### 4. **Tech Stack**
- Next.js 15.5.6 + TypeScript
- React Query (TanStack Query v5.90.6)
- React Three Fiber (3D)
- Framer Motion (Animations)
- Zustand (State Management)
- Tailwind CSS + shadcn/ui

---

## 🎨 Visual Features Tour

### Field Mode (3D Mycelium Network)

**What to see:**
1. **Timeline** (bottom) - Drag slider to see network evolution:
   - t0: 3 nodes, 2 connections (Initial State)
   - t1: 5 nodes, 4 connections (Growth)
   - t2: 7 nodes, 6 connections (Expansion)

2. **Mycelium Threads:**
   - Organic curved paths (not straight lines!)
   - Color-coded relationships
   - Pulsing animation based on weight

3. **Hub Nodes (Pilz-Caps):**
   - Golden mushroom caps appear on nodes with 3+ connections
   - Indicates important "hub" objects

4. **Interactive:**
   - Drag to rotate camera
   - Scroll to zoom
   - Click nodes to select (shows in Context Panel)

### Folder Mode

**What to see:**
1. **Tree View:**
   - Hierarchical file/folder structure
   - Expand/collapse folders
   - Visual indicators for node types

2. **List View:**
   - Flat list with metadata
   - Tags displayed
   - Timestamp info

3. **Context Panel:**
   - Selected item details
   - Full metadata
   - Related items

---

## 🔧 Configuration

### Environment Variables (`.env.local`)

```env
# Core API Base URL
NEXT_PUBLIC_CORE_BASE_URL=http://localhost:8081

# JWT Token (valid for 1 year)
NEXT_PUBLIC_ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb3JhX3VpX3Rlc3QiLCJyb2xlIjoib3duZXIiLCJpc3MiOiJzYWltb3IubW9yYSIsImF1ZCI6InNhaW1vci5jbGllbnRzIiwiZXhwIjoxNzkzODE5MjE1LCJpYXQiOjE3NjIyODMyMTV9.kGb9WHIxsyFp4VPez-_PZmzZhYDSb5XgiZpszRPJg2w

# n8n Webhooks (configured, waiting for n8n setup)
NEXT_PUBLIC_N8N_EMAIL_DIGEST=https://voice.saimor.world/webhook/email-digest
NEXT_PUBLIC_N8N_BROADCAST_DOC=https://voice.saimor.world/webhook/broadcast-doc
NEXT_PUBLIC_N8N_DUPLICATE_HUNTER=https://voice.saimor.world/webhook/duplicate-hunter
```

---

## 🐛 Troubleshooting

### Port Already in Use

**Problem:** `Port 3000 is in use`

**Solution:** Next.js automatically uses next available port (3001, 3002, etc.)
```bash
# OR manually specify port:
npm run dev -- -p 3005
```

### Core API Not Responding

**Problem:** API calls fail with 401 Unauthorized

**Solution:**
1. Check Core API is running: `curl http://localhost:8081/v1/health`
2. Verify JWT token in `.env.local` matches Core API secret
3. Restart dev server after changing `.env.local`

### CORS Errors

**Problem:** Browser console shows CORS errors

**Solution:** Core API already configured for localhost:3000, 3001, 3004, 5173
- If using different port, update `core/app.py` allowed_origins

### 3D Scene Not Rendering

**Problem:** Field Mode shows blank screen

**Solution:**
1. Check browser console for WebGL errors
2. Ensure GPU acceleration enabled in browser
3. Try different browser (Chrome/Edge recommended)

---

## 📊 Performance Metrics

**Latest Build:**
- Bundle Size: 163 kB
- Build Time: ~20-30s
- Errors: 0
- Warnings: 0
- Dev Server Ready: ~18s

**Browser Compatibility:**
- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

---

## 🎯 Demo Checklist

When showing mora-ui to someone:

- [ ] Start Core API first (`python run.py`)
- [ ] Wait for "Application startup complete" message
- [ ] Start mora-ui dev server (`npm run dev`)
- [ ] Wait for "Ready in X.Xs" message
- [ ] Open browser to displayed URL (usually localhost:3001)
- [ ] Show **Folder Mode** first (easier to understand)
  - [ ] Tree View navigation
  - [ ] Item selection and context panel
- [ ] Switch to **Field Mode** (the wow factor!)
  - [ ] Drag timeline to show evolution
  - [ ] Rotate 3D view
  - [ ] Point out mycelium threads
  - [ ] Show hub nodes with Pilz-Caps
- [ ] Show **Insights Panel**
  - [ ] Live stats
  - [ ] Connection count
- [ ] Mention **Workflow Runner** (ready for n8n)

---

## 📝 Known Limitations

1. **Mock Data Only**
   - Currently using 7 static mock objects
   - 3 timeline snapshots hardcoded
   - Real data integration: Phase 7 (future)

2. **Workflow Runner**
   - n8n webhooks configured but not yet active
   - Waiting for n8n flow setup

3. **Performance**
   - 3D rendering can be heavy with 100+ nodes
   - Optimization needed for large datasets

---

## 🚀 Next Steps

**Phase 7 (Future):**
1. Real data integration (replace mock data)
2. n8n workflow activation
3. Performance optimization for large graphs
4. Search & filter in 3D view
5. Node clustering for dense networks
6. Export functionality (JSON, CSV)

---

## 📸 Screenshots Guide

**To create screenshots:**
1. Open mora-ui in browser (http://localhost:3001)
2. Press F12 for DevTools
3. Click "Toggle device toolbar" (Ctrl+Shift+M)
4. Set to 1920x1080 resolution
5. Take screenshots of:
   - Folder Mode (Tree View)
   - Folder Mode (List View + Context Panel)
   - Field Mode at t0 (Initial State)
   - Field Mode at t2 (Full Network)
   - Insights Panel (zoomed in)

**Screenshot locations:**
- Save to: `C:/mora-ui/docs/screenshots/`
- Naming: `mora-ui-[feature]-[date].png`

---

**Last Updated:** 2025-11-05
**Version:** MVP Phase 1-6
**Status:** ✅ Production Ready for Demo
