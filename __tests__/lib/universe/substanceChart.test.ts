import { buildSubstanceBars } from '@/lib/universe/substanceChart';

const t = (id: string, name: string, documents: number, spaces: number, folders: number) => ({
    id, name, documents, spaces, folders, color: '#67e8f9',
});

/**
 * Marius wollte "mehr visuelle Ansprechpunkte, gerne mit einem neuen Graphen".
 *
 * Der Graph zeigt, was wirklich in den Abteilungen liegt - keine erfundene
 * Zeitreihe. Historie haben wir naemlich nicht: CORE speichert keine
 * Bestandsverlaeufe, eine Kurve "Wachstum ueber Zeit" waere frei erfunden.
 * Ein Vergleich der Gegenwart ist dagegen vollstaendig belegt.
 */
describe('buildSubstanceBars', () => {
    it('gibt nichts zurueck, wenn es keine Abteilungen gibt', () => {
        expect(buildSubstanceBars([])).toEqual([]);
    });

    it('sortiert nach Inhalt, damit das Groesste oben steht', () => {
        const bars = buildSubstanceBars([
            t('a', 'Klein', 2, 1, 1),
            t('b', 'Gross', 40, 3, 6),
            t('c', 'Mittel', 12, 2, 3),
        ]);
        expect(bars.map((bar) => bar.name)).toEqual(['Gross', 'Mittel', 'Klein']);
    });

    it('gibt dem groessten Balken die volle Breite', () => {
        const bars = buildSubstanceBars([t('a', 'Gross', 40, 0, 0), t('b', 'Klein', 10, 0, 0)]);
        expect(bars[0].ratio).toBe(1);
        expect(bars[1].ratio).toBeCloseTo(0.25);
    });

    // Vier leere Abteilungen duerfen nicht wie vier volle aussehen.
    it('zeichnet nichts, wenn ueberall nichts liegt', () => {
        const bars = buildSubstanceBars([t('a', 'Leer', 0, 0, 0), t('b', 'Auch leer', 0, 0, 0)]);
        expect(bars.every((bar) => bar.ratio === 0)).toBe(true);
    });

    it('traegt die echten Zahlen mit, nicht nur das Verhaeltnis', () => {
        const [bar] = buildSubstanceBars([t('a', 'Growth', 9, 2, 3)]);
        expect(bar.documents).toBe(9);
        expect(bar.spaces).toBe(2);
        expect(bar.folders).toBe(3);
    });

    it('ist deterministisch', () => {
        const input = [t('a', 'A', 5, 1, 1), t('b', 'B', 9, 2, 2)];
        expect(buildSubstanceBars(input)).toEqual(buildSubstanceBars(input));
    });
});
