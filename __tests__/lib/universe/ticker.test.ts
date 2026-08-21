import { buildTickerItems, type TickerSource } from '@/lib/universe/ticker';

const source = (over: Partial<TickerSource> = {}): TickerSource => ({
    territories: [],
    signals: [],
    business: { monthlyRevenueMinor: 0, currency: null, activeCount: 0, providers: [] },
    openIncidentCount: 0,
    mailPreview: [],
    calendarPreview: [],
    feedPreview: [],
    ...over,
});

/**
 * Marius' Befund: "viel zu wenig info, ich weiss gar nicht wo ich hinschauen
 * soll". Ein Bloomberg-Terminal ist voll, nicht leer - dieses Band ist der
 * Ausgleich zu den ruhigen Planeten: ein durchlaufender Streifen echter
 * Werte, nichts Erfundenes, nichts, das nicht schon irgendwo im Feld steht.
 */
describe('buildTickerItems', () => {
    // "Wirtschaft" ist absichtlich die eine Ausnahme: sie zeigt sich immer,
    // auch leer - siehe "meldet die Wirtschaft ehrlich leer" unten. Fuer
    // alles andere gilt: nichts Reales, nichts im Band.
    it('zeigt ohne jede Substanz nur die Wirtschafts-Zeile', () => {
        expect(buildTickerItems(source()).map((i) => i.id)).toEqual(['business']);
    });

    it('meldet Substanz je Bereich', () => {
        const items = buildTickerItems(source({
            territories: [{ id: 'a', name: 'Growth', documents: 12, spaces: 2, folders: 3 }],
        }));
        expect(items.find((i) => i.id === 'territory:a')?.text).toBe('GROWTH · 12 DOKUMENTE · 2 BEREICHE');
    });

    it('meldet die Wache nur, wenn wirklich etwas offen ist', () => {
        expect(buildTickerItems(source({ openIncidentCount: 0 })).some((i) => i.id === 'nightwatch')).toBe(false);
        const items = buildTickerItems(source({ openIncidentCount: 3 }));
        expect(items.find((i) => i.id === 'nightwatch')?.text).toBe('NIGHTWATCH · 3 OFFEN');
    });

    it('meldet die Wirtschaft ehrlich leer statt sie wegzulassen', () => {
        const items = buildTickerItems(source());
        expect(items.find((i) => i.id === 'business')?.text).toBe('WIRTSCHAFT · NOCH KEIN UMSATZ');
    });

    it('meldet einen echten Umsatz, sobald einer da ist', () => {
        const items = buildTickerItems(source({
            business: { monthlyRevenueMinor: 19900, currency: 'EUR', activeCount: 1, providers: ['paddle'] },
        }));
        const amount = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(199);
        expect(items.find((i) => i.id === 'business')?.text).toBe('WIRTSCHAFT · ' + amount + ' / MONAT');
    });

    it('meldet das juengste Signal aus Mail, Kalender und Feed', () => {
        const items = buildTickerItems(source({
            mailPreview: [{ id: 'm1', subject: 'Vertrag unterschrieben' } as any],
            calendarPreview: [{ id: 'c1', title: 'Standup' } as any],
        }));
        expect(items.find((i) => i.id === 'mail')?.text).toBe('MAIL · Vertrag unterschrieben');
        expect(items.find((i) => i.id === 'calendar')?.text).toBe('KALENDER · Standup');
    });

    it('ist deterministisch fuer denselben Zustand', () => {
        const input = source({ territories: [{ id: 'a', name: 'Growth', documents: 1, spaces: 1, folders: 0 }] });
        expect(buildTickerItems(input)).toEqual(buildTickerItems(input));
    });
});
