// lib/api/demoClient.ts
// Demo flow functions extracted from coreClient.ts.

import { coreGet, corePost } from './http';

export interface DemoInstanceState {
    tenant_id: string;
    has_data?: boolean;
    seed_type?: string;
    departments?: any[];
    files?: any[];
    spaces?: any[];
    folders?: any[];
    members?: any[];
}

export async function forceResetDemo(): Promise<any> {
    return corePost('/v1/demo/force-reset', {});
}

export async function fetchDemoInstance(): Promise<DemoInstanceState> {
    return coreGet('/v1/demo/current-instance');
}

export async function connectDemoSource(source = 'simple_coffee_group'): Promise<any> {
    return corePost('/v1/demo/connect-data-source', { source });
}
