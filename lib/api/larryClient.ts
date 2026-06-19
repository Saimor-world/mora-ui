import { coreGet, normalizeList } from './http';

export type LarryArtifactKind = 'mission' | 'note' | 'canvas' | 'inbox' | 'brief';

export interface LarryArtifact {
    id: string;
    type: string;
    kind: LarryArtifactKind | string;
    title: string;
    owner?: string | null;
    source_page?: string | null;
    external_id?: string | null;
    company_id?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
}

export async function fetchLarryArtifacts(
    companyId?: string | null,
    limit = 12,
): Promise<LarryArtifact[]> {
    const params = new URLSearchParams();
    if (companyId) params.set('company_id', companyId);
    params.set('limit', String(limit));
    const query = params.toString();
    const result = await coreGet(`/v3/larry/artifacts${query ? `?${query}` : ''}`, { isOptional: true });
    return normalizeList<LarryArtifact>(result);
}
