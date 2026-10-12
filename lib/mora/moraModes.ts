/**
 * MÔRA-Arbeitsmodi im OS.
 *
 * - denken: bestehender Chat-Pfad (/v3/chat).
 * - bauen / recherche: POST /v3/chat/mode. CORE führt dort nie etwas aus;
 *   Bau-Vorschläge kommen als proposeAction mit status "awaiting_approval".
 */
import { corePost } from '@/lib/api/coreClient';

export type MoraMode = 'denken' | 'bauen' | 'recherche';

export const MORA_MODES: ReadonlyArray<{ id: MoraMode; label: string; hint: string }> = [
    { id: 'denken', label: 'Denken', hint: 'Gespräch mit MÔRA' },
    { id: 'bauen', label: 'Bauen', hint: 'Vorschläge, nichts wird ausgeführt' },
    { id: 'recherche', label: 'Recherche', hint: 'Antwort mit Quellen' },
];

export interface MoraModeSource {
    title?: string;
    url?: string;
    snippet?: string;
    kind?: string;
}

export interface MoraModeProposal {
    id: string;
    label: string;
    risk?: string;
    status?: string;
    requiresConfirmation?: boolean;
    payload?: { tool?: string; args?: Record<string, unknown>; risk?: string; source?: string };
    /** Nur gesetzt, wenn CORE einen echten, verifizierten Ausführungsweg meldet. */
    execution?: { verified?: boolean; endpoint?: string };
}

export interface MoraModeResult {
    mode: MoraMode;
    text: string;
    proposals: MoraModeProposal[];
    citations: number[];
    sources: MoraModeSource[];
    flags: string[];
}

const FLAG_LABELS: Record<string, string> = {
    no_sources: 'Keine Belege gefunden – Antwort ist unbelegt.',
    uncited: 'Antwort nennt keine der gefundenen Quellen.',
    invalid_citation: 'Antwort verweist auf eine Quelle, die es nicht gibt.',
    proposal_unparseable: 'Ein Vorschlag war nicht lesbar und wurde verworfen.',
};

export function describeFlag(flag: string): string {
    return FLAG_LABELS[flag] ?? `Hinweis: ${flag}`;
}

/** Freigabe nur, wenn ein echter, von CORE verifizierter Ausführungsweg existiert. */
export function hasVerifiedExecutionPath(p: MoraModeProposal): boolean {
    return p.execution?.verified === true && typeof p.execution.endpoint === 'string' && p.execution.endpoint.startsWith('/v3/');
}

export function normalizeModeResult(raw: unknown, mode: MoraMode): MoraModeResult {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
    return {
        mode: (typeof r.mode === 'string' ? r.mode : mode) as MoraMode,
        text: typeof r.text === 'string' ? r.text : '',
        proposals: arr<MoraModeProposal>(r.proposals).filter((p) => p && typeof p.id === 'string'),
        citations: arr<number>(r.citations).filter((n) => Number.isInteger(n)),
        sources: arr<MoraModeSource>(r.sources),
        flags: arr<string>(r.flags).filter((f) => typeof f === 'string'),
    };
}

export async function sendModeMessage(
    mode: Exclude<MoraMode, 'denken'>,
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
): Promise<MoraModeResult> {
    const raw = await corePost('/v3/chat/mode', {
        message,
        mode,
        history: history.slice(-20).map((h) => ({ role: h.role, content: h.content.slice(0, 10000) })),
    });
    return normalizeModeResult(raw, mode);
}
