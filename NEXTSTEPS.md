# Next Steps

## 1. Environment Setup (CRITICAL)
To connect to the Saimôr Core backend, you must create a `.env.local` file in the root of the project (`c:\mora-ui\.env.local`).

Add the following variables:

```env
NEXT_PUBLIC_SAIMOR_CORE_URL=http://localhost:8081
NEXT_PUBLIC_SAIMOR_CORE_JWT=YOUR_DEV_JWT_HERE
```

*   **`NEXT_PUBLIC_SAIMOR_CORE_URL`**: The base URL of your local Saimôr Core backend.
*   **`NEXT_PUBLIC_SAIMOR_CORE_JWT`**: A valid JWT token for the `saimor` tenant. You can generate this using the `generate_test_token` script in the Core repo.

**Restart the dev server** after creating this file:
`npm run dev`

## 2. Verify Connection
1.  Open `http://localhost:3002`.
2.  You should see "CORE SYSTEM ONLINE".
3.  If you have departments in your Core database, they will appear as satellites around the central Orb.
4.  Clicking a department will take you to the Department Layer and load its spaces.

## 3. Troubleshooting
*   **"CONNECTION ERROR"**: Check the browser console. It likely means the JWT is missing or invalid (401/403), or the Core backend is not running.
*   **"NO DEPARTMENTS FOUND"**: The connection is working, but the database is empty.
*   **Fallback Token**: In development, if no JWT is provided, the app attempts to generate a "UI-System" fallback token. This requires the backend to accept the `system` role or `ui-system` subject (configured in Core).

## Phase 3: Interactive CRUD Operations ✅ COMPLETED
- [x] **Space Layer Visuals**: Implement "Galaxy View" with orbiting folder bubbles.
- [x] **Folder Layer Implementation**: Create `FolderLayer` with "Neural Network" visualization.
- [x] **Navigation Integration**: Connect `SpaceLayer` -> `FolderLayer` in `ViewPort` and `moraState`.
- [x] **Authentication Fix**: Resolve 401 errors by unifying API calls in `coreClient.ts`.
- [x] **Real Data Integration**: Connect all layers to real API data (Folders, Nodes).
- [x] **Create Spaces**: Add "CREATE SPACE" button in Department Layer with modal dialog.
- [x] **Create Folders**: Add "NEW FOLDER" button in Space Layer with color picker.
- [x] **Create Nodes**: Add "ADD ITEM" button in Folder Layer with type selector.
- [x] **Dynamic Labels**: Show actual names instead of UUIDs/placeholders in all headers.
- [x] **Improved Folder Labels**: Folder names always visible in Galaxy View (subtle opacity, brighten on hover).

### New Features Available
Users can now:
- **Create Spaces** directly in the UI (Department Layer)
- **Create Folders** with custom colors (Space Layer)
- **Add Items/Nodes** with different types: Note, Link, Document, Other (Folder Layer)
- All changes are immediately reflected without page refresh
- No need for terminal commands or seed scripts

## Phase 4: Content & Chat Integration
- [ ] **Node Viewer**: Implement detailed view for files/nodes (Markdown, Code, etc.).
- [ ] **Edit & Delete**: Add edit/delete functionality for Spaces, Folders, and Nodes.
- [ ] **Search**: Implement search across all content.
- [ ] **Chat Context**: Update ChatDock to be aware of the active layer and selection.
- [ ] **Orb Dynamics**: Enhance Mora Orb to reflect system state (listening, thinking, error).
- [ ] **Mycelium Connections**: Visualize relationships between nodes.
- [ ] **Semantic Indicators**: Show semantic awareness and context.

## 4. Architecture Notes
*   **Authentication**: `lib/api/coreClient.ts` handles JWT validation and automatic fallback generation (dev only).
*   **State**: `useMoraStore` handles all data fetching and CRUD operations (`loadDepartments`, `loadSpacesForDepartment`, `loadFoldersForSpace`, `loadNodesForFolder`, `addSpace`, `addFolder`, `addNode`).
*   **API**: `lib/api/coreClient.ts` manages the authenticated fetch calls (GET and POST).
*   **Legacy**: Do NOT use `app/home/page.legacy.tsx` or any files in `app/organic/`.
*   **Modals**: `components/ui/CreateModal.tsx` provides a reusable modal component for all create dialogs.
*   **Utilities**: `lib/utils/slug.ts` handles slug generation for spaces.
