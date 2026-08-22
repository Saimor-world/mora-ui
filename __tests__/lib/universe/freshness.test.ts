import { freshnessOf } from '@/lib/universe/freshness';

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

/**
 * Marius: "die Monde sind nicht schoen, die Zahlen sind auch Quatsch."
 *
 * Er hat recht. Ein Zahl-Abzeichen ist Benachrichtigungs-Sprache ("Sie haben
 * 3 Ungelesene") - Buerokratie, kein Universum. Auf einem echten Mond steht
 * keine Zahl; man sieht ihm an, wie gross er ist und wie hell er leuchtet.
 *
 * Also traegt die Form die Information: Groesse sagt wieviel, Helligkeit sagt
 * wie frisch. Die genauen Zahlen erscheinen nur beim Darueberfahren, wo man
 * sie ueberhaupt lesen kann - ein Etikett auf einem kreisenden Objekt kann
 * man das nicht.
 */
describe('freshnessOf', () => {
    it('gibt einem heute beruehrten Ordner volle Helligkeit', () => {
        expect(freshnessOf(daysAgo(0))).toBeCloseTo(1, 1);
    });

    it('dimmt mit der Zeit, ohne je ganz zu verloeschen', () => {
        const gestern = freshnessOf(daysAgo(1));
        const alt = freshnessOf(daysAgo(120));

        expect(gestern).toBeGreaterThan(alt);
        // Nie 0: ein alter Ordner ist nicht verschwunden, nur kalt.
        expect(alt).toBeGreaterThan(0);
    });

    it('faellt monoton, nicht sprunghaft', () => {
        const werte = [0, 3, 10, 30, 90, 365].map((d) => freshnessOf(daysAgo(d)));
        for (let i = 1; i < werte.length; i += 1) {
            expect(werte[i]).toBeLessThanOrEqual(werte[i - 1]);
        }
    });

    // Unbekanntes Alter darf nicht wie "eben angefasst" aussehen - das waere
    // erfundene Frische.
    it('behandelt ein fehlendes Datum als kalt, nicht als frisch', () => {
        expect(freshnessOf(undefined)).toBeLessThan(0.3);
        expect(freshnessOf('kein datum')).toBeLessThan(0.3);
    });

    it('bleibt in den Grenzen', () => {
        [0, 1, 1000].forEach((d) => {
            const v = freshnessOf(daysAgo(d));
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
        });
    });
});
