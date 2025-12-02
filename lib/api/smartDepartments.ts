/**
 * Smart Department Creation Client
 */
import { corePost } from './coreClient';

export interface SmartDepartmentCreate {
    name: string;
    description?: string;
    tags?: string[];
    color?: string;
    icon?: string;
}

export interface RelatedDepartment {
    id: string;
    name: string;
    match_score: number;
    matched_tags: string[];
}

export interface SmartDepartmentResponse {
    id: string;
    name: string;
    slug: string;
    description?: string;
    tags: string[];
    related_departments: RelatedDepartment[];
    auto_connected: number;
}

export async function createSmartDepartment(
    data: SmartDepartmentCreate
): Promise<SmartDepartmentResponse> {
    return await corePost('/v1/smart-departments/smart-create', data);
}
