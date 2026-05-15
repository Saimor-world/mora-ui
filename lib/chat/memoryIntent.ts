const MEMORY_KEYWORDS = [
    'merke dir', 'merk dir', 'speicher das', 'speichere das',
    'wichtig:', 'wichtig ist', 'vergiss nicht', 'erinnere dich',
    'remember', 'save this', 'note that', 'keep in mind'
];

const MEMORY_PREFIXES = [
    'merke dir,?', 'merk dir,?', 'speicher das,?', 'speichere das,?',
    'wichtig:', 'vergiss nicht,?', 'erinnere dich,?',
    'remember,?', 'save this,?', 'note that,?', 'keep in mind,?'
];

export function detectMemoryIntent(text: string): boolean {
    const lower = text.toLowerCase();
    return MEMORY_KEYWORDS.some((kw) => lower.includes(kw));
}

export function extractInsightFromRequest(text: string): string {
    let content = text;
    for (const prefix of MEMORY_PREFIXES) {
        content = content.replace(new RegExp(`^${prefix}\\s*`, 'i'), '');
    }
    return content.trim();
}

// Neue Recall-Keywords (Abruf-Intents — kein Speichern)
const RECALL_KEYWORDS = [
    'zeig mir meine erinnerungen', 'zeige mir meine erinnerungen',
    'zeig mir dein gedächtnis', 'zeige mir dein gedächtnis',
    'was weißt du über mich', 'was weisst du über mich',
    'was weißt du', 'was weisst du',
    'erinnerst du dich', 'erinnerst du dich daran',
    'was hast du gespeichert', 'was hast du dir gemerkt',
    'deine erinnerungen', 'meine erinnerungen',
    'dein gedächtnis', 'mein gedächtnis',
    'zeig memory', 'zeige memory',
    'show me my memories', 'show memories', 'show my memories',
    'what do you remember', 'what have you saved',
    'recall', 'what do you know about me',
];

export function detectRecallIntent(text: string): boolean {
    const lower = text.toLowerCase();
    return RECALL_KEYWORDS.some((kw) => lower.includes(kw));
}
