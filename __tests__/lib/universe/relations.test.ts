import {
    FIELD_EDGE_ORIGINS,
    buildRelationStrands,
    territoryDiameter,
    TERRITORY_MIN_DIAMETER,
    TERRITORY_MAX_DIAMETER,
} from '@/lib/universe/relations';
import type { UniverseSignal } from '@/lib/universe/types';

const territory = (id: string, x: number, y: number) => ({ id, x, y });

const signal = (over: Partial<UniverseSignal> & Pick<UniverseSignal, 'id' | 'targetId' | 'kind'>): UniverseSignal => ({
    title: 'Signal',
    subtitle: 'Quelle',
    evidence: 'assigned',
    ...over,
});

describe('buildRelationStrands', () => {
    const territories = [territory('product', 62, 30), territory('growth', 50, 74)];

    it('draws nothing when no signal can be placed', () => {
        expect(buildRelationStrands([], territories)).toEqual([]);
    });

    // Der Kern des Fehlers, den diese Datei behebt: die Linse "Zusammenhaenge"
    // sah aus wie "Organisation", weil ueberhaupt keine Verbindung gezeichnet
    // wurde. buildSoftUniverseRoute lag seit abd3233 verwaist in layout.ts -
    // exportiert, getestet, von niemandem aufgerufen.
    it('draws one strand per signal, from its source edge to its territory', () => {
        const strands = buildRelationStrands(
            [signal({ id: 'm1', targetId: 'product', kind: 'mail' })],
            territories,
        );

        expect(strands).toHaveLength(1);
        expect(strands[0].d).toMatch(/^M .* C /);
        expect(strands[0].targetId).toBe('product');
    });

    it('ignores a signal whose territory is not on the field', () => {
        const strands = buildRelationStrands(
            [signal({ id: 'x1', targetId: 'does-not-exist', kind: 'mail' })],
            territories,
        );

        expect(strands).toEqual([]);
    });

    // Nightwatch kommt von der Wache rechts unten, Mail/Kalender/Feed vom
    // Horizont links unten. Die Strang-Herkunft muss diese Seite treffen,
    // sonst zeigt die Linie in die falsche Richtung und behauptet Unsinn.
    it('starts nightwatch on the right edge and the horizon sources on the left', () => {
        const [mail] = buildRelationStrands([signal({ id: 'm', targetId: 'growth', kind: 'mail' })], territories);
        const [watch] = buildRelationStrands([signal({ id: 'w', targetId: 'growth', kind: 'nightwatch' })], territories);

        expect(FIELD_EDGE_ORIGINS.mail.x).toBeLessThan(0);
        expect(FIELD_EDGE_ORIGINS.nightwatch.x).toBeGreaterThan(100);
        expect(mail.d.startsWith('M -')).toBe(true);
        expect(watch.d.startsWith('M -')).toBe(false);
    });

    // Der Untertitel verspricht "nachweislich". Ein Teilstring-Treffer im
    // Mailbetreff ist kein Nachweis, eine department_id aus dem Vorfall schon.
    // Beide duerfen sichtbar sein - aber niemals gleich aussehen.
    it('keeps assigned and inferred evidence distinguishable', () => {
        const strands = buildRelationStrands(
            [
                signal({ id: 'a', targetId: 'product', kind: 'nightwatch', evidence: 'assigned' }),
                signal({ id: 'b', targetId: 'growth', kind: 'mail', evidence: 'inferred' }),
            ],
            territories,
        );

        const assigned = strands.find((item) => item.signalId === 'a');
        const inferred = strands.find((item) => item.signalId === 'b');

        expect(assigned?.evidence).toBe('assigned');
        expect(inferred?.evidence).toBe('inferred');
        expect(assigned?.dashed).toBe(false);
        expect(inferred?.dashed).toBe(true);
    });

    it('is deterministic for the same input', () => {
        const input = [signal({ id: 'm1', targetId: 'product', kind: 'mail' })];
        expect(buildRelationStrands(input, territories)).toEqual(buildRelationStrands(input, territories));
    });
});

describe('territoryDiameter', () => {
    // Der Untertitel behauptet "Groesse zeigt Substanz". Vor dieser Aenderung
    // lag die ganze Skala in einem 52px-Fenster, zusaetzlich durch log2
    // gestaucht: vier echte Bereiche des HQ landeten zwischen 152,7px und
    // 161,6px - neun Pixel Unterschied, fuer das Auge null. Die Aussage war
    // wahr gemeint und faktisch unsichtbar.
    it('separates a thin territory from a substantial one visibly', () => {
        const thin = territoryDiameter({ spaces: 1, folders: 0, documents: 0 });
        const heavy = territoryDiameter({ spaces: 2, folders: 4, documents: 40 });

        expect(heavy - thin).toBeGreaterThanOrEqual(40);
    });

    it('stays inside the bounds the layout reserves', () => {
        expect(territoryDiameter({ spaces: 0, folders: 0, documents: 0 })).toBe(TERRITORY_MIN_DIAMETER);
        expect(territoryDiameter({ spaces: 900, folders: 900, documents: 9000 })).toBe(TERRITORY_MAX_DIAMETER);
    });

    it('grows monotonically with substance', () => {
        const a = territoryDiameter({ spaces: 1, folders: 1, documents: 1 });
        const b = territoryDiameter({ spaces: 1, folders: 1, documents: 8 });
        const c = territoryDiameter({ spaces: 3, folders: 1, documents: 8 });

        expect(b).toBeGreaterThan(a);
        expect(c).toBeGreaterThan(b);
    });
});
