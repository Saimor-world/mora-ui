import { emphasisFor } from '@/lib/universe/emphasis';

/**
 * Marius: "Nichts zieht den Blick auf eine Sache. Vier gleich schwere
 * Planeten, zwei Kartenstapel, ein Dock."
 *
 * Die Hierarchie soll nicht erfunden sein, sondern der Logik folgen, die es
 * schon gibt: was Aufmerksamkeit braucht, tritt hervor - der Rest tritt
 * zurueck. Und wenn nichts anliegt, ist alles gleich. Eine ruhige
 * Organisation soll ruhig aussehen, nicht kuenstlich dramatisiert.
 */
describe('emphasisFor', () => {
    it('laesst alles gleich, wenn nichts Aufmerksamkeit braucht', () => {
        expect(emphasisFor({ id: 'a', attentionId: null, selectedId: null })).toEqual({ opacity: 1, scale: 1 });
        expect(emphasisFor({ id: 'b', attentionId: null, selectedId: null })).toEqual({ opacity: 1, scale: 1 });
    });

    it('hebt hervor, worauf Môra schaut', () => {
        const gemeint = emphasisFor({ id: 'a', attentionId: 'a', selectedId: null });
        const andere = emphasisFor({ id: 'b', attentionId: 'a', selectedId: null });

        expect(gemeint.scale).toBeGreaterThan(andere.scale);
        expect(gemeint.opacity).toBeGreaterThan(andere.opacity);
    });

    // Eine eigene Auswahl schlaegt den Vorschlag: wer selbst klickt, will
    // dorthin schauen, nicht dorthin, wo Môra hinzeigt.
    it('gibt der eigenen Auswahl Vorrang vor Môras Vorschlag', () => {
        const gewaehlt = emphasisFor({ id: 'b', attentionId: 'a', selectedId: 'b' });
        const vorgeschlagen = emphasisFor({ id: 'a', attentionId: 'a', selectedId: 'b' });

        expect(gewaehlt.scale).toBeGreaterThan(vorgeschlagen.scale);
    });

    // Zuruecktreten heisst nicht verschwinden - man muss die anderen noch
    // lesen koennen, sonst ist es kein Feld mehr, sondern ein Einzelbild.
    it('laesst die zurueckgetretenen lesbar', () => {
        const andere = emphasisFor({ id: 'b', attentionId: 'a', selectedId: null });
        expect(andere.opacity).toBeGreaterThan(0.4);
    });

    it('ist deterministisch', () => {
        const eingabe = { id: 'a', attentionId: 'a', selectedId: null };
        expect(emphasisFor(eingabe)).toEqual(emphasisFor(eingabe));
    });
});
