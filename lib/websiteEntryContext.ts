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
    const surface = firstQueryValue(query.surface);
    const entity = firstQueryValue(query.entity);
    const id = firstQueryValue(query.id);
    if (surface !== 'website' || !entity || !id) return null;

    const companyParam = firstQueryValue(query.company);
    const email = firstQueryValue(query.email);
    const domain = firstQueryValue(query.domain);
    const score = parseScore(firstQueryValue(query.score));
    const level = firstQueryValue(query.level);
    const grade = firstQueryValue(query.grade);
    const summary = firstQueryValue(query.summary);
    const entryToken = firstQueryValue(query.entry_token);
    const actions = parseActions(firstQueryValue(query.actions));
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
        title: isAudit ? 'Digital Risk Check aus der Website' : 'Digital AI Self Blueprint aus der Website',
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
                description: 'Mora bereitet Dokumente, Verantwortlichkeiten und Routinen als isolierten Arbeitsraum vor.',
                tone: 'setup',
            },
            {
                name: 'Wachstum',
                description: 'Naechste Automationen und Kundenkontakt-Flaechen werden als erste Aufgaben angelegt.',
                tone: 'growth',
            },
        ],
        documents: [
            {
                title: `${companyName} - Security Dossier`,
                description: summary || (domain ? `Audit-Kontext fuer ${domain}` : 'Audit-Kontext aus dem Website-Einstieg'),
            },
            {
                title: '14-Tage Massnahmenplan',
                description: actions.length > 0 ? actions.slice(0, 3).join(' / ') : 'Prioritaeten fuer die ersten Verbesserungen im HQ.',
            },
            {
                title: 'Betriebsmappe',
                description: email ? `Lead und Kontaktkontext: ${email}` : 'Platzhalter fuer echte Dokumente, sobald Tools verbunden werden.',
            },
        ],
        tasks: actions.length > 0 ? actions.slice(0, 4).map((title, index) => ({
            title,
            priority: index === 0 && score !== undefined && score < 70 ? 'hoch' : 'mittel',
        })) : [
            {
                title: score !== undefined && score < 70 ? 'Kritische Befunde zuerst klaeren' : 'Audit-Ergebnis validieren',
                priority: score !== undefined && score < 70 ? 'hoch' : 'mittel',
            },
            {
                title: 'Verantwortliche Person fuer Security festlegen',
                priority: 'mittel',
            },
            {
                title: 'Echte Tools verbinden',
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
    if (score === undefined) return 'Security-Aufgaben werden aus dem Website-Kontext vorbereitet.';
    if (score < 50) return 'Hohe Risiken werden als erste HQ-Aufgaben markiert.';
    if (score < 80) return 'Mittlere Risiken werden in konkrete Verbesserungen uebersetzt.';
    return 'Solide Basis: Mora bereitet Monitoring und saubere Dokumentation vor.';
}
