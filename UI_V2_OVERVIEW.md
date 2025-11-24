# Môra-UI V2 Architecture Overview

## 1. Architecture Stack
- **Framework:** Next.js 14 (App Router)
- **State Management:** Zustand (`lib/store/moraState.ts`)
- **Styling:** Tailwind CSS + Custom "Organic" Design System
- **Animations:** Framer Motion
- **Icons:** Lucide React

## 2. Data Flow
The application follows a strict unidirectional data flow:
1.  **API Layer (`lib/api/coreClient.ts`):** Handles all HTTP communication with the Saimôr Core backend. It manages JWT authentication and error handling.
2.  **State Store (`lib/store/moraState.ts`):** Centralized store containing:
    -   **Data:** Departments, Spaces, Folders, Nodes.
    -   **UI State:** Active IDs, Loading flags, Errors.
    -   **Actions:** Async functions to fetch data and update state (e.g., `loadSpacesForDepartment`).
3.  **Components:** Subscribe to the store to display data and trigger actions.

## 3. Key API Endpoints (Saimôr Core V2)
The UI interacts with the following backend endpoints (proxied via `/api/core`):

### Read Operations
-   `GET /v1/departments`: Fetch all departments (Root level).
-   `GET /v1/spaces?department_id={id}`: Fetch spaces for a department.
-   `GET /v1/folders?space_id={id}`: Fetch folders for a space.
-   `GET /v1/nodes?folder_id={id}`: Fetch nodes for a folder.
-   `GET /v1/nodes/{id}`: Fetch detailed information for a specific node.

### Write Operations (Simplified Payloads)
The backend now handles ID and Slug generation.
-   `POST /v1/spaces`: `{ department_id, name, description? }`
-   `POST /v1/folders`: `{ space_id, name, color? }`
-   `POST /v1/nodes`: `{ folder_id, title, type, content?, url? }`

## 4. Component Hierarchy
-   **`CoreLayer`**: The root layout. Loads Departments. Displays the "Mora Orb".
-   **`DepartmentLayer`**: Displays Spaces for the selected Department.
-   **`SpaceLayer`**: Displays Folders in a "Galaxy View" (Visual) or List View.
-   **`FolderLayer`**: Displays Nodes in a Grid (Visual) or List View.
-   **`NodeDetailPanel`**: A slide-over panel showing details for the selected Node.
-   **`ChatDock`**: A persistent, context-aware AI assistant.

## 5. Development Setup
### Environment Variables (`.env.local`)
```bash
# Proxy configuration to bypass CORS
NEXT_PUBLIC_SAIMOR_CORE_URL=/api/core
```

### Next.js Proxy (`next.config.js`)
Requests to `/api/core/*` are rewritten to `http://localhost:8081/*`.

### Running the Dev Server
```bash
npm run dev -- -p 3003
```
Ensure the Saimôr Core backend is running on port 8081.
