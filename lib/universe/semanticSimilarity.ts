export type DepartmentMetricSet = {
    nodes: number;
    spaces: number;
    folders: number;
    health: number;
};

export type SemanticDriver = 'content' | 'structure' | 'health';

type SemanticDriverMeta = {
    label: string;
    accent: string;
    dashArray: string;
    reason: string;
};

const metricAffinity = (left: number, right: number) => {
    const baseline = Math.max(1, left, right);
    return Math.max(0, 1 - Math.abs(left - right) / baseline);
};

export const SEMANTIC_DRIVER_META: Record<SemanticDriver, SemanticDriverMeta> = {
    content: { label: 'Dokumente', accent: '#7dd3fc', dashArray: '0 0', reason: 'ähnliche Doc-Dichte' },
    structure: { label: 'Struktur', accent: '#c4b5fd', dashArray: '7 5', reason: 'vergleichbare Spaces und Folder' },
    health: { label: 'Health', accent: '#fbbf24', dashArray: '2 6', reason: 'ähnlicher Reifegrad' },
};

export const buildSemanticEdgeKey = (leftId: string, rightId: string) => [leftId, rightId].sort().join(':');

export const resolveDepartmentSimilarityProfile = (
    left: DepartmentMetricSet,
    right: DepartmentMetricSet
) => {
    const contributions: Record<SemanticDriver, number> = {
        content: metricAffinity(left.nodes, right.nodes) * 0.4,
        structure: metricAffinity(left.spaces, right.spaces) * 0.2 + metricAffinity(left.folders, right.folders) * 0.25,
        health: metricAffinity(left.health, right.health) * 0.15,
    };

    const dominantDriver = (Object.entries(contributions).sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])[0]?.[0] || 'content') as SemanticDriver;
    const semanticAffinity = contributions.content + contributions.structure + contributions.health;

    return {
        semanticAffinity,
        dominantDriver,
        contributions,
    };
};
