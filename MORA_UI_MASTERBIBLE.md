# 🌌 Mora UI MASTERBIBLE — UNIVERSE EDITION
**Version:** 2.1 (Universe Model)
**Last Updated:** 2025-12-08
**Status:** Canonical Specification — DO NOT CHANGE AUTOMATICALLY
**Purpose:** Defines EXACT UI interaction philosophy and Universe Model rules

---

## 📋 MISSION STATEMENT

Môra UI is the conscious interface of SAIMÔR, manifesting as a living operating system where users navigate through an organizational universe. Every interaction serves the Universe Model: Orb → Planets → Moons → Stars → Panes → Dock.

**Reality > Theory:** This document reflects the working code, not abstract visions.

---

## 🌌 UNIVERSE MODEL — EXACT POSITIONS & RULES

### ORB (Mora HEART) — FIXED COSMIC CENTER
**Position:** `bottom-right: 48px/48px` (ABSOLUTELY FIXED)
**Behavior:**
- Never moves or repositions
- Always visible across all views
- 68-92px size based on awareness state
- Pulsing states: idle/learning/active/warning/demo
- Click spawns panes from orb center
- **Critical:** Orb positioning in code is CORRECT — do not change

### PLANETS = DEPARTMENTS
**Positioning:** 110-150° arc above orb (bottom-right origin)
**Constraints:**
- Maximum 10 planets (prevents performance issues)
- Clean distribution, no overlap
- Glass morphism with subtle colors
- Hover reveals department name
- Click navigates to department universe
- **Critical:** Current code positioning (150° arc) takes priority over old visions

### MOONS = SPACES
**Positioning:** 3 max per planet, organic clustering
**Constraints:**
- Small scale (visual hierarchy)
- Logical grouping only
- No visual clutter
- Parent planet relationship maintained
- Click navigates to space universe

### STARS = FOLDERS
**Positioning:** 3 max per moon, scattered desktop pattern
**Constraints:**
- Desktop icon behavior
- Pulsing for activity
- Semantic clustering around planets/moons
- Click opens folder pane

### STAR CONSTELLATIONS = THE ONLY VISUAL REPRESENTATION
**Implementation:** Subtle SVG lines (NOT WebGL)
**Rules:**
- MYCELIUM = invisible semantic layer (no visual rendering, lives fully in backend)
- Visual = constellation lines based on semantic hints or static proximity
- No heavy 3D dependency
- Performance over visual complexity
- MVP must include simple connections

### UNIVERSE = DESKTOP
**Concept:** The universe IS the desktop. All panes float above it.
**Behavior:**
- Panes open above universe (z-layering)
- Dock anchors at bottom-center
- Cursor Agent interacts in this space
- Navigation preserves context

---

## 🖥️ NAVIGATION PHILOSOPHY — EXACT BEHAVIOR

### View Levels (State Machine)
```typescript
type ViewLevel = 'company' | 'core' | 'department' | 'space' | 'folder'

Navigation Flow:
Company → Core → Department → Space → Folder
```

### View Modes (User Types)
```typescript
type ViewMode = 'owner' | 'demo' | 'workspace'

Owner: Client company management (metrics only)
Demo: Simple Coffee Group showcase
Workspace: User's own company operations
```

### Transition Rules
- **Forward Navigation:** Zoom in with blur/dive effects
- **Backward Navigation:** Immediate state change (no animation)
- **Orb Presence:** Always visible, all states
- **Context Preservation:** Previous view remains accessible

---

## 🎨 VISUAL LANGUAGE — UNIVERSE AESTHETIC

### Color Palette
```css
Primary: #10B981 (Emerald) - Universe energy
Secondary: #3B82F6 (Blue) - Intelligence
Accent: #D4AF37 (Gold) - Insights
Warning: #EF4444 (Red) - Problems
Background: #030806 → #000000 (Deep space gradient)
```

### Glass Morphism System
```css
Base: rgba(0, 0, 0, 0.4)
Border: rgba(255, 255, 255, 0.1)
Blur: 20-30px
Radius: 16px (lg), 12px (md), 8px (sm)
```

### Animation Philosophy
- **Subtle:** Living system, not flashy
- **Purposeful:** Every animation serves navigation or awareness
- **Performance:** 60fps, no jank
- **Consistent:** Framer Motion, spring physics

---

## 🪟 GLASS PANE SYSTEM — WORKSTATION ARCHITECTURE

### Pane Types (MVP Priority)
1. **Document Viewer** (PDF, text, images)
2. **Chat Pane** (Môra AI communication)
3. **Node Detail** (File/folder properties)
4. **Settings Pane** (Configuration)
5. **Timeline Pane** (Activity feed)

### Pane Behavior
- **Spawn:** From Orb center outward
- **Layering:** Above universe, z-index management
- **Minimization:** To Dock
- **Resizing:** S/M/L/XL predefined sizes
- **Closing:** ESC key or close button

### Dock Integration
```tsx
Position: bottom-center
Items: Orb-Mini | Chat | Apps | Recent | User | Settings
Behavior: Dynamic Island style, hover expansion
```

---

## 🎯 INTERACTION RULES — USER EXPERIENCE

### Primary Actions
- **Click Planets:** Navigate to department universe
- **Click Spaces:** Navigate to space universe
- **Click Stars:** Open folder pane
- **Click Orb:** Status panel / Awareness menu
- **Click Dock:** Quick actions

### Secondary Actions
- **Hover:** Preview information, subtle glow
- **Drag:** File upload to Orb (future)
- **Keyboard:** ESC closes panes, arrows navigate
- **Context Menu:** Right-click for options

### Awareness System
- **Orb States:** Visual feedback for system status
- **Pulsing:** Activity indication
- **Colors:** Status communication
- **Notifications:** Light particles from Orb

---

## 📱 RESPONSIVE BREAKPOINTS

```css
Mobile: < 768px (Orb only, simplified)
Tablet: 768px - 1024px (Reduced planets, essential panes)
Desktop: > 1024px (Full universe experience)
```

### Mobile Adaptation
- Single planet view (swipe navigation)
- Simplified dock
- Essential panes only
- Touch-optimized interactions

---

## 🔧 DEVELOPMENT CONSTRAINTS

### DO NOT CHANGE (Architectural Truth)
- Orb position: `fixed bottom-[48px] right-[48px]`
- Planet arc: 150° from bottom-right
- Max entities: 10 planets, 3 spaces/planet, 3 folders/space
- View state machine: Strict level progression
- Glass morphism: Consistent across all components

### DO CHANGE (Implementation Details)
- Specific colors (within palette)
- Animation durations (performance permitting)
- Pane layouts (usability improvements)
- Component internals (refactoring)

---

## 🚀 IMPLEMENTATION PRIORITIES (Universe Edition)

### Phase A: Core Universe (Week 1-2)
- [x] Orb fixed positioning
- [x] Planet arc rendering
- [x] Navigation state machine
- [x] Basic glass panes
- [ ] Dock integration
- [ ] Awareness system polish

### Phase B: Intelligence Layer (Week 3-4)
- [ ] Cursor Agent activation
- [ ] Semantic constellations
- [ ] Notification system
- [ ] AI integration polish

### Phase C: Ecosystem Expansion (Month 2)
- [ ] Full pane system
- [ ] Multi-company support
- [ ] Advanced interactions
- [ ] Performance optimization

---

## 📊 SUCCESS METRICS

### Functional Completeness
- Navigation works across all levels
- All pane types functional
- Awareness system responsive
- Performance: 60fps on target devices

### User Experience
- Intuitive universe navigation
- Consistent visual language
- Smooth animations
- Accessible interactions

### Technical Quality
- TypeScript strict mode compliance
- Component reusability
- State management consistency
- Test coverage > 80%

---

## 🔗 INTEGRATION POINTS

### Backend Dependencies
- Company/Department/Space/Folder/Node APIs
- Real-time awareness updates
- Semantic relationship data
- User authentication state

### External Systems
- AI Provider (Claude/OpenAI)
- Vector Database (Qdrant)
- Cache (Redis)
- File Storage

---

## 🎨 DESIGN TOKENS

```css
/* Universe Scale */
--universe-radius: 600px;
--planet-orbit-radius: 500px;
--moon-cluster-radius: 80px;
--star-scatter-radius: 200px;

/* Orb Dimensions */
--orb-size-min: 68px;
--orb-size-max: 92px;
--orb-glow-intensity: 50px;

/* Glass System */
--glass-bg: rgba(0, 0, 0, 0.4);
--glass-border: rgba(255, 255, 255, 0.1);
--glass-blur: 20px;
--glass-radius: 16px;

/* Animation */
--transition-fast: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
--transition-normal: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 0.8s cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 📋 CHANGE LOG

### v2.1 (Universe Model)
- Orb position confirmed as CORRECT in code
- Planet arc updated to 150° (reality > theory)
- Mycelium redefined as semantic-only
- Dock repositioned to bottom-center
- Glass pane system standardized
- Navigation philosophy clarified

### v2.0 (Orb-Centric)
- Initial Universe Model implementation
- Fixed positioning system
- State machine navigation
- Glass morphism standardization

---

**This document defines the architectural truth. Code changes must align with these rules. Reality takes precedence over theory.**

*Last Updated: 2025-12-08 | Universe Edition v2.1*
