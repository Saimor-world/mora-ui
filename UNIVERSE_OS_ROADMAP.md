# SAIMÔR UNIVERSE OS - Development Roadmap
> Generated: 2025-12-28
> Status: Active Development

## 🎯 Vision
A fully functional Universe OS for Small Teams and Companies. Not a Windows/Linux replacement, but a **collaborative intelligence workspace**.

---

## ✅ COMPLETED

### Phase A: Foundation
- [x] Auth System (JWT, Roles, Tenant Isolation)
- [x] Backend API (FastAPI, 29 endpoints)
- [x] Frontend Shell (Next.js, Pane System)
- [x] Orb & Planets UI (Department visualization)
- [x] Demo Mode (Isolated data, Simple Coffee Group)

### Phase B: Cognitive Evolution
- [x] LLM-Powered Thoughts (Gemini integration with fallback)
- [x] Rate Limiting for LLM calls
- [x] Intelligent heuristic fallback
- [x] Intent inference from signals

### Phase C: Resonance Room
- [x] Unified Mora dialogue interface created
- [x] Connected to Dock "Môra" button
- [x] Real-time thought stream integration
- [x] Letter-exchange style messaging

### Phase D: Spotlight Command Palette
- [x] Global Cmd+K / Ctrl+K shortcut
- [x] Fuzzy search across departments, spaces, companies
- [x] Quick actions (open panes, navigate)
- [x] Keyboard navigation (↑↓ Enter ESC)


---

## 🔴 HIGH PRIORITY BUGS

### 1. Demo Mode vs. Company View Inconsistency
**Problem:** Slight visual differences between Demo Mode and normal Company view
**Location:** `CompanyCoreView.tsx`, rendering logic
**Fix:** Unify rendering paths, ensure consistent styling regardless of mode

### 2. ~~Department → Folder Navigation Buggy~~ ✅ FIXED
**Problem:** Clicking on departments, then folders causes issues
**Location:** `SpacePane.tsx` - couldn't find space when opened via Pane
**Fix:** SpacePane now searches all departments + receives departmentId from pane data

### 3. ~~Duplicate/Multiple Windows Issue~~ ✅ VERIFIED
**Problem:** Some views or panes appear duplicated
**Status:** Already handled by `paneStore.addPane()` which checks for existing ID before creating.
**Fixed dead code:** Removed duplicate `case 'search'` in Dock.tsx that was blocking real implementation.



---

## 🟡 MEDIUM PRIORITY FEATURES

### 4. ~~Moons Feature (Important Nodes)~~ ✅ IMPLEMENTED
**Description:** Display "important/pinned nodes" as additional moons orbiting planets
**Implementation:** Extended `promotedMoons` in `CompanyCoreView.tsx` line ~945
**Criteria for moon promotion:**
- High connection count (original `MOON_PROMOTION_THRESHOLD`)
- Node types: `intel_report`, `important`, `alert`
- Node tags: `urgent`, `pinned`, `priority`, `important`, `starred`
- `metadata.is_pinned = true`


### 5. ~~Mora Indicator Consolidation~~ ✅ VERIFIED GOOD
**Current Architecture (verified as optimal):**
- `MoraIntelligenceBar`: Status bar with Orb + Cmd+K shortcut hint (shows only with panes)
- `MoraThoughtStream`: Subtle thought teaser (bottom-left, always visible)
- `ResonanceRoom`: Full dialogue interface (opened via Dock "Môra" button)
- `Spotlight`: Quick actions (Cmd+K global shortcut)
**Status:** No changes needed, architecture is clean and layered.


### 6. Unified File System
**Description:** A file system that varies based on Token/Account/Tenant/Role
**Current State:**
- ✅ `FinderPane.tsx` loads data based on `activeCompanyId`
- ✅ Quick-Access mode supports `departmentId` filtering
- ✅ Mock fallback for Demo mode
**Backend Required:**
- Storage isolation: Files stored with `tenant_id` in DB
- Upload endpoint: `POST /v1/files/upload` with tenant context
- Role-based visibility: Owner sees all, Member sees assigned
**Location:** `FinderPane.tsx`, `saimor-core/core/api/v1/endpoints/files.py`


---

## 🟢 UPCOMING FEATURES

### 7. Real Account Security
- Proper password hashing (already using passlib)
- Session management improvements
- Token refresh logic
- Multi-factor authentication (future)

### 8. Task/ToDo System
- Simple task pane
- Assignable to team members
- Integration with Nodes

### 9. Calendar Integration
- Google Calendar sync
- Event visualization in Universe
- Scheduling within Mora

### 10. Team Chat (Beyond Resonance Room)
- Team-to-team messaging
- Channel-based communication
- Threaded discussions

### 11. Quick Actions / Spotlight (Cmd+K)
- Global command palette
- Quick navigation
- Action shortcuts

### 12. Activity Feed
- Real-time universe activity
- Who did what, when
- Audit trail visualization

---

## 🔧 TECHNICAL DEBT

- [ ] Remove deprecated `ChatDock` component
- [ ] Consolidate Intelligence components
- [ ] Clear unused imports across codebase
- [ ] Add proper TypeScript types for all API responses
- [ ] Unit test coverage for critical paths

---

## 📝 NOTES

### Orb Position
The Mora Orb is positioned **bottom-right** (not center). This is intentional and documented in `MoraShell.tsx` line 170.

### LLM Configuration
To enable real LLM thoughts, add to `saimor-core/.env`:
```env
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-1.5-flash
```

---

*Last updated by Mora Autonomous Development*
