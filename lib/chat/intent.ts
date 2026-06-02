/**
 * Client-side intent heuristics for the Mora chat. Keyword/regex based — used
 * to decide whether a message should route through the agentic (tool) loop or
 * plain chat. Extracted verbatim from apps/chat/index.tsx so the rules are
 * independently testable.
 */

export function isLikelyFileOperationIntent(text: string): boolean {
    const lower = text.toLowerCase();
    return [
        /\b(erstelle|erzeuge|anlegen|lege an|create)\b.*\b(ordner|folder)\b/,
        /\b(verschiebe|move)\b.*\b(datei|dateien|dokument|dokumente|node|nodes|file|files|ordner|folder)\b/,
        /\b(benenne|umbenennen|rename)\b.*\b(datei|dokument|node|file)\b/,
        /\b(erstelle|erzeuge|anlegen|lege an|create)\b.*\b(notiz|note)\b/,
        /\b(erstelle|erzeuge|anlegen|lege an|create)\b.*\b(entwurf|draft|briefing)\b/,
        /\b(aktualisiere|update|ändere|aendere|überarbeite|ueberarbeite|schreibe um)\b.*\b(notiz|note|entwurf|draft|dokument)\b/,
    ].some((pattern) => pattern.test(lower));
}

export function shouldPreferAgenticLoop(text: string): boolean {
    const lower = text.toLowerCase();
    return [
        /\b(erstelle|erzeuge|anlegen|lege an|create)\b/,
        /\b(aktualisiere|update|ändere|aendere|überarbeite|ueberarbeite|rewrite|schreib um)\b/,
        /\b(verschiebe|move|sortiere|ordne|organisiere)\b/,
        /\b(lösche|loesche|entferne|delete|archive)\b/,
        /\b(teile|share|veröffentliche|veröffentliche)\b/,
        /\b(fasse zusammen|zusammenfassen|review|prüfe|pruefe|analysiere|compare|vergleiche)\b/,
        /\b(starte|setze fort|continue|mach weiter|plane|bereite vor|arbeite aus)\b/,
    ].some((pattern) => pattern.test(lower));
}
