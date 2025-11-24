export interface CoreDepartment {
    id: string;
    tenant_id: string;
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
    parent_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface CoreNode {
    id: string;
    space_id: string;
    folder_id?: string | null;
    type: 'document' | 'task' | 'note' | 'link' | 'other';
    title: string;
    content?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}
