import { anchorsToViewport, type FieldAnchor, type FieldRect } from '@/lib/universe/anchors';

const rect: FieldRect = { left: 200, top: 100, width: 1000, height: 600 };

const anchor = (id: string, x: number, y: number): FieldAnchor => ({
    id,
    name: id,
    color: '#67e8f9',
    x,
    y,
});

describe('anchorsToViewport', () => {
    // Der Fehler, den diese Datei ausschliesst: MyceliumOverlay trug eine
    // eigene, fest einprogrammierte Kopie der Planetenpositionen
    // (deptPosMap: product 0.50/0.18, intelligence 0.31/0.55, ...) mit dem
    // Kommentar "matching exact UniverseView topology". Der Kommentar stimmte
    // einmal. Dann rechnete buildOrganicUniverseLayout die Positionen aus, und
    // der Zugriff lief ohnehin ueber deptPosMap[dept.id] - wobei dept.id eine
    // UUID ist und niemals "product". Das Netz haing seitdem neben den
    // Planeten in der Luft.
    it('rechnet Prozentpunkte im Feld in Bildschirmpunkte um', () => {
        const out = anchorsToViewport([anchor('a', 50, 50)], rect);

        expect(out).toEqual([
            { id: 'a', name: 'a', color: '#67e8f9', x: 700, y: 400 },
        ]);
    });

    it('trifft die Ecken des Feldes', () => {
        const out = anchorsToViewport([anchor('tl', 0, 0), anchor('br', 100, 100)], rect);

        expect(out[0]).toMatchObject({ x: 200, y: 100 });
        expect(out[1]).toMatchObject({ x: 1200, y: 700 });
    });

    it('gibt nichts zurueck, wenn das Feld nicht gemessen ist', () => {
        expect(anchorsToViewport([anchor('a', 50, 50)], null)).toEqual([]);
        expect(anchorsToViewport([], rect)).toEqual([]);
    });

    // Ein Feld mit Breite 0 entsteht real: die Komponente misst, bevor das
    // Layout steht. Alle Anker landeten dann auf einem Punkt und das Netz
    // waere ein Stern im Nichts.
    it('gibt nichts zurueck, solange das Feld keine Ausdehnung hat', () => {
        expect(anchorsToViewport([anchor('a', 50, 50)], { left: 0, top: 0, width: 0, height: 600 })).toEqual([]);
        expect(anchorsToViewport([anchor('a', 50, 50)], { left: 0, top: 0, width: 800, height: 0 })).toEqual([]);
    });
});
