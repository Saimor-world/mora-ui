# Môra-UI V2 - Next Phase Implementation Plan (Updated)

**Status:** Tree-Sidebar ✅ Complete | Now focusing on polish & multi-org preparation

## Context
The V2 shell with TreeSidebar is approved and functional. This phase focuses on **polishing demo flows**, ensuring **state synchronization**, and preparing for **multi-organization support**.

---

## ✅ Completed Tasks (Phase B)

### Task 1: Tree-Sidebar Implementation ✅
- ✅ `fetchTree()` added to `lib/api/coreClient.ts`
- ✅ `CoreTreeNode` type added to `lib/types/core.ts`
- ✅ `moraState.ts` extended with tree state and actions
- ✅ `TreeSidebar.tsx` component created with:
  - Collapsible hierarchy (Department → Space → Folder → Node)
  - Active state highlighting
  - Click navigation
  - Smooth expand/collapse animations
- ✅ Layout integrated in `MoraShell.tsx`
- ✅ State synchronization: Tree updates on create operations via `loadTree()`

### Task 2.3: Breadcrumbs ✅
- ✅ `Breadcrumb.tsx` component created
- ✅ Integrated in `DepartmentLayer` and `SpaceLayer`
- ✅ Clickable navigation to parent levels

### Task 3: Basic Create-Flow Sync ✅
- ✅ Creating Space/Folder/Node calls `loadTree()` to refresh sidebar
- ✅ `ChatDock` is context-aware (shows current path)

---

## 🎯 Phase C: Polish & Preparation

### Task 1: Golden Path Definition & Polish

**Objective:** Define 2-3 demo flows through Alpha Centauri and polish all interaction states.

#### 1.1 Define Golden Paths
Define these paths in code (constants/config):

**Path 1: Data Analytics Flow**
```
ENGINEERING → Nebula Analytics → Data Models → [View Node]
```
- User flow: Core → Click "Nebula Analytics" → Click "Data Models" folder → Click a node
- Polish points: Smooth transitions, clear hover states, node preview

**Path 2: UI Component Documentation Flow**
```
ENGINEERING → Stellar UI → Components → [View Node]
```
- User flow: Core → Click "Stellar UI" → Click "Components" folder → View component doc
- Polish points: Icon consistency, folder colors, node type indicators

**Path 3: Creation Flow**
```
ENGINEERING → Alpha Centauri Core → [Create Folder] → [Create Node]
```
- User flow: Navigate to space → Click "NEW FOLDER" → Create → Click "ADD ITEM" → Create node
- Polish points: Success feedback, immediate tree update, smooth modal transitions

**Implementation:**
- [ ] Create `lib/config/demoFlows.ts` with path definitions
- [ ] Add optional "Demo Mode" indicator (subtle, bottom-right)
- [ ] Consider adding a "Take Tour" feature (future enhancement)

#### 1.2 State & Feedback Polish

**Loading States:**
- [ ] Ensure all layers show consistent spinner with contextual text
  - CoreLayer: "Loading departments..."
  - DepartmentLayer: "Loading spaces..."
  - SpaceLayer: "Loading folders..."
  - FolderLayer: "Loading nodes..."
  - TreeSidebar: "Loading organization tree..."

**Empty States:**
- [ ] Improve messaging with clearer CTAs:
  - SpaceLayer empty: "This space is empty. Create your first folder to organize your work."
  - FolderLayer empty: "No items yet. Add documents, notes, or links to get started."
- [ ] Add subtle icons to empty states (already using AlertCircle, FileText)

**Error States:**
- [ ] Standardize error UI across all layers
  - Show error message from `coreError` state
  - Include "Retry" button that calls the load function again
  - Consider: `components/ui/ErrorPanel.tsx` for consistency

**Success Feedback (Toast Notifications):**
- [ ] Install or create toast system (e.g., `sonner` or custom)
- [ ] Add toasts for:
  - "Space '{name}' created successfully!"
  - "Folder '{name}' created!"
  - "Item '{title}' added to folder"
- [ ] Position: Bottom-right, 3s auto-dismiss
- [ ] Style: Match mora aesthetic (glass panel, emerald accent)

**Implementation:**
- [ ] Install toast library: `npm install sonner`
- [ ] Create `lib/toast.ts` wrapper for consistent styling
- [ ] Update all create functions in `moraState.ts` to show toasts
- [ ] Add loading text to all spinner components

#### 1.3 Breadcrumb Extension
- [ ] Add breadcrumb to `FolderLayer` (currently missing)
  - `ROOT → Department → Space → Folder`
- [ ] Ensure breadcrumbs update immediately when navigation changes

---

### Task 2: Create-Flow State Synchronization Enhancement

**Objective:** Ensure creating items updates **all UI elements** immediately with proper feedback.

#### 2.1 Current State (What's Working)
- ✅ Creating Space/Folder/Node adds to local state
- ✅ `loadTree()` is called to refresh TreeSidebar
- ✅ ChatDock shows updated context

#### 2.2 Improvements Needed

**Optimistic Updates:**
- [ ] When creating Space/Folder/Node, add it to local state **immediately** (optimistic)
- [ ] If API call fails, remove it and show error toast
- [ ] This makes UI feel instant instead of waiting for tree refresh

**Tree Refresh Optimization:**
- [ ] Currently: `loadTree()` refetches entire tree (slow for large orgs)
- [ ] Better: Only expand/highlight the newly created item in tree
- [ ] Implementation: After create, call `toggleTreeNode(parentId)` to expand parent

**ChatDock Context Update:**
- [ ] Verify ChatDock context bar updates immediately when item is created
- [ ] Test: Create folder → ChatDock should show "ROOT / DEPT / SPACE / NEW_FOLDER"

**Visual Feedback:**
- [ ] Newly created items should briefly highlight/pulse in the list
- [ ] Consider: Add `animate-in` class to new items for 1-2 seconds

**Implementation:**
- [ ] Update `addSpace`, `addFolder`, `addNode` in `moraState.ts`:
  - Add item to local state immediately
  - Show success toast
  - Call `loadTree()` in background
  - Expand parent node in tree
- [ ] Add highlight animation to new items

---

### Task 3: Multi-Organization Configuration

**Objective:** Prepare UI to switch from Alpha Centauri to a real organization without code changes.

#### 3.1 Organization Config System

**Create `lib/config/org.ts`:**
```typescript
export interface OrgConfig {
  id: string;
  name: string;
  displayName: string;
  tenantId: string;
  theme?: {
    primary?: string;    // Default: emerald-400
    accent?: string;     // Default: mora-gold
    background?: string; // Default: mora-forest
  };
  branding?: {
    logo?: string;
    favicon?: string;
  };
}

export const ORGS: Record<string, OrgConfig> = {
  'alpha-centauri': {
    id: 'alpha-centauri',
    name: 'Alpha Centauri',
    displayName: 'Alpha Centauri Demo',
    tenantId: 'saimor',
    theme: {
      primary: '#10b981', // emerald
      accent: '#CEB676',  // mora-gold
    },
  },
  'olfas-tobi': {
    id: 'olfas-tobi',
    name: 'Olfas & Tobi',
    displayName: 'Olfas & Tobi Organization',
    tenantId: 'olfas_tobi',
    // Could override theme colors here
  },
  // Easy to add more orgs
};

export const getActiveOrg = (): OrgConfig => {
  const orgId = process.env.NEXT_PUBLIC_ORG_ID || 'alpha-centauri';
  return ORGS[orgId] || ORGS['alpha-centauri'];
};
```

**Tasks:**
- [ ] Create `lib/config/org.ts` with above structure
- [ ] Add to `.env.local`: `NEXT_PUBLIC_ORG_ID=alpha-centauri`
- [ ] Document in README how to switch organizations

#### 3.2 JWT/Tenant Integration
Currently JWT is hardcoded in `.env.local`. For multi-org:

**Option A: Manual JWT per Org (Simple)**
- [ ] Add `NEXT_PUBLIC_SAIMOR_CORE_JWT_ALPHA` to `.env.local`
- [ ] Add `NEXT_PUBLIC_SAIMOR_CORE_JWT_OLFAS` to `.env.local`
- [ ] Update `coreClient.ts` to read JWT based on active org:
  ```typescript
  const org = getActiveOrg();
  const jwtKey = `NEXT_PUBLIC_SAIMOR_CORE_JWT_${org.id.toUpperCase().replace('-', '_')}`;
  const jwt = process.env[jwtKey];
  ```

**Option B: Server-Side JWT Generation (Future)**
- Create `/api/auth/token` endpoint that generates JWT for org
- Client fetches token on load
- More complex, defer for now

**Tasks:**
- [ ] Implement Option A for now
- [ ] Test switching between `alpha-centauri` and `olfas-tobi` (after creating test org in Core)

#### 3.3 UI Customization Hooks
Allow orgs to customize branding:

- [ ] Update `MoraShell.tsx` to use `getActiveOrg().displayName`
- [ ] Add optional logo in top-left if `branding.logo` is set
- [ ] Apply theme colors if specified (use CSS variables)

**Example CSS Variables:**
```typescript
// In MoraShell.tsx
const org = getActiveOrg();
const themeVars = {
  '--color-primary': org.theme?.primary || '#10b981',
  '--color-accent': org.theme?.accent || '#CEB676',
};
```

**Tasks:**
- [ ] Add theme CSS variables to root element
- [ ] Test theme switching visually

---

### Task 4: Node Detail View Integration

**Objective:** Complete the node detail experience when clicking a node.

#### 4.1 Current State
- `NodeDetailPanel.tsx` exists but is not integrated
- Clicking a node in FolderLayer does nothing

#### 4.2 Implementation Plan

**State Management:**
- [ ] Add `activeNode: CoreNode | null` to moraState (already exists?)
- [ ] Add `setActiveNode(node)` action
- [ ] Add `closeNodeDetail()` action

**UI Integration:**
- [ ] Update `FolderLayer.tsx`:
  - Make node items clickable
  - On click: `setActiveNode(node)`
- [ ] Update `MoraShell.tsx`:
  - Conditionally render `NodeDetailPanel` when `activeNode` is set
  - Position: Slide in from right (full height)
- [ ] Polish `NodeDetailPanel.tsx`:
  - Show node title, type, content (markdown rendering?)
  - Show metadata (created_at, size, etc.)
  - Show "Edit" and "Delete" buttons (placeholder for now)
  - Show "Close" button that calls `closeNodeDetail()`

**Content Rendering:**
- [ ] If node.type === 'document' or 'note': Render `node.content` as markdown
- [ ] Install markdown renderer: `npm install react-markdown`
- [ ] Style markdown to match mora aesthetic

**Tasks:**
- [ ] Verify `activeNode` state exists in moraState
- [ ] Make nodes clickable in FolderLayer
- [ ] Integrate NodeDetailPanel in MoraShell
- [ ] Add markdown rendering for content
- [ ] Add close handler

---

## Implementation Order

**Week 1: Polish & Feedback**
1. ✅ Install toast library: `npm install sonner`
2. ✅ Add loading/empty/error state polish
3. ✅ Add success toasts to all create operations
4. ✅ Add breadcrumb to FolderLayer
5. ✅ Optimize create-flow synchronization

**Week 2: Node Detail & Multi-Org**
6. ✅ Integrate NodeDetailPanel
7. ✅ Add markdown rendering for node content
8. ✅ Create `lib/config/org.ts` and multi-org system
9. ✅ Test org switching
10. ✅ Document golden paths in `demoFlows.ts`

---

## Success Criteria

- [ ] All layers have consistent loading/empty/error states
- [ ] Creating Space/Folder/Node shows immediate feedback (toast + UI update)
- [ ] TreeSidebar updates instantly when items are created
- [ ] Clicking a node opens `NodeDetailPanel` with formatted content
- [ ] Markdown content renders beautifully in node detail view
- [ ] Switching `NEXT_PUBLIC_ORG_ID` in `.env.local` changes org context
- [ ] All 3 golden paths feel smooth and polished
- [ ] `npm run build` passes with no errors
- [ ] No console errors during normal operation

---

## Design Principles (Reiterated)

- **Calm & Consistent**: Extend existing aesthetic, no new paradigms
- **Depth over Complexity**: Subtle shadows, smooth transitions, clear affordances
- **Responsive Feedback**: Immediate visual confirmation for all actions
- **Accessibility**: Keyboard navigation, ARIA labels, focus states

---

## Technical Notes

### Toast Library Choice
**Recommended:** `sonner` by Emil Kowalski
- Lightweight, beautiful, accessible
- Matches our aesthetic (can be styled with Tailwind)
- `npm install sonner`

### Markdown Rendering
**Recommended:** `react-markdown` with `remark-gfm`
- Standard, well-maintained
- Supports GitHub Flavored Markdown
- `npm install react-markdown remark-gfm`

### State Update Pattern
When creating items, follow this pattern:
```typescript
addFolder: async (payload) => {
  const optimisticFolder = { id: 'temp-' + Date.now(), ...payload };

  // 1. Optimistic update
  set(state => ({
    foldersBySpace: {
      ...state.foldersBySpace,
      [payload.space_id]: [...(state.foldersBySpace[payload.space_id] || []), optimisticFolder]
    }
  }));

  try {
    // 2. API call
    const newFolder = await createFolder(payload);

    // 3. Replace optimistic with real
    set(state => ({
      foldersBySpace: {
        ...state.foldersBySpace,
        [payload.space_id]: state.foldersBySpace[payload.space_id].map(f =>
          f.id === optimisticFolder.id ? newFolder : f
        )
      }
    }));

    // 4. Show success
    toast.success(`Folder "${newFolder.name}" created!`);

    // 5. Refresh tree (background)
    get().loadTree();

  } catch (error) {
    // Rollback optimistic update
    set(state => ({
      foldersBySpace: {
        ...state.foldersBySpace,
        [payload.space_id]: state.foldersBySpace[payload.space_id].filter(f =>
          f.id !== optimisticFolder.id
        )
      }
    }));

    toast.error(`Failed to create folder: ${error.message}`);
    throw error;
  }
}
```

---

## Estimated Effort

- State & Feedback Polish: ~2 hours
- Create-Flow Optimization: ~1 hour
- Node Detail Integration: ~2 hours
- Multi-Org Config: ~1 hour
- Testing & Refinement: ~1 hour

**Total**: ~7 hours

---

## Questions for User

Before implementing, please confirm:

1. **Toast Position:** Bottom-right or top-right?
2. **Node Detail Panel:** Slide from right, or modal overlay?
3. **Multi-Org Priority:** Implement now or defer to Phase D?
4. **Golden Paths:** Should we add a "Demo Tour" feature, or just document them?

---

## Next Steps

Once approved, I will:
1. Install dependencies (sonner, react-markdown)
2. Implement state & feedback polish (Task 1)
3. Optimize create-flow synchronization (Task 2)
4. Integrate NodeDetailPanel (Task 4)
5. Add multi-org configuration (Task 3)
6. Test all golden paths
7. Create commit with full Phase C summary
8. Update INTEGRATION_STATUS.md

**Proceed with implementation?** 🚀
