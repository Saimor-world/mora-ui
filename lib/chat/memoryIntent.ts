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
