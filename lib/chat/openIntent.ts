import type { OpenIntentResolution, OpenIntentCandidate } from '@/lib/api/coreClient';
import type { OpenableSearchResult } from '@/lib/utils/searchOpen';
import type { CommandReceiptChip } from '@/components/ui/CommandReceipt';

const DIRECT_OPEN_PREFIX = /^(?:zeige\s+mir|zeig\s+mir|show\s+me|go\s+to|geh\s+zu|suche\s+nach|search\s+for|suche\s+mir|find\s+me|zeige|zeig|show|oeffne|öffne|open|finde|find|suche|such|search)\s*/i;
const TRAILING_ENTITY_KIND = /\s+(?:dokumente?|documents?|dateien?|files?|ordner|folders?)$/i;

export interface DepartmentIntentTarget {
    id: string;
    name: string;
}

export function extractDirectOpenTarget(input: string): string | null {
    const trimmed = input.trim();
    if (!DIRECT_OPEN_PREFIX.test(trimmed)) return null;

    const target = trimmed
        .replace(DIRECT_OPEN_PREFIX, '')
        .replace(TRAILING_ENTITY_KIND, '')
        .trim();

    return target || null;
}

function normalizeIntentValue(input: string): string {
    return input
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ß/g, 'ss')
        .toLowerCase()
        .replace(/^(?:die|der|das|den|dem|zu|zur|zum)\s+/, '')
        .replace(/[^a-z0-9]/g, '');
}

function levenshteinDistance(left: string, right: string): number {
    if (left === right) return 0;
    if (!left.length) return right.length;
    if (!right.length) return left.length;

    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    const current = new Array<number>(right.length + 1);

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        current[0] = leftIndex;
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
            current[rightIndex] = Math.min(
                current[rightIndex - 1] + 1,
                previous[rightIndex] + 1,
                previous[rightIndex - 1] + substitutionCost,
            );
        }
        for (let index = 0; index <= right.length; index += 1) {
            previous[index] = current[index];
        }
    }

    return previous[right.length];
}

export function findDepartmentIntentMatch<T extends DepartmentIntentTarget>(
    query: string,
    departments: readonly T[],
): T | null {
    const normalizedQuery = normalizeIntentValue(query);
    if (normalizedQuery.length < 4) return null;

    const ranked = departments
        .map((department) => {
            const normalizedName = normalizeIntentValue(department.name);
            const distance = levenshteinDistance(normalizedQuery, normalizedName);
            return {
                department,
                score: distance / Math.max(normalizedQuery.length, normalizedName.length, 1),
            };
        })
        .sort((left, right) => left.score - right.score);

    const best = ranked[0];
    if (!best || best.score > 0.28) return null;

    const runnerUp = ranked[1];
    if (runnerUp && best.score > 0.1 && runnerUp.score - best.score < 0.08) return null;

    return best.department;
}

/**
 * Builds the CommandReceipt payload shown when Mora resolves an "open X" intent.
 * Pure. Extracted verbatim from apps/chat/index.tsx.
 */
export function buildOpenIntentReceipt(intent: OpenIntentResolution, query: string): {
    label: string;
    title: string;
    body?: string;
    chips: CommandReceiptChip[];
    footer?: string;
} {
    const chips: CommandReceiptChip[] = [];
    if (query.trim()) {
        chips.push({ label: `"${query.trim()}"` });
    }
    if (intent.destination?.path) {
        chips.push({ label: intent.destination.path });
    } else if (intent.destination?.label) {
        chips.push({ label: intent.destination.label });
    }
    if (intent.next?.label) {
        chips.push({ label: intent.next.label, tone: intent.resolution === 'choose' ? 'amber' : intent.resolution === 'act' ? 'cyan' : 'slate' });
    }

    return {
        label: intent.headline || 'Treffer',
        title: intent.open_explanation?.headline || intent.reason || `Suche für "${query}"`,
        body: intent.open_explanation?.reason || intent.reason || undefined,
        chips,
        footer: intent.next?.message,
    };
}

/**
 * Maps an open-intent candidate into an openable search result, normalizing
 * unknown entity types to 'node'. Pure. Extracted from apps/chat/index.tsx.
 */
export function toChatOpenableResult(candidate: OpenIntentCandidate): OpenableSearchResult {
    const normalizedType = (
        candidate.type === 'department'
        || candidate.type === 'space'
        || candidate.type === 'folder'
        || candidate.type === 'file'
        || candidate.type === 'node'
    ) ? candidate.type : 'node';

    return {
        id: candidate.id,
        title: candidate.title,
        type: normalizedType,
        subtitle: candidate.scope_path || candidate.path,
        path: candidate.scope_path || candidate.path,
        companyId: candidate.company_id,
        departmentId: candidate.department_id,
        spaceId: candidate.space_id,
        folderId: candidate.folder_id,
        nodeId: candidate.node_id,
    };
}
