export interface Space {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    order: number;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface SpaceCreate {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    order?: number;
}

export interface SpaceUpdate {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    order?: number;
    is_default?: boolean;
}

export interface SpacesResponse {
    spaces: Space[];
    total: number;
}
