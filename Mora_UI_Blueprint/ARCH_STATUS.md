# Architecture Status - 2025-11-20

## DONE
- **Shell**: `MoraShell` + `ViewPort` are active.
- **State**: `useMoraStore` handles `viewLevel` (core, department, space).
- **Layers**: 
    - `CoreLayer`: Connected to real API (`getDepartments`).
    - `DepartmentLayer`: Connected to real API (`getSpaces`).
    - `SpaceLayer`: Scaffolded with Visual/List mode toggle.
    - `FolderLayer`: Scaffolded.
- **Entry**: `app/home/page.tsx` is clean.
- **API**: `lib/api/core.ts` implemented.
- **UI**: `ChatDock` implemented and mounted in `MoraShell`.

## NEXT STEPS (Phase 4)
- **SpaceLayer**: Connect to `getTree` or specific space API to show actual folders/nodes.
- **FolderLayer**: Implement file browsing and content view.
- **ChatDock**: Connect to AI backend (streaming response).
- **Auth**: Implement real JWT handling in `lib/api/core.ts` (currently optional/placeholder).

## Legacy (DO NOT TOUCH)
- `app/home/page.legacy.tsx`
- `app/organic/`
- `components/organic/DashboardLayout.tsx`
