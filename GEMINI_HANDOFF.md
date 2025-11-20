# 🌿 Gemini Flash/Pro Handoff - Antigravity UI Development

**Date:** 2025-11-19
**From:** Claude (Code Preparation)
**To:** Gemini Flash/Pro (UI Development)
**Status:** ✅ Clean Build Ready

---

## 🎯 Your Mission

**Transform Môra UI into a beautiful organic experience using Antigravity components.**

Du bist gut in UI - hier ist alles vorbereitet:
- ✅ Build läuft ohne Errors
- ✅ Alle TypeScript Typen sauber
- ✅ Antigravity Components integriert
- ✅ `/organic` Route funktioniert

**Deine Aufgabe:** Mach die UI richtig schön und interaktiv!

---

## 📂 Project Structure

```
mora-ui/
├── components/
│   ├── organic/          ← Antigravity Components (DEIN PLAYGROUND)
│   │   ├── OrganicBackground.tsx   ✅ Animated spores/mycelium
│   │   ├── MoraOrb.tsx             ✅ Breathing heart orb
│   │   ├── DataCluster.tsx         ✅ Floating satellites
│   │   ├── ConnectorNode.tsx       ✅ Interactive nodes
│   │   ├── OrganicInput.tsx        ✅ @ Mention chat
│   │   ├── InsightCard.tsx         ✅ Event cards
│   │   ├── OrganicSidebar.tsx      ✅ 20px navigation
│   │   └── DashboardLayout.tsx     📦 Reference (not used)
│   ├── canvas/
│   │   ├── OrganicField.tsx        🎨 MAIN VIEW - Start here!
│   │   ├── HybridFieldMode.tsx     🌿 Mycelium graph view
│   │   └── MyceliumGraph2D.tsx     📊 3D-ish graph (optimize)
│   └── workspace/
│       └── OrganicShell.tsx        🏗️ Layout wrapper
├── app/
│   ├── organic/page.tsx            🚀 NEW ROUTE - Test here!
│   └── home/page.tsx               🏠 Original home
├── lib/
│   ├── api/                        📡 Core API integration
│   ├── hooks/                      🪝 React hooks
│   └── types.ts                    📝 TypeScript interfaces
└── ANTIGRAVITY_INTEGRATION_PLAN.md  📋 Full spec (629 lines)
```

---

## 🚀 Quick Start

### 1. Start Dev Server (if not running)
```bash
npm run dev  # Port 3005
```

### 2. Open Organic View
```
http://localhost:3005/organic
```

### 3. Open Home (for comparison)
```
http://localhost:3005/home
```

---

## 🎨 What's Already Built

### ✅ OrganicField.tsx (Main View)
**Location:** `components/canvas/OrganicField.tsx`

**What's there:**
- OrganicBackground (animated spores)
- MoraOrb (breathing center)
- DataClusters (4 floating satellites)
- ConnectorNodes (top 5 objects)
- Intelligence Panel (right side)
- OrganicInput (bottom chat)
- Blueprint Mode toggle (debug view)

**What needs work:**
1. **Interactivity:** Nodes should open details when clicked
2. **Animation:** Make transitions smoother
3. **Data:** Connect to real Môra data (Core API has 403 auth issue)
4. **Visual Polish:** Colors, spacing, glow effects
5. **Responsive:** Mobile/tablet layouts

### ✅ Components Ready to Use

#### OrganicBackground
```tsx
<OrganicBackground
  intensity={1.2}        // Particle density
  breathingSpeed={3300}  // Animation period
/>
```

#### MoraOrb
```tsx
<MoraOrb
  state="idle | speaking | processing | listening"
  scale={0.9}  // Size multiplier
/>
```

#### DataCluster
```tsx
<DataCluster
  top="15%"
  left="10%"
  label="42 Objects"
  icon={Database}
  delay={0}  // Stagger animation
/>
```

#### ConnectorNode
```tsx
<ConnectorNode
  icon={Layers}
  label="Project Alpha"
  isSelected={false}
  onSelect={() => handleClick()}
  delay={200}
  status="connected | idle"
/>
```

#### OrganicInput
```tsx
<OrganicInput
  onSend={(message) => console.log(message)}
/>
// Has @ mention system built-in
```

---

## 🔧 Current Issues to Fix

### 1. 🔴 Core API 403 Forbidden
**Problem:** `/v1/snapshots` and `/v1/mindloop` endpoints return 403
**File:** `lib/api.ts`
**Token:** JWT in `.env.local` is valid until 2025-01-20

**Quick Fix:**
```bash
# Check Core API is running
curl http://localhost:8081/v1/health

# Test snapshots endpoint
curl http://localhost:8081/v1/snapshots \
  -H "Authorization: Bearer eyJhbGciOiJI..."
```

**Where to look:**
- `lib/config.ts` - Token loading
- `lib/api.ts` - Auth headers
- Core API `/app.py` - JWT validation

### 2. 🟡 Mycelium Visualization
**User wants:** "nicht 3D 3D aber halt im myzell stil"
**Translation:** Not full 3D, but mycelium-style organic

**Current state:**
- `MyceliumGraph2D.tsx` - Works but basic
- Could be more organic/flowing

**Improvement ideas:**
- Nodes "breathe" individually
- Edges flow like nutrients
- Organic clustering algorithms
- Particle effects along edges

### 3. 🟡 Node Interaction Missing
**User wants:** "ich will sache oeffnewn , interagieren koennen"

**What to add:**
1. Click node → Detail panel opens
2. Hover node → Highlight connections
3. Drag nodes → Rearrange graph
4. Double-click → Deep dive into node
5. Right-click → Context menu

---

## 📋 Priority Tasks for Gemini

### Phase 1: Polish Existing UI (1-2 hours)

1. **OrganicField Visual Improvements**
   - [ ] Smooth transitions (all animations 0.7s)
   - [ ] Better color gradients (mora-forest, mora-gold)
   - [ ] Glow effects on interactive elements
   - [ ] Responsive breakpoints (mobile, tablet, desktop)

2. **ConnectorNodes Interactivity**
   - [ ] Click handler → Show node details
   - [ ] Hover effect → Scale + glow
   - [ ] Selected state → Different color/animation
   - [ ] Mycelium roots animation on click

3. **OrganicInput Enhancements**
   - [ ] @ mention autocomplete
   - [ ] Send animation (ripple effect)
   - [ ] Mic button → Voice input (optional)
   - [ ] Message history

### Phase 2: Data Integration (2-3 hours)

4. **Fix Core API Auth**
   - [ ] Debug 403 errors
   - [ ] Test with real snapshots data
   - [ ] Handle loading/error states gracefully
   - [ ] Add retry logic with exponential backoff

5. **Real-Time Updates**
   - [ ] MoraOrb state updates on AI activity
   - [ ] DataClusters refresh every 3s
   - [ ] Intelligence Panel shows live events
   - [ ] Toast notifications for important events

### Phase 3: Advanced Features (3-4 hours)

6. **Enhanced Mycelium Graph**
   - [ ] Organic layout algorithm
   - [ ] Animated particle flow along edges
   - [ ] Node breathing (individual periods)
   - [ ] Zoom/pan controls
   - [ ] Minimap navigator

7. **Space System Integration**
   - [ ] Space selector in OrganicSidebar
   - [ ] Space-filtered data views
   - [ ] Space branding (logo, colors)
   - [ ] Multi-space switching

---

## 🎯 Design Guidelines

### Color Palette (Môra Brand)
```css
--mora-forest: #0E1F18    /* Dark forest green */
--mora-gold: #CEB676      /* Warm gold */
--emerald-400: #34d399    /* Accent green */
--emerald-200: #a7f3d0    /* Light text */
```

### Animation Timing
- **Quick:** 0.3s (hover effects)
- **Standard:** 0.7s (transitions, movements)
- **Slow:** 2-3s (breathing, floating)
- **Very Slow:** 10-15s (background gradients)

### Spacing
- **Compact:** 4px, 8px (tight layouts)
- **Normal:** 12px, 16px, 24px (most UI)
- **Spacious:** 32px, 48px, 64px (major sections)

### Border Radius
- **Subtle:** 8px (cards, inputs)
- **Medium:** 16px, 20px (panels)
- **Rounded:** 24px, 32px (special elements)
- **Full:** 9999px (pills, buttons)

---

## 🐛 Known Warnings (Non-Critical)

These are okay to leave for now:

1. **HybridFieldMode.tsx:105** - `useEffect` missing dependency
   → React hooks warning, not breaking

2. **SpaceHeader.tsx:40** - Using `<img>` instead of `<Image>`
   → Next.js optimization warning

3. **next.config.js** - `allowedDevOrigins` unrecognized
   → Legacy config key, remove if needed

---

## 📚 Key Files to Read

### Must Read (Core Understanding)
1. `ANTIGRAVITY_INTEGRATION_PLAN.md` - Full integration spec
2. `components/canvas/OrganicField.tsx` - Main view code
3. `lib/types.ts` - All TypeScript interfaces
4. `lib/api.ts` - Core API client

### Reference (As Needed)
5. `VISION.md` - Multi-space platform vision
6. `CORE_UPDATE_SESSION_8.md` - Recent updates
7. `components/organic/*.tsx` - Individual components

---

## 💡 Tips for Gemini

### 1. Start Small
Don't rewrite everything - make **incremental improvements**:
- Fix one component at a time
- Test after each change
- Commit working code often

### 2. Use What's There
Antigravity components are solid - **enhance, don't replace**:
- Adjust props (intensity, scale, delay)
- Add CSS classes for styling
- Extend with new features

### 3. Keep It Organic
Môra is about **nature metaphors**:
- Mycelium = network connections
- Spores = data particles
- Roots = deep connections
- Breathing = alive system

### 4. Test in Browser
Always check visually:
```bash
# Open these tabs:
http://localhost:3005/organic        # Your work
http://localhost:3005/home           # Comparison
http://localhost:3005/field          # Mycelium graph
```

### 5. Ask If Stuck
User is responsive - **ask questions** if unclear:
- Design preferences
- Priority trade-offs
- Technical constraints

---

## 🚢 Deployment Notes

### Build Command
```bash
npm run build  # Must pass without errors
```

### Environment
```bash
# .env.local (already configured)
NEXT_PUBLIC_CORE_API_URL=http://localhost:8081
NEXT_PUBLIC_JWT_TOKEN=eyJhbGci...
NEXT_PUBLIC_ENABLE_SEMANTIC=true
NEXT_PUBLIC_ENABLE_DIAGNOSTICS=true
```

### Ports
- **3005:** Main dev server (current)
- **3002:** Alternate port (if needed)
- **8081:** Core API (backend)

---

## 🎨 Inspiration & References

### Similar UIs
- Notion's clean, organic interface
- Obsidian's graph view
- Roam Research's connections
- Apple's spatial computing design

### Organic Motion
- Wind rustling leaves (subtle sway)
- Water ripples (smooth expansion)
- Breathing (rhythm, alive feel)
- Bioluminescence (soft glow, pulse)

---

## ✅ Success Criteria

You'll know it's ready when:

1. ✅ **Build passes** - No TypeScript errors
2. ✅ **Looks organic** - Smooth animations, natural feel
3. ✅ **Interactive** - Nodes clickable, details open
4. ✅ **Data flows** - Core API connected (or graceful fallback)
5. ✅ **Responsive** - Works on mobile/tablet/desktop
6. ✅ **Fast** - No jank, 60fps animations

---

## 🤝 Handoff Checklist

- ✅ Build successful (no errors)
- ✅ All Antigravity components integrated
- ✅ `/organic` route functional
- ✅ TypeScript types aligned
- ✅ Documentation written
- ⏳ **Your turn!** → Make it beautiful

---

**Good luck, Gemini!** 🚀
The codebase is clean, the path is clear. Show us what you can do with UI!

**Questions?** Check:
- ANTIGRAVITY_INTEGRATION_PLAN.md (full spec)
- Ask the user directly
- Read component files for examples

🌿 **Das Myzelium wartet auf dich!**
