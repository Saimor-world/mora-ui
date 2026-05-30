export function decodeCtParam(ct: string): Record<string, unknown> | null {
    try {
        const [encoded] = ct.split('.');
        return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
}

export type WebsiteEntryContext = {
    surface?: string;
    entity?: string;
    id?: string;
    companyName: string;
    email?: string;
    domain?: string;
    score?: number;
    level?: string;
    grade?: string;
    summary?: string;
    entryToken?: string;
    title: string;
    rooms: Array<{ name: string; description: string; tone: 'risk' | 'setup' | 'growth' }>;
    documents: Array<{ title: string; description: string }>;
    tasks: Array<{ title: string; priority: 'hoch' | 'mittel' | 'niedrig' }>;
};

type Query = Record<string, string | string[] | undefined>;

export function firstQueryValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export function buildWebsiteEntryContext(query: Query): WebsiteEntryContext | null {
    // Prefer signed context token over loose params
    const ctParam = firstQueryValue(query.ct);
    const decoded = ctParam ? decodeCtParam(ctParam) : null;

    const surface = firstQueryValue(query.surface) ?? (decoded ? 'website' : undefined);
    const entity = firstQueryValue(query.entity) ?? (decoded ? 'security-audit' : undefined);
    const id = firstQueryValue(query.id) ?? (decoded ? String(decoded.id ?? '') : undefined);

    if (surface !== 'website' || !entity || !id) return null;

    const companyParam = decoded
        ? String(decoded.company ?? '')
        : firstQueryValue(query.company);
    const email = decoded
        ? String(decoded.email ?? '')
        : firstQueryValue(query.email);
    const domain = decoded
        ? String(decoded.domain ?? '')
        : firstQueryValue(query.domain);
    const score = decoded
        ? parseScore(String(decoded.score ?? ''))
        : parseScore(firstQueryValue(query.score));
    const level = decoded
        ? String(decoded.level ?? '')
        : firstQueryValue(query.level);
    const grade = decoded
        ? String(decoded.grade ?? '')
        : firstQueryValue(query.grade);
    const summary = decoded
        ? String(decoded.summary ?? '')
        : firstQueryValue(query.summary);
    const entryToken = firstQueryValue(query.ct) || firstQueryValue(query.entry_token) || firstQueryValue(query.token);
    const actions = decoded
        ? (decoded.actions as string[] | undefined) ?? []
        : parseActions(firstQueryValue(query.actions));
    const companyName = normalizeCompanyName(companyParam, domain);
    const isAudit = entity === 'security-audit';

    return {
        surface,
        entity,
        id,
        companyName,
        email,
        domain,
        score,
        level,
        grade,
        summary,
        entryToken,
        title: isAudit ? 'Nightwatch Security Signal aus WORLD' : 'Digital AI Self Blueprint aus WORLD',
        rooms: [
            {
                name: 'Security',
                description: isAudit
                    ? riskRoomDescription(score)
                    : 'Sicherheitsleitplanken werden aus deinem Blueprint vorbereitet.',
                tone: score !== undefined && score < 70 ? 'risk' : 'setup',
            },
            {
                name: 'Betrieb',
                description: 'Mora bereitet Finder-Kontext, Verantwortlichkeiten und Routinen als isolierten Arbeitsraum vor.',
                tone: 'setup',
            },
            {
                name: 'Wachstum',
                description: 'Dashboard-Gedaechtnis und OS-Aufgaben werden getrennt, aber verbunden angelegt.',
                tone: 'growth',
            },
        ],
        documents: [
            {
                title: `${companyName} - Nightwatch Dossier`,
                description: summary || (domain ? `Oeffentlicher Nightwatch-Kontext fuer ${domain}` : 'Nightwatch-Kontext aus WORLD'),
            },
            {
                title: '14-Tage Massnahmenplan',
                description: actions.length > 0 ? actions.slice(0, 3).join(' / ') : 'Prioritaeten fuer die ersten Verbesserungen im HQ.',
            },
            {
                title: 'Betriebsmappe',
                description: email ? `Dashboard merkt Lead und Kontaktkontext: ${email}` : 'Platzhalter fuer echte Dokumente, sobald Tools verbunden werden.',
            },
        ],
        tasks: actions.length > 0 ? actions.slice(0, 4).map((title, index) => ({
            title,
            priority: index === 0 && score !== undefined && score < 70 ? 'hoch' : 'mittel',
        })) : [
            {
                title: score !== undefined && score < 70 ? 'Nightwatch-Befunde zuerst klaeren' : 'Nightwatch-Ergebnis validieren',
                priority: score !== undefined && score < 70 ? 'hoch' : 'mittel',
            },
            {
                title: 'Finder-Dossier mit Verantwortlicher Person verbinden',
                priority: 'mittel',
            },
            {
                title: 'Echte Tools erst nach Freigabe verbinden',
                priority: 'niedrig',
            },
        ],
    };
}

function parseScore(value?: string) {
    if (!value) return undefined;
    const score = Number(value);
    if (!Number.isFinite(score)) return undefined;
    return Math.max(0, Math.min(100, Math.round(score)));
}

function parseActions(value?: string) {
    if (!value) return [];
    return value
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6);
}

function normalizeCompanyName(company?: string, domain?: string) {
    const explicit = (company || '').trim();
    if (explicit && explicit.toLowerCase() !== 'anonym') return explicit;
    if (!domain) return 'Deine Firma';
    const root = domain.replace(/^www\./, '').split('.')[0]?.replaceAll('-', ' ');
    if (!root) return domain;
    return root
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function riskRoomDescription(score?: number) {
    if (score === undefined) return 'Nightwatch-Signale werden aus dem WORLD-Kontext vorbereitet.';
    if (score < 50) return 'Hohe Risiken werden als erste OS-Aufgaben markiert.';
    if (score < 80) return 'Mittlere Risiken werden in konkrete Verbesserungen und Finder-Kontext uebersetzt.';
    return 'Solide Basis: Mora bereitet Monitoring und saubere Dokumentation vor.';
}
