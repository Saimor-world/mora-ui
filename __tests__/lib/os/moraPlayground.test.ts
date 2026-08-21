import { describeMoraPlaygroundTarget } from '@/lib/os/moraPlayground';

function el(html: string): Element {
    const host = document.createElement('div');
    host.innerHTML = html.trim();
    return host.firstElementChild as Element;
}

/**
 * Der Chip oben rechts zeigt, welches Element Môra gerade als Ziel hat.
 *
 * Zwei unabhaengige Kritik-Durchlaeufe lasen ihn als Statusanzeige und
 * meldeten ihn als Fehler: nach einem Klick auf einen Planeten stand dort
 * "GROWTH AUSWAEHLEN" - ein Imperativ, obwohl Growth bereits ausgewaehlt
 * war. Beim Nightwatch-Feld stand der komplette Kacheltext.
 *
 * Die Ursache: aria-label wird fuer Screenreader als HANDLUNGSAUFFORDERUNG
 * geschrieben ("Growth auswaehlen"), nicht als Name. Als Zielbezeichnung ist
 * das falsch - ein Ziel heisst "Growth".
 */
describe('describeMoraPlaygroundTarget', () => {
    it('nimmt data-mora-label, wenn eine Komponente ihren Namen selbst kennt', () => {
        const target = describeMoraPlaygroundTarget(
            el('<button data-mora-label="Growth" aria-label="Growth auswählen">Growth 2 Bereiche 5 Docs</button>'),
        );
        expect(target.label).toBe('Growth');
    });

    // Der eigentliche Befund aus der Kritik.
    it('streicht die Handlungsaufforderung aus einem aria-label', () => {
        expect(describeMoraPlaygroundTarget(el('<button aria-label="Growth auswählen"></button>')).label).toBe('Growth');
        expect(describeMoraPlaygroundTarget(el('<button aria-label="Auswahl schließen"></button>')).label).toBe('Auswahl');
        expect(describeMoraPlaygroundTarget(el('<button aria-label="Nightwatch öffnen"></button>')).label).toBe('Nightwatch');
    });

    it('laesst ein aria-label in Ruhe, das keine Aufforderung ist', () => {
        expect(describeMoraPlaygroundTarget(el('<button aria-label="Posteingang"></button>')).label).toBe('Posteingang');
    });

    // "auswählen" allein ist der ganze Name, nicht Name + Verb - da bliebe
    // sonst ein leerer Chip.
    it('streicht nicht, wenn danach nichts uebrig bliebe', () => {
        expect(describeMoraPlaygroundTarget(el('<button aria-label="öffnen"></button>')).label).toBe('öffnen');
    });

    it('faellt weiterhin auf kurzen sichtbaren Text zurueck', () => {
        expect(describeMoraPlaygroundTarget(el('<button>Speichern</button>')).label).toBe('Speichern');
    });

    // Ein langer Kacheltext darf nicht in den Chip - genau das passierte bei
    // Nightwatch ("SYSTEME RUHIG OEFFNEN KEINE BELEGTEN VORFAELLE ...").
    it('nimmt keinen langen Fliesstext als Zielnamen', () => {
        const long = 'Systeme ruhig Öffnen '.repeat(12);
        const target = describeMoraPlaygroundTarget(el(`<button>${long}</button>`));
        expect(target.label).toBe('button');
    });
});
