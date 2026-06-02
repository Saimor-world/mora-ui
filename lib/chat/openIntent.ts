import type { OpenIntentResolution, OpenIntentCandidate } from '@/lib/api/coreClient';
import type { OpenableSearchResult } from '@/lib/utils/searchOpen';
import type { CommandReceiptChip } from '@/components/ui/CommandReceipt';

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
