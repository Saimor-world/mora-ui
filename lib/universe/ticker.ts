/**
 * Das Datenband: der Ausgleich zu den ruhigen Planeten.
 *
 * Marius' Befund am 21.08.2026, vor der laufenden Vorschau: "viel zu wenig
 * info, ich weiss gar nicht wo ich hinschauen soll". Vier stille Kreise sind
 * ruhig, aber ein Terminal - sein eigener Vergleich war ein Bloomberg-
 * Terminal - ist voll. Dieses Band zeigt fortlaufend, was gerade wahr ist:
 * nur Werte, die im Feld ohnehin schon irgendwo stehen, nichts Neues
 * erfunden.
 */

export interface TickerTerritoryInput {
    id: string;
    name: string;
    documents: number;
    spaces: number;
    folders: number;
}

export interface TickerSource {
    territories: TickerTerritoryInput[];
    signals: { id: string }[];
    // BusinessSummary direkt wiederverwenden statt einer eigenen Abschrift -
    // zwei Formen derselben Sache liefen beim Mycelium-Netz bereits einmal
    // auseinander, ohne dass es auffiel.
    business: import('@/lib/business/mrr').BusinessSummary;
    openIncidentCount: number;
    mailPreview: { subject?: string }[];
    calendarPreview: { title?: string }[];
    feedPreview: { title?: string }[];
}

export interface TickerItem {
    id: string;
    text: string;
}

export function buildTickerItems(source: TickerSource): TickerItem[] {
    const items: TickerItem[] = [];

    source.territories.forEach((territory) => {
        // Substanzlose Bereiche haetten nichts zu melden - ein leerer Ticker-
        // Eintrag waere dieselbe erfundene Aktivitaet, die das Feld selbst
        // ("niemals erfundene Gesundheit") ausdruecklich ablehnt.
        if (territory.documents === 0 && territory.spaces === 0 && territory.folders === 0) return;
        items.push({
            id: 'territory:' + territory.id,
            text: territory.name.toUpperCase() + ' · ' + territory.documents + ' DOKUMENTE · ' + territory.spaces + ' BEREICHE',
        });
    });

    if (source.openIncidentCount > 0) {
        items.push({ id: 'nightwatch', text: 'NIGHTWATCH · ' + source.openIncidentCount + ' OFFEN' });
    }

    items.push({
        id: 'business',
        text: source.business.activeCount === 0
            ? 'WIRTSCHAFT · NOCH KEIN UMSATZ'
            : 'WIRTSCHAFT · ' + formatMoney(source.business.monthlyRevenueMinor, source.business.currency) + ' / MONAT',
    });

    const mail = source.mailPreview[0];
    if (mail?.subject) items.push({ id: 'mail', text: 'MAIL · ' + mail.subject });

    const calendar = source.calendarPreview[0];
    if (calendar?.title) items.push({ id: 'calendar', text: 'KALENDER · ' + calendar.title });

    const feed = source.feedPreview[0];
    if (feed?.title) items.push({ id: 'feed', text: 'FEED · ' + feed.title });

    return items;
}

function formatMoney(minor: number, currency: string | null): string {
    if (!currency) return String(minor / 100) + ' (gemischte Währungen)';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}
