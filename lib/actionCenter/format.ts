import type { ActionEvent, ActionStatus } from '@/lib/hooks/useActionEvents';
import { getWorkSessionPlanId } from '@/lib/actionCenter/events';
import { actionStatusLabel } from '@/lib/ui/status';

/**
 * Pure presentational formatters + label maps for the Action Center.
 * Status labels now come from the single source lib/ui/status.ts.
 * (statusIconMap stays in the component because it carries JSX icons.)
 */

const _ACTION_STATUSES: ActionStatus[] = [
    'proposed', 'running', 'pending_confirmation', 'done', 'failed', 'rejected', 'expired',
];

export const statusLabelMap: Record<ActionStatus, string> = Object.fromEntries(
    _ACTION_STATUSES.map((s) => [s, actionStatusLabel(s)]),
) as Record<ActionStatus, string>;

export const intentLabelMap: Record<string, string> = {
    create_folder: 'Ordner erstellen',
    move_node: 'Dokument verschieben',
    rename_node: 'Dokument umbenennen',
    create_note: 'Notiz erstellen',
    create_draft: 'Entwurf erstellen',
    update_note_content: 'Inhalt aktualisieren',
    confirm_action: 'Aktion bestätigen',
    undo: 'Aktion rückgängig machen',
    create_node_from_file: 'Inhalt aus Datei erzeugen',
    work_session_plan: 'Arbeitsplan',
    navigation_open: 'Navigation',
};

export function formatActionTitle(evt: ActionEvent): string {
    const toolName = typeof evt.payload?.tool_name === 'string' ? evt.payload.tool_name : undefined;
    const intent = toolName || evt.intent || 'system_action';
    return intentLabelMap[intent] || intent.replace(/_/g, ' ');
}

export function formatActionMessage(evt: ActionEvent): string | null {
    const workSessionPlanId = getWorkSessionPlanId(evt);
    if (workSessionPlanId) {
        const summary = typeof evt.payload?.summary === 'string' && evt.payload.summary.trim()
            ? evt.payload.summary
            : evt.message;
        const stats = typeof evt.payload?.stats === 'object' && evt.payload.stats !== null
            ? evt.payload.stats as Record<string, unknown>
            : null;
        const total = typeof stats?.total_steps === 'number' ? stats.total_steps : null;
        const read = typeof stats?.read_steps === 'number' ? stats.read_steps : null;
        const write = typeof stats?.write_steps === 'number' ? stats.write_steps : null;
        const pending = typeof stats?.pending_confirmations === 'number' ? stats.pending_confirmations : null;
        const statsSummary = [
            total ? `${total} Schritte` : null,
            read ? `${read} Lesen` : null,
            write ? `${write} Schreiben` : null,
            pending ? `${pending} Freigabe${pending === 1 ? '' : 'n'} offen` : null,
        ].filter(Boolean).join(' | ');
        if (summary && statsSummary) return `${summary} | ${statsSummary}`;
        if (summary) return summary;
        if (statsSummary) return statsSummary;
    }

    if (evt.error) return evt.error;
    if (evt.message) return evt.message;
    const changeSummary = typeof evt.payload?.change_summary === 'string' ? evt.payload.change_summary : null;
    if (changeSummary?.trim()) return changeSummary;
    const topLevelResultSummary = typeof evt.payload?.result_summary === 'string' ? evt.payload.result_summary : null;
    if (topLevelResultSummary?.trim()) return topLevelResultSummary;
    const summary = typeof evt.payload?.summary === 'string' ? evt.payload.summary : null;
    if (summary) return summary;
    const result = evt.payload?.result;
    if (result && typeof result === 'object' && result !== null) {
        const r = result as Record<string, unknown>;
        if (typeof r.result_summary === 'string' && r.result_summary.trim()) return r.result_summary;
        if (typeof r.summary === 'string' && r.summary.trim()) return r.summary;
        if (typeof r.destination_summary === 'string' && r.destination_summary.trim()) {
            const intent = typeof evt.payload?.tool_name === 'string' ? evt.payload.tool_name : evt.intent;
            return intent === 'update_note_content'
                ? `Aktualisiert in ${r.destination_summary}`
                : `Erstellt in ${r.destination_summary}`;
        }
    }
    const topLevelDest = typeof evt.payload?.destination_summary === 'string' ? evt.payload.destination_summary : null;
    if (topLevelDest?.trim()) {
        const intent = typeof evt.payload?.tool_name === 'string' ? evt.payload.tool_name : evt.intent;
        return intent === 'update_note_content'
            ? `Aktualisiert in ${topLevelDest}`
            : `Erstellt in ${topLevelDest}`;
    }
    return statusLabelMap[evt.status] || null;
}

export function formatTime(ts?: string): string {
    if (!ts) return '--:--';
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return '--:--';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatBatchTime(ts: string): string {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '--';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (d.toDateString() === today.toDateString()) return `Heute · ${timeStr}`;
    if (d.toDateString() === yesterday.toDateString()) return `Gestern · ${timeStr}`;
    return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} · ${timeStr}`;
}

export function formatRole(role?: string | null): string {
    if (!role) return 'unbekannt';
    return role === 'system_owner' ? 'system' : role;
}
