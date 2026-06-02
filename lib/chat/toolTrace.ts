/**
 * Turns the agent's executed-tools list into a short, SAFE "what Mora did" trace
 * for the chat UI. Shows that she searched/read/compared/planned/acted — without
 * exposing chain-of-thought, internal prompts, or raw parameters.
 *
 * Hard rules:
 * - never render llm_thought / prompts (not even consumed here)
 * - never emit raw params; only one allow-listed field, sanitized + truncated
 * - failure is shown honestly as "Nicht abgeschlossen" (ok=false), never a green step
 * - unknown tools map to a neutral "other" — we never invent an action
 */

export type ToolTraceKind = 'searched' | 'read' | 'compared' | 'planned' | 'acted' | 'failed' | 'other';

export interface ToolTraceStep {
    kind: ToolTraceKind;
    label: string;
    ok: boolean;
    detail?: string;
}

interface ToolResultLike {
    tool: string;
    params?: Record<string, any>;
    success: boolean;
    error?: string;
}

const LABELS: Record<ToolTraceKind, string> = {
    searched: 'Gesucht',
    read: 'Gelesen',
    compared: 'Verglichen',
    planned: 'Geplant',
    acted: 'Gehandelt',
    failed: 'Nicht abgeschlossen',
    other: 'Werkzeug genutzt',
};

/** Map a concrete tool name to a coarse, user-safe category. */
function kindForTool(tool: string): ToolTraceKind {
    const t = (tool || '').toLowerCase();
    if (t.includes('search')) return 'searched';
    if (t.startsWith('read') || t === 'get_node' || t.includes('read_')) return 'read';
    if (t.includes('relation') || t.includes('compare') || t.includes('resonance')) return 'compared';
    if (t.includes('work_session') || t.includes('plan')) return 'planned';
    if (
        t.includes('create') || t.includes('update') || t.includes('move') ||
        t.includes('rename') || t.includes('delete') || t === 'navigate'
    ) return 'acted';
    return 'other';
}

/** Only these param keys may ever surface as a (sanitized) detail. */
const SAFE_DETAIL_KEYS = ['query', 'q', 'search', 'name', 'title', 'folder_name', 'target'];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TOKENISH_RE = /[A-Za-z0-9_+/-]{20,}/g;

/** Strip emails + token-like blobs, collapse whitespace, truncate. */
function sanitizeDetail(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    let s = value.replace(EMAIL_RE, '[E-Mail]').replace(TOKENISH_RE, '[…]').replace(/\s+/g, ' ').trim();
    if (!s) return undefined;
    if (s.length > 60) s = s.slice(0, 60) + '…';
    return s;
}

function detailFor(params?: Record<string, any>): string | undefined {
    if (!params) return undefined;
    for (const key of SAFE_DETAIL_KEYS) {
        if (key in params) {
            const d = sanitizeDetail(params[key]);
            if (d) return d;
        }
    }
    return undefined;
}

export function toToolTrace(tools: ToolResultLike[] | undefined | null): ToolTraceStep[] {
    if (!Array.isArray(tools)) return [];
    return tools.map((entry) => {
        if (!entry.success) {
            // honest failure — no green step, no leaked detail
            return { kind: 'failed' as const, label: LABELS.failed, ok: false };
        }
        const kind = kindForTool(entry.tool);
        return {
            kind,
            label: LABELS[kind],
            ok: true,
            detail: detailFor(entry.params),
        };
    });
}
