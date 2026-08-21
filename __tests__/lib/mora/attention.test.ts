import { chooseMoraAttention, type AttentionInput } from '@/lib/mora/attention';

const base: AttentionInput = {
    territories: [],
    openIncidents: [],
    mailPreview: [],
    calendarPreview: [],
};

const territory = (id: string, name: string, over: Partial<AttentionInput['territories'][0]> = {}) => ({
    id, name, documents: 5, spaces: 1, metricSource: 'live' as const, ...over,
});

/**
 * Marius will Môra "als Persona sichtbar, die im System lebt, mitdenkt und
 * vorschlaegt". Der CursorAgent dafuer ist seit Monaten gebaut - aber in
 * MoraShell auskommentiert und als "future-tier" weggesperrt.
 *
 * Bevor er wieder laeuft, braucht er eine Regel: worauf darf sie zeigen?
 * Antwort: nur auf etwas, das wirklich da ist. Eine Persona, die auf
 * Erfundenes deutet, ist schlimmer als gar keine - sie macht jede spaetere
 * echte Warnung unglaubwuerdig.
 */
describe('chooseMoraAttention', () => {
    it('zeigt auf nichts, wenn nichts anliegt', () => {
        expect(chooseMoraAttention(base)).toBeNull();
    });

    it('nimmt einen offenen Vorfall vor allem anderen', () => {
        const attention = chooseMoraAttention({
            ...base,
            territories: [territory('a', 'Growth', { metricSource: 'missing' })],
            openIncidents: [{ id: 'i1', title: 'Container down', targetId: 'a' }],
        });

        expect(attention?.reason).toBe('incident');
        expect(attention?.targetId).toBe('a');
        expect(attention?.message).toContain('Container down');
    });

    // "Quelle fehlt" ist eine echte Luecke im Bestand - genau das, was eine
    // aufmerksame Kollegin ansprechen wuerde.
    it('weist auf eine fehlende Datenquelle hin, wenn nichts Dringenderes da ist', () => {
        const attention = chooseMoraAttention({
            ...base,
            territories: [territory('a', 'Growth'), territory('b', 'R&D', { metricSource: 'missing' })],
        });

        expect(attention?.reason).toBe('missing-source');
        expect(attention?.targetId).toBe('b');
        expect(attention?.message).toContain('R&D');
    });

    it('schweigt, wenn alle Bereiche ihre Quelle haben und nichts offen ist', () => {
        expect(chooseMoraAttention({
            ...base,
            territories: [territory('a', 'Growth'), territory('b', 'R&D')],
        })).toBeNull();
    });

    // Ein Vorfall, dessen Abteilung gar nicht im Feld steht, darf keinen
    // Zeiger ins Leere ausloesen.
    it('ignoriert einen Vorfall ohne sichtbare Abteilung', () => {
        expect(chooseMoraAttention({
            ...base,
            territories: [territory('a', 'Growth')],
            openIncidents: [{ id: 'i1', title: 'Irgendwo', targetId: 'gibt-es-nicht' }],
        })).toBeNull();
    });

    it('ist deterministisch - sie springt nicht bei jedem Neuzeichnen woandershin', () => {
        const input = {
            ...base,
            territories: [territory('a', 'A', { metricSource: 'missing' as const }), territory('b', 'B', { metricSource: 'missing' as const })],
        };
        expect(chooseMoraAttention(input)).toEqual(chooseMoraAttention(input));
    });
});
