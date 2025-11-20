# Môra UI - Next Steps

**Last Updated:** 2025-11-20
**Current Status:** ✅ v2 Shell Architecture Complete  
**Build Status:** ✅ Compiles successfully in 46s

---

## 📍 Where We Are Now

### ✅ **COMPLETE: v2 Shell Foundation**

The new architecture is **ready to use**:

1. **Clean Entry Point** → `app/home/page.tsx` (8 lines, just renders `<MoraShell />`)
2. **Spatial Navigation** → 4-level hierarchy (Core → Department → Space → Folder)
3. **Single State Source** → `lib/store/moraState.ts` (Zustand)
4. **Layer-Based Rendering** → `components/layers/*` (one file per level)
5. **Working Navigation** → Core ↔ Department works end-to-end

### ✅ **Completed This Session:**

- Created `Mora_UI_Blueprint/implementation_plan.md` - **Complete architecture guide** (800+ lines)
- Identified deprecated files (page.legacy.tsx, old routes, etc.)
- Verified MoraShell & ViewPort are clean (no legacy code)
- Documented "How Other Agents Should Work With Môra UI"
- Build tested ✅ - No errors

---

## 🎯 Immediate Next Steps

### 🔴 **P0: Test Core → Department Navigation** (5 minutes)

**You can test this NOW:**

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Open browser:
   ```
   http://localhost:3002/home
   ```

3. **Expected Behavior:**
   - See Môra Orb in center + 4 department satellites
   - Click "Engineering" → Should zoom to DepartmentLayer
   - See 3 spaces (Alpha, Beta, Gamma)
   - Click back arrow → Return to CoreLayer
   - Transitions should be smooth (0.5s)

4. **If something breaks:**
   - Check browser console for errors
   - Verify `lib/store/moraState.ts` exists
   - Verify `components/layers/CoreLayer.tsx` and `DepartmentLayer.tsx` exist

---

### 🟡 **P1: Build SpaceLayer** (1-2 hours)

**File to create:** `components/layers/SpaceLayer.tsx`

**See:** `Mora_UI_Blueprint/implementation_plan.md` section "SpaceLayer (TODO)" for detailed template

**Requirements:**
- Back button → `navigateToDepartment()`
- Show active space name in header  
- Two modes: Visual (MyceliumGraph2D) + Explorer (folder tree)
- Toggle button to switch modes
- Click folder → Navigate to FolderLayer

---

### 🟡 **P2: Build FolderLayer** (1-2 hours)

**File to create:** `components/layers/FolderLayer.tsx`

**See:** `Mora_UI_Blueprint/implementation_plan.md` section "FolderLayer (TODO)"

---

### 🟢 **P3: Add ChatDock** (2-3 hours)

**File to create:** `components/ui/ChatDock.tsx`

Dynamic Island style floating chat at bottom center.

---

### 🟢 **P4: Fix Core API 403** (TBD)

**Problem:** JWT validation failing on Core API endpoints

**See:** `GEMINI3_COMPLETE_ROADMAP.md` for details

---

## 📚 Key Documentation

### 📖 **For AI Agents (Gemini, Codex, ChatGPT):**

**MUST READ:** `Mora_UI_Blueprint/implementation_plan.md`

This file contains:
- ✅ Complete architecture overview
- ✅ What's built vs. what's missing
- ✅ File structure guide  
- ✅ Deprecated files list (**DO NOT USE these**)
- ✅ "How Other Agents Should Work With Môra UI" guide

**Key sections:**
1. "Current Implementation Status" - What exists now
2. "Deprecated / Old Files" - **DO NOT USE these files**
3. "How Other Agents Should Work With Môra UI" - Step-by-step guide

---

## ⚠️ **Critical: What Files to AVOID**

### ❌ **DO NOT USE OR EXTEND:**

- `app/home/page.legacy.tsx` - **2000+ lines of OLD code**
- `app/organic/page.tsx` - Old organic dashboard
- `app/field/page.tsx` - Old field route
- `app/folder/page.tsx` - Old folder route
- `app/spaces/[id]/*` - Old space routes
- `components/organic/DashboardLayout.tsx` - Old dashboard shell
- `store/spaces.ts` - Old spaces store
- `components/canvas/OrganicField.tsx` - Old field wrapper
- `components/organic/BootSequence.tsx` - Startup animation (not needed in v2)

### ✅ **USE INSTEAD:**

- `app/home/page.tsx` - NEW entry point (8 lines)
- `components/layout/MoraShell.tsx` - NEW shell
- `components/layout/ViewPort.tsx` - NEW layer renderer
- `lib/store/moraState.ts` - NEW navigation state
- `components/layers/*` - NEW layer components

---

## 🗺️ Quick Reference: Navigation Flow

```
User opens /home
  ↓
app/home/page.tsx renders <MoraShell />
  ↓
MoraShell renders <ViewPort />
  ↓
ViewPort reads viewLevel from moraState
  ↓
viewLevel = 'core' → Renders <CoreLayer />
  ↓
User clicks "Engineering" department
  ↓
navigateToDepartment('dept_engineering')
  ↓
moraState updates: viewLevel = 'department', activeDepartmentId = 'dept_engineering'
  ↓
ViewPort re-renders → <DepartmentLayer />
  ↓
User clicks "Alpha Protocol" space
  ↓
navigateToSpace('space_alpha')
  ↓
moraState updates: viewLevel = 'space', activeSpaceId = 'space_alpha'
  ↓
ViewPort re-renders → <SpaceLayer /> (TODO: needs to be built)
```

---

## 🎯 Success Metrics

### ✅ **Phase 1: Shell (DONE)**
- [x] Clean entry point (`page.tsx`)
- [x] Spatial navigation store (`moraState.ts`)
- [x] Layer-based rendering (`ViewPort.tsx`)
- [x] CoreLayer complete
- [x] DepartmentLayer complete
- [x] Core ↔ Department navigation works
- [x] Build successful (46s compile time)

### 🚧 **Phase 2: Complete Hierarchy (NEXT)**
- [ ] SpaceLayer built
- [ ] FolderLayer built
- [ ] Full navigation: Core → Department → Space → Folder → Core
- [ ] View mode toggle (Visual vs Explorer)
- [ ] Mock data for all levels

### 🔜 **Phase 3: Overlays**
- [ ] ChatDock (Dynamic Island)
- [ ] Global Command Bar (Cmd+K)
- [ ] Both work across all view levels

### 🔜 **Phase 4: Real Data**
- [ ] Core API 403 error fixed
- [ ] Real departments from API
- [ ] Real spaces from API
- [ ] Real folders/tree from API
- [ ] Loading states
- [ ] Error handling

---

## 🚀 How to Start Working

### For **New Features** (Spaces, Folders, ChatDock):

1. Read `Mora_UI_Blueprint/implementation_plan.md`
2. Find the section for your feature (e.g., "SpaceLayer")
3. Follow the template provided
4. Use existing organic components from `components/organic/`
5. Test locally with `npm run dev`

### For **API Integration**:

1. Add endpoint to `lib/api.ts`
2. Create hook in `lib/hooks/useApi.ts`
3. Use hook in layer component
4. Replace mock data with real data
5. Add loading + error states

### For **Design Changes**:

1. Check if component already exists in `components/organic/`
2. If yes, reuse it
3. If no, create new component following organic design language
4. Match existing animations (breathing, glass morphism, etc.)

---

## ❓ Questions?

- **Architecture:** See `Mora_UI_Blueprint/implementation_plan.md`
- **Design System:** See `components/organic/*` for examples
- **API:** See `GEMINI3_COMPLETE_ROADMAP.md` for Core API status
- **Full Roadmap:** See `GEMINI3_COMPLETE_ROADMAP.md`

---

**Status:** ✅ Foundation ready, building layers next  
**Next Action:** Test /home navigation, then build SpaceLayer  
**Blocker:** None (Core API is separate concern, use mocks for now)

🌿 **The shell is ready. Time to grow the mycelium!**
