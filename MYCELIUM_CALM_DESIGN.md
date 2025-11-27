# Mycelium 2.5D - Calm OS Implementation

**Status:** ✅ Phase 1-6 Complete
**Philosophy:** Living nervous system, not a lightshow

---

## 🎯 Problem Solved

**Before:** At 42 nodes, the Mycelium became a "neon hairball"
- Labels overlapped unreadably
- Lines dominated the view
- Everything pulsed at once (hyperactive)
- No way to focus on one node's context

**After:** Calm, scalable, focused
- Firefly Mode auto-engages (>20 nodes)
- Hover spotlight reveals local context
- Semantic clustering creates natural patterns
- Different connection types have visual language
- Idle state is a gentle breath (6bpm)

---

## 📊 The 6 Phases Implemented

### Phase 1: Firefly Mode & Label Management

**Behavior:**
- **n ≤ 20:** All labels visible (small gardens are chatty)
- **n > 20:** Labels hidden by default (fireflies, not billboards)
- **Hover:** Reveals label of hovered node + its neighbors

**Why:**
- Prevents text pollution
- Preserves starfield aesthetic
- Focus-on-demand (hover) vs always-on noise

**Code Location:** `OrganicSpore` component, `showLabel` logic

---

### Phase 2: Focus Mode (Attentional Spotlight)

**Behavior:**
When you hover a node:
1. Entire network dims to **20% opacity**
2. Hovered node stays at **100%**
3. Direct neighbors at **70%**
4. Their connections pulse gently

**Effect:**
- Instantly "see the story" around one node
- Even in 60-node view, clarity returns
- Mimics how a brain focuses attention

**Code Location:** `calculateOpacity()` in `OrganicSpore`, `globalDimmed` prop

---

### Phase 3: Semantic Clustering

**Behavior:**
Nodes don't scatter randomly. They cluster by type:
- **Documents:** Drift left
- **Notes:** Drift top
- **Intel Reports:** Drift right (golden zone)
- **Links:** Drift bottom
- **Tasks:** Top-right quadrant

**Why:**
- Creates readable patterns ("all docs are over there")
- Not perfect physics, but biased positioning
- Semantic structure becomes visible

**Code Location:** `applySemanticBias()` function

---

### Phase 4: Connection Visual Language

**Structural Connections** (same folder, parent-child):
- **Solid lines**
- **Thicker** (2px)
- **Higher opacity** (0.5)
- Represent hierarchy/structure

**Semantic Connections** (tags, author, type):
- **Dotted lines** (`strokeDasharray: "2 4"`)
- **Thinner** (1.2px)
- **Lower opacity** (0.3)
- **Flowing** (animated dash offset)
- Represent associations/meaning

**Why:**
- You can tell at a glance: Is this a "must connect" or "nice to know"?
- Prevents all connections looking the same

**Code Location:** `OrganicHypha` component, `strokeStyle` calculation

---

### Phase 5: Energy & Calmness Tuning

**Energy Levels Defined:**

| State | Duration | Opacity Range | When |
| :--- | :--- | :--- | :--- |
| **IDLE** | 10s (6bpm) | 0.1 → 0.18 | No interaction |
| **HOVER** | 2-3s | Local 1.0, global 0.2 | Mouse over node |
| **ACTIVE** | 2s | 0.5 → 0.7 | Node selected |
| **ALERT** | 0.5s flash | 0.8 spike | Intel-Report (rare) |

**Before/After:**
- **Before:** Everything pulsed fast (1-2s), global shimmer on every click
- **After:** Idle is a slow, meditative breath. Only local reactions.

**Code Location:** `IDLE_BREATH_DURATION` constant, animation transitions

---

### Phase 6: UX Notes & Docs

**Bottom-Left Overlay:**
```
Mycelium Network • 42 Nodes • 127 Links
🔦 Firefly Mode • Hover to focus
```

**Shows:**
- Node count (awareness of scale)
- Current mode (Firefly/Full)
- Interaction hint (not assumed knowledge)

**Code Location:** Bottom of `Mycelium25D`, UI overlay div

---

## 🎨 Visual Identity Preserved

**Branding Colors (Untouched):**
- Emerald (#10B981) - Primary organic
- Gold (#CEB676) - Môra intelligence
- Forest bg - Calm depth

**2.5D Maintained:**
- No Three.js/WebGL
- CSS transforms + parallax
- Glow via blur + drop-shadow
- Depth via z-position and scale

---

## 📈 Scalability Targets

| Node Count | Experience | Notes |
| :--- | :--- | :--- |
| **1-20** | Garden | Full labels, all visible |
| **21-40** | Fireflies | Orbs + hover labels |
| **41-60** | Cluster View | Semantic patterns clear |
| **60-100** | ⚠️ Warning | Consider LOD/pagination |
| **100+** | 🔴 Abstract | Heatmap mode needed |

**Current Implementation:**
- Handles 42 nodes gracefully ✅
- Focus Mode prevents "hairball" ✅
- Firefly Mode keeps it clean ✅

---

## 🔧 Configuration

**Thresholds (easily adjustable):**
```typescript
const FIREFLY_THRESHOLD = 20; // Nodes before Firefly Mode
const FOCUS_DIM_OPACITY = 0.2; // Background dim %
const NEIGHBOR_OPACITY = 0.7; // Neighbor visibility
const IDLE_BREATH_DURATION = 10; // seconds (6bpm)
```

**Toggle Firefly Off (if needed):**
```typescript
// In component, override:
const isFireflyMode = false; // Force full labels
```

---

## 🚀 Next Enhancements (Future)

1. **Zoom Levels:** Pinch to zoom reveals more detail
2. **Search Highlight:** Search term highlights matching nodes
3. **Timeline Mode:** Nodes arrange by creation date
4. **Heatmap Overlay:** Show activity/views via color intensity
5. **3D Rotation:** Gentle tilt on mouse move (optional)

---

## 🧪 Testing Recommendations

1. **Folder with 5 nodes:** Should feel spacious, all labels visible
2. **Folder with 25 nodes:** Firefly Mode engages, hover works
3. **Folder with 42 nodes:** Focus Mode prevents chaos
4. **Rapid hover:** Should feel responsive, not laggy
5. **Idle state:** Watch for 30s - should be calming, not annoying

---

**Status:** READY FOR DEMO
**Validated:** 42-node scenario transforms from hairball → calm network
**Philosophy:** "If it feels like a rave, it's not Môra"

---

Made with 🌿 for the Calm OS vision.
