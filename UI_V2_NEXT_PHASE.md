# Môra-UI V2 - Next Phase Implementation Plan

## Context
The V2 shell is approved and functional. This phase focuses on enhancing the UI with a hierarchical sidebar, polishing demo flows, ensuring state synchronization, and preparing for multi-organization support.

## Phase Objectives
1. **Tree-Sidebar**: Render the full hierarchy in a persistent, collapsible sidebar
2. **Demo Flow Polish**: Define and refine 2-3 "golden paths" through Alpha Centauri data
3. **Create-Flow Synchronization**: Ensure all create operations update UI state consistently
4. **Multi-Org Preparation**: Add configuration hooks for switching organizations

---

## Task 1: Tree-Sidebar Implementation

### 1.1 Backend Integration
- [ ] Add `fetchTree()` to `lib/api/coreClient.ts`
  - `GET /v1/tree` returns full Department → Space → Folder → Node hierarchy
- [ ] Add `CoreTreeNode` type to `lib/types/core.ts`
  ```typescript
  interface CoreTreeNode {
    id: string;
    type: 'department' | 'space' | 'folder' | 'node';
    name: string;
    children?: CoreTreeNode[];
    // ... other fields
  }
  ```

### 1.2 State Management
- [ ] Extend `moraState.ts`:
  - Add `treeData: CoreTreeNode[] | null`
  - Add `isLoadingTree: boolean`
  - Add `loadTree()` action
  - Add `expandedTreeNodes: Set<string>` for collapse/expand state
  - Add `toggleTreeNode(id: string)` action

### 1.3 Component Creation
- [ ] Create `components/sidebar/TreeSidebar.tsx`
  - Collapsible sections (Department → Space → Folder → Node)
  - Active state highlighting (matches current `activeDepartmentId`, `activeSpaceId`, etc.)
  - Click navigation to any level
  - Smooth expand/collapse animations
  - Search/filter functionality (optional for now)

### 1.4 Layout Integration
- [ ] Update main layout to include sidebar
  - Left sidebar: `TreeSidebar` (280-320px, resizable?)
  - Main area: Current Layer views
  - Ensure responsive behavior (collapse on mobile)

### 1.5 State Synchronization
- [ ] When user clicks in `TreeSidebar`, update active IDs and navigate to correct layer
- [ ] When user navigates via main view, highlight correct node in `TreeSidebar`
- [ ] When tree data changes (create/delete), refresh `TreeSidebar`

---

## Task 2: Alpha Centauri Demo Flow Polish

### 2.1 Define Golden Paths
- [ ] **Path 1**: `ENGINEERING → Nebula Analytics → Data Models → [Node Detail]`
  - User starts at Department, clicks "Nebula Analytics", explores "Data Models" folder, opens a specific node
- [ ] **Path 2**: `ENGINEERING → Stellar UI → Components → [Node Detail]`
  - User navigates to "Stellar UI" space, browses "Components" folder, views component documentation
- [ ] **Path 3**: Create Flow: `ENGINEERING → Stellar UI → [Create Folder] → [Create Node]`
  - User creates a new folder in "Stellar UI", then adds a node to it

### 2.2 Micro-Copy & States
- [ ] **Loading States**: Ensure all layers show spinner with meaningful text
  - "Loading departments...", "Loading spaces...", etc.
- [ ] **Empty States**: Improve messaging
  - "This space is empty. Create your first folder to get started."
  - Add illustrations or icons
- [ ] **Error States**: User-friendly error messages
  - "Unable to load spaces. Please check your connection."
- [ ] **Success Feedback**: Toast notifications for create/update/delete
  - "Space created successfully!", "Node saved!"

### 2.3 Breadcrumbs & Navigation
- [ ] Add breadcrumb navigation to layer headers
  - `ENGINEERING / Nebula Analytics / Data Models`
  - Clickable to jump back to any level

---

## Task 3: Create-Flow State Synchronization

### 3.1 Space Creation
- [ ] When `addSpace()` succeeds:
  - Refresh `spacesByDepartment[departmentId]`
  - Refresh `treeData` (or append to tree)
  - Update `ChatDock` context
  - Show success toast

### 3.2 Folder Creation
- [ ] When `addFolder()` succeeds:
  - Refresh `foldersBySpace[spaceId]`
  - Refresh `treeData`
  - Update `ChatDock` context
  - Show success toast

### 3.3 Node Creation
- [ ] When `addNode()` succeeds:
  - Refresh `nodesByFolder[folderId]`
  - Refresh `treeData` (if tree includes nodes)
  - Update `ChatDock` context
  - Show success toast

### 3.4 ChatDock Context Updates
- [ ] Ensure `ChatDock` always shows:
  - Current Department, Space, Folder, Node path
  - Updates immediately when items are created

---

## Task 4: Multi-Organization Configuration

### 4.1 Config File
- [ ] Create `lib/config/org.ts`:
  ```typescript
  export interface OrgConfig {
    id: string;
    name: string;
    tenantId: string;
    theme?: 'emerald' | 'blue' | 'purple'; // Optional theme override
  }
  
  export const ORGS: Record<string, OrgConfig> = {
    'alpha-centauri': {
      id: 'alpha-centauri',
      name: 'Alpha Centauri',
      tenantId: 'tenant_saimor_001',
    },
    'olfas-tobi': {
      id: 'olfas-tobi',
      name: 'Olfas & Tobi',
      tenantId: 'tenant_olfas_001',
    },
  };
  
  export const getActiveOrg = (): OrgConfig => {
    const orgId = process.env.NEXT_PUBLIC_ORG_ID || 'alpha-centauri';
    return ORGS[orgId] || ORGS['alpha-centauri'];
  };
  ```

### 4.2 Environment Variable
- [ ] Add to `.env.local`:
  ```
  NEXT_PUBLIC_ORG_ID=alpha-centauri
  ```
- [ ] Document in `UI_V2_OVERVIEW.md` how to switch organizations

### 4.3 JWT/Tenant Integration
- [ ] Update `coreClient.ts` to use `getActiveOrg().tenantId` for JWT generation
- [ ] Ensure all API calls use the correct tenant context

---

## Implementation Order

1. **Tree-Sidebar** (Highest Priority)
   - Backend integration → State management → Component → Layout → Sync
   
2. **Create-Flow Sync** (High Priority)
   - Ensures UI feels responsive and consistent
   
3. **Demo Flow Polish** (Medium Priority)
   - Refine existing flows, add breadcrumbs, improve states
   
4. **Multi-Org Config** (Low Priority, but foundational)
   - Quick win that sets up for future scalability

---

## Success Criteria

- [ ] User can see the full tree hierarchy in the left sidebar
- [ ] Clicking any node in the tree navigates to the correct layer
- [ ] Creating a Space/Folder/Node updates both the tree and the current view
- [ ] 2-3 golden paths through Alpha Centauri feel smooth and polished
- [ ] Switching `NEXT_PUBLIC_ORG_ID` in `.env.local` changes the organization context
- [ ] No console errors, `npm run build` passes
- [ ] All layers have consistent loading/empty/error states

---

## Design Principles

- **Calm & Consistent**: No new visual paradigms, extend existing "liquid glass" aesthetic
- **Depth over Complexity**: Add subtle shadows, hover states, transitions—not new UI patterns
- **Interaction Polish**: Smooth animations, responsive feedback, clear affordances

---

## Estimated Effort

- Tree-Sidebar: ~2-3 hours
- Create-Flow Sync: ~1 hour
- Demo Flow Polish: ~1-2 hours
- Multi-Org Config: ~30 minutes

**Total**: ~5-7 hours

---

## Notes

- Keep the tree sidebar collapsible to maximize main view space
- Consider adding keyboard shortcuts (e.g., `Cmd+K` to open tree search)
- Breadcrumbs should match the tree structure exactly
- Toast notifications should be subtle and auto-dismiss (3-5 seconds)
