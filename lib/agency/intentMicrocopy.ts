/**
 * P3: Intent Microcopy – German Business Language Mapping
 * 
 * "Calm Competence" Principle:
 * - Ruhig, kompetent, nicht technisch
 * - Kurz (max 1 Satz)
 * - Erklärt was passiert, warum jetzt
 * - Kein "execute", "query", "agent", "node"
 */

// ============================================
// Action Type → German Intent Mapping
// ============================================

export const ACTION_INTENTS: Record<string, string> = {
    // Navigation
    navigate_department: 'Ich öffne die Abteilung.',
    navigate_space: 'Ich wechsle in den Bereich.',
    navigate_folder: 'Ich öffne den Ordner.',

    // Focus & Attention
    move_cursor: 'Ich zeige dir etwas.',
    highlight: 'Ich hebe das hervor.',
    focus_pane: 'Ich bringe das in den Vordergrund.',

    // Content
    open_pane: 'Ich öffne das Dokument.',
    read_document: 'Ich lese den Inhalt.',

    // Data Actions
    search_rag: 'Ich durchsuche das Unternehmensgedächtnis.',
    search_web: 'Ich recherchiere extern.',
    data_change: 'Ich aktualisiere die Daten.',

    // Fallback
    default: 'Ich führe eine Aktion aus.'
};

// ============================================
// Proposal Summary → German Intent Mapping
// ============================================

export const PROPOSAL_INTENTS: Record<string, string> = {
    // Common patterns (matched by keyword)
    navigate: 'Ich navigiere zu dem gewünschten Ort.',
    search: 'Ich suche nach relevanten Informationen.',
    analyze: 'Ich analysiere die Anfrage.',
    open: 'Ich öffne die angeforderten Inhalte.',
    show: 'Ich zeige dir die Ergebnisse.',
    create: 'Ich erstelle den neuen Eintrag.',
    update: 'Ich aktualisiere die Informationen.',

    // Fallback for proposals
    default: 'Ich bearbeite deine Anfrage.'
};

// ============================================
// Status Messages
// ============================================

export const STATUS_MESSAGES = {
    proposal_start: 'Ich beginne mit der Verarbeitung.',
    proposal_complete: 'Anfrage abgeschlossen.',
    proposal_failed: 'Es gab ein Problem – ich versuche es anders.',

    action_start: 'Aktion wird ausgeführt.',
    action_complete: 'Erledigt.',
    action_failed: 'Aktion nicht möglich.'
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get the German intent string for an action type.
 */
export function getActionIntent(actionType: string): string {
    return ACTION_INTENTS[actionType] || ACTION_INTENTS.default;
}

/**
 * Get the German intent string for a proposal summary.
 * Matches keywords in the summary to find the best fit.
 */
export function getProposalIntent(summary: string): string {
    const lowerSummary = summary.toLowerCase();

    for (const [keyword, intent] of Object.entries(PROPOSAL_INTENTS)) {
        if (keyword !== 'default' && lowerSummary.includes(keyword)) {
            return intent;
        }
    }

    return PROPOSAL_INTENTS.default;
}

/**
 * Get the appropriate status message.
 */
export function getStatusMessage(type: 'proposal' | 'action', status: 'start' | 'complete' | 'failed'): string {
    const key = `${type}_${status}` as keyof typeof STATUS_MESSAGES;
    return STATUS_MESSAGES[key] || '';
}
