import { markMoonsInMotion, type MotionMoon } from '@/lib/universe/inMotion';

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

const moon = (id: string, name: string, updatedAt: string | null): MotionMoon => ({
    id, name, updatedAt,
});

/**
 * Marius' Szenario: "Ich habe eine neue Kampagne, die in einer Woche raus
 * muss. Ich will doch nicht ueber jeden Mond fahren muessen, um zu sehen, wo
 * die wichtige Kampagne ist. Als Geschaeftsfuehrer will ich sehen: was
 * bewegt sich gerade in Intelligence?"
 *
 * Antwort mit echten Daten: was zuletzt angefasst wurde, ist das, was sich
 * bewegt. Genau ein Mond je Planet wird hervorgehoben - "alles ist wichtig"
 * hiesse, dass nichts es ist.
 */
describe('markMoonsInMotion', () => {
    it('gibt nichts zurueck, wenn es keine Monde gibt', () => {
        expect(markMoonsInMotion([])).toEqual([]);
    });

    it('hebt den zuletzt angefassten Mond hervor', () => {
        const out = markMoonsInMotion([
            moon('a', 'Archiv', daysAgo(90)),
            moon('b', 'Kampagne', daysAgo(1)),
            moon('c', 'Preise', daysAgo(30)),
        ]);

        expect(out.find((m) => m.id === 'b')?.inMotion).toBe(true);
        expect(out.filter((m) => m.inMotion)).toHaveLength(1);
    });

    // Ein Ordner, den seit Monaten niemand angefasst hat, "bewegt" sich
    // nicht - auch wenn er der juengste von lauter alten ist.
    it('hebt nichts hervor, wenn alles kalt ist', () => {
        const out = markMoonsInMotion([
            moon('a', 'Alt', daysAgo(200)),
            moon('b', 'Aelter', daysAgo(300)),
        ]);

        expect(out.every((m) => !m.inMotion)).toBe(true);
    });

    it('ignoriert Monde ohne Datum, statt sie zu bevorzugen', () => {
        const out = markMoonsInMotion([
            moon('a', 'Ohne Datum', null),
            moon('b', 'Frisch', daysAgo(2)),
        ]);

        expect(out.find((m) => m.id === 'b')?.inMotion).toBe(true);
        expect(out.find((m) => m.id === 'a')?.inMotion).toBe(false);
    });

    it('bricht Gleichstand ueber die id, nicht ueber die Reihenfolge', () => {
        const gleich = daysAgo(1);
        const vorwaerts = markMoonsInMotion([moon('b', 'B', gleich), moon('a', 'A', gleich)]);
        const rueckwaerts = markMoonsInMotion([moon('a', 'A', gleich), moon('b', 'B', gleich)]);

        expect(vorwaerts.find((m) => m.inMotion)?.id).toBe('a');
        expect(rueckwaerts.find((m) => m.inMotion)?.id).toBe('a');
    });
});
