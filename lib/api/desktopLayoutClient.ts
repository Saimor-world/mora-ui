// lib/api/desktopLayoutClient.ts
// Server-persisted widget desktop layouts (user + company scoped).

import { coreGet, corePut, CoreError } from './http';
import type { WidgetInstance } from '@/lib/widgets/types';

export interface DesktopLayoutsPayload {
    universe: WidgetInstance[];
    department: WidgetInstance[];
    departments: Record<string, WidgetInstance[]>;
}

export interface DesktopLayoutsResponse {
    company_id: string;
    layouts: Partial<DesktopLayoutsPayload>;
    updated_at: string | null;
}

export interface DesktopLayoutsConflictDetail {
    message?: string;
    company_id?: string;
    layouts?: Partial<DesktopLayoutsPayload>;
    updated_at?: string | null;
}

export async function fetchDesktopLayouts(companyId: string): Promise<DesktopLayoutsResponse | null> {
    if (!companyId) return null;
    const qs = new URLSearchParams({ company_id: companyId });
    return coreGet(`/v3/users/me/desktop-layouts?${qs.toString()}`, { isOptional: true });
}

export async function saveDesktopLayouts(
    companyId: string,
    layouts: DesktopLayoutsPayload,
    expectedUpdatedAt?: string | null,
): Promise<DesktopLayoutsResponse> {
    const qs = new URLSearchParams({ company_id: companyId });
    return corePut(`/v3/users/me/desktop-layouts?${qs.toString()}`, {
        layouts,
        expected_updated_at: expectedUpdatedAt ?? undefined,
    });
}

export function isDesktopLayoutConflict(err: unknown): err is CoreError {
    return err instanceof CoreError && err.status === 409;
}

export function conflictDetail(err: CoreError): DesktopLayoutsConflictDetail | null {
    if (err.status !== 409) return null;
    const detail = err.details;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
        return detail as DesktopLayoutsConflictDetail;
    }
    return null;
}
