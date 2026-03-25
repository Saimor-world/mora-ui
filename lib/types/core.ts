// Company (Workspace) - Top level of the hierarchy
export interface CoreCompany {
    id: string;
    tenant_id: string;
    owner_id: string;
    name: string;
    slug: string;
    description?: string | null;
    logo_url?: string | null;
    settings?: Record<string, any> | null;
    is_demo: boolean;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface CoreDepartment {
    id: string;
    tenant_id: string;
    company_id?: string | null; // Link to parent company
    name: string;
    slug: string;
    icon?: string | null;
    color?: string | null;
    order: number;
    visibility?: 'public' | 'visible' | 'private';
    description?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface CoreSpace {
    id: string;
    tenant_id: string;
    department_id: string | null;
    name: string;
    slug: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    folder_count?: number;
    order: number;
    is_default: boolean;
    visibility?: 'public' | 'visible' | 'private';
    created_at?: string | null;
    updated_at?: string | null;
}

export interface CoreFolder {
    id: string;
    space_id: string;
    parent_folder_id?: string | null;
    name: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    order: number;
    parent_id?: string | null;
    node_count?: number;
    visibility?: 'public' | 'visible' | 'private';
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * Node-level visibility — who can read a specific document or note.
 *
 * This is SEPARATE from department/folder visibility (which controls whether
 * a space appears in the Universe at all). NodeVisibility controls access
 * to a single content item regardless of where it lives.
 *
 * - 'private'    → only the owner can read
 * - 'department' → all members of the owning department
 * - 'company'    → all authenticated company members
 * - 'public'     → anyone with the share link (no auth required)
 *
 * Default for new uploads: 'department'.
 * Null / missing: treat as 'company' for legacy nodes created before this field existed.
 */
export type NodeVisibility = 'private' | 'department' | 'company' | 'public';

export interface CoreNode {
    id: string;
    space_id: string;
    folder_id?: string | null;
    parent_id?: string | null;
    type: 'document' | 'task' | 'note' | 'link' | 'other';
    title?: string; // Optional, some endpoints return 'name' instead
    name?: string;  // Some endpoints return this instead of title
    content?: string | null;
    url?: string | null;
    metadata?: Record<string, any> | null;
    size?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
    /**
     * User ID of the original author (immutable after creation).
     * Exposed by NodeResponse where the backend can honestly derive it.
     * Primarily reliable on personal-scoped content surfaces.
     */
    author_id?: string | null;
    /**
     * User ID of the current owner. May differ from author_id if ownership was transferred.
     * Exposed by NodeResponse where the backend can honestly derive it.
     */
    owner_id?: string | null;
    /**
     * Who can read this node. See NodeVisibility.
     * Null = legacy content predating ownership tracking — treat as 'company'.
     * Only meaningful where the server exposes it (personal-scoped content today).
     */
    visibility?: NodeVisibility;
}

// Tree structure for hierarchical navigation
export interface CoreTreeNode {
    id: string;
    type: 'department' | 'space' | 'folder' | 'node';
    name: string;
    slug?: string;
    color?: string | null;
    icon?: string | null;
    children?: CoreTreeNode[];
    // Optional metadata for nodes
    nodeType?: 'document' | 'task' | 'note' | 'link' | 'other';
}

export interface ExplorerNavigationState {
    currentFolderId: string | null;
    backStack: Array<string | null>;
    forwardStack: Array<string | null>;
}
