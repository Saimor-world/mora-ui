export type ChatIntent = {
    type: 'navigate' | 'search' | 'global_search' | 'chat';
    target?: string;
};

export interface NavigableDepartment {
    id: string;
    name: string;
}

const OPEN_OR_SEARCH_COMMAND = /^(?:öffne|oeffne|finde|find|suche|such|search)(?:\s+|$)/i;
const SHOW_COMMAND = /^(?:zeige mir|zeig mir|zeige|zeig|show me|show|geh zu|go to)(?:\s+|$)/i;
const TRAILING_OBJECT = /\s+(?:dokumente|dokument|documents|document|dateien|datei|files|file|ordner|folder|folders)$/i;

function stripCommand(text: string): string {
    return text
        .replace(/^(?:zeige mir|zeig mir|zeige|zeig|show me|show|geh zu|go to|öffne|oeffne|finde|find|suche nach|suche|such|search for|search|suche mir|find me)\s+/i, '')
        .replace(TRAILING_OBJECT, '')
        .trim();
}

/** Only explicit commands navigate. Conversational mentions stay in chat. */
export function parseChatIntent(text: string, departments: NavigableDepartment[]): ChatIntent {
    const lower = text.toLowerCase().trim();

    if (/^(?:zeige|zeig|show|öffne|oeffne|finde|find|suche|such|search)\b/i.test(lower)
        && /\b(?:alle dokumente|alle dateien|all documents|everything)\b/i.test(lower)) {
        return { type: 'global_search' };
    }

    if (SHOW_COMMAND.test(lower)) {
        const department = departments.find((item) => lower.includes(item.name.toLowerCase()));
        if (department) return { type: 'navigate', target: department.id };

        const target = stripCommand(text);
        return target ? { type: 'search', target } : { type: 'chat' };
    }

    if (OPEN_OR_SEARCH_COMMAND.test(lower)) {
        const target = stripCommand(text);
        return target ? { type: 'search', target } : { type: 'chat' };
    }

    return { type: 'chat' };
}
