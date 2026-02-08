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
    order: number;
    is_default: boolean;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface CoreFolder {
    id: string;
    space_id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    order: number;
    parent_id?: string | null;
    node_count?: number;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface CoreNode {
    id: string;
    space_id: string;
    folder_id?: string | null;
    type: 'document' | 'task' | 'note' | 'link' | 'other';
    title?: string; // Optional, some endpoints return 'name' instead
    name?: string;  // Some endpoints return this instead of title
    content?: string | null;
    url?: string | null;
    metadata?: Record<string, any> | null;
    size?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
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
