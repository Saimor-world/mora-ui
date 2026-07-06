import { coreGet, normalizeList } from './http';

// Gewebe-Vokabular (spec: mora-work docs/specs/2026-07-06-das-gewebe.md); alte kinds als Fallback
export type LarryArtifactKind = 'thread' | 'knot' | 'spark' | 'pattern' | 'mission' | 'note' | 'canvas' | 'inbox' | 'brief';

export interface LarryArtifact {
    id: string;
    type: string;
    kind: LarryArtifactKind | string;
    form?: string | null;
    state?: string | null;
    agent?: string | null;
    preview?: string | null;
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
