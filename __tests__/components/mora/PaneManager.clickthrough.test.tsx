import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Ein offenes Fenster darf nicht den ganzen Bildschirm blockieren.
 *
 * Befund vom 21.08.2026: Nach einem Klick auf "Mit Môra klären" im Universe
 * war danach NICHTS mehr klickbar - weder das Schliesskreuz des Detailfensters
 * noch der Knopf selbst. Beide wurden als "tote Knoepfe" gemeldet. Sie waren
 * nicht tot: `document.elementFromPoint` traf mitten auf dem Knopf ein fremdes
 * DIV, naemlich
 *
 *     <div className="pointer-events-auto absolute inset-0">   (PaneManager)
 *
 * innerhalb von `pointer-events-none fixed inset-0 z-[100]`.
 *
 * Dieser Wrapper haelt aber gar nichts: GlassPanel rendert per createPortal
 * nach document.body (components/layers/GlassPanel.tsx:433), FullBleed-Apps
 * ebenso. Uebrig blieb eine unsichtbare, bildschirmfuellende Klickfalle auf
 * z-100 - fuer jedes offene Fenster eine.
 *
 * Dieser Test prueft Quelltext statt Verhalten, und das ist hier die richtige
 * Wahl: in jsdom gibt es kein echtes Hit-Testing, `elementFromPoint` wuerde
 * den Fehler also gar nicht zeigen koennen. Gesichert werden muss die
 * Abwesenheit einer CSS-Klasse - genau das steht im Quelltext.
 */
describe('PaneManager: kein bildschirmfuellender Klickfaenger', () => {
    const source = readFileSync(
        join(__dirname, '..', '..', '..', 'components', 'mora', 'PaneManager.tsx'),
        'utf8',
    );

    it('legt keinen pointer-events-auto ueber den ganzen Bildschirm', () => {
        expect(source).not.toMatch(/pointer-events-auto\s+absolute\s+inset-0/);
    });

    it('haelt die aeussere Fensterebene weiterhin durchlaessig', () => {
        expect(source).toMatch(/pointer-events-none fixed inset-0 z-\[100\]/);
    });
});
