// lib/api/statsClient.ts
// System and department stats functions extracted from coreClient.ts.

import { coreGet, normalizeList } from './http';

export interface SystemStats {
    status: string;
    timestamp: string;
    metrics: {
        cpu: number;
        memory_usage: number;
        memory_available_mb: number;
        os: string;
        uptime_seconds: number;
    };
    intelligence: {
        mora_load: number;
        active_analysts: number;
        cognition_rate: string;
    };
    /** Bridge / knowledge graph counts (same truth as MCP get_stats) */
    bridge?: {
        departments: number;
        spaces: number;
        nodes: number;
        larry_nodes?: number;
    };
    /** Nightwatch graph nodes — open incident pressure */
    nightwatch?: {
        open_incidents: number;
        critical: number;
        monitors: number;
    };
    /** Larry dashboard deep links */
    dashboard?: {
        url: string;
        larry_url: string;
    };
}

export async function fetchSystemStats(): Promise<SystemStats | null> {
    // v3: envelope unwrap handled transparently in coreRequest()
    return coreGet('/v3/system/stats', { isOptional: true });
}

// ========== DEPARTMENT STATS (for Planet Hover) ==========

export interface DepartmentStats {
    department_id: string;
    department_name: string;
    spaces: number;
    folders: number;
    nodes: number;
    docs: number;
    by_type: Record<string, number>;
    health: number;
}

/**
 * Fetch stats for all departments in a company (batch)
 * Used by UniverseView for Planet hover data
 */
export async function fetchDepartmentStats(companyId?: string): Promise<DepartmentStats[]> {
    try {
        const query = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
        // v3: envelope unwrap handled transparently in coreRequest()
        const result = await coreGet(`/v3/stats/departments${query}`, { isOptional: true });
        return normalizeList<DepartmentStats>(result, ['departments']);
    } catch (error) {
        console.warn('[statsClient] fetchDepartmentStats failed:', error);
        return [];
    }
}

/**
 * Fetch stats for a single department (for lazy loading)
 */
export async function fetchSingleDepartmentStats(departmentId: string): Promise<DepartmentStats | null> {
    try {
        // v3: envelope unwrap handled transparently in coreRequest()
        return await coreGet(`/v3/stats/department/${departmentId}`, { isOptional: true });
    } catch (error) {
        console.warn('[statsClient] fetchSingleDepartmentStats failed:', error);
        return null;
    }
}
