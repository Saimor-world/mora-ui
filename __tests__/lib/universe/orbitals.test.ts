import { buildOrbitals, MAX_VISIBLE_STARS } from '@/lib/universe/orbitals';

const space = (id: string, name: string) => ({ id, name });

/**
 * Marius' Metapher, in seinen Worten: "planeten ... monde als ordner ...
 * sterne als daten". Diese Datei haelt die Mathematik dafuer fest.
 *
 * Wichtig: Monde sind ECHTE Bereiche mit echten Namen (aus dem Baum),
 * Sterne stehen fuer echte Dokumente (Anzahl aus den Statistiken). Keine
 * Ebene erfindet Objekte, die es nicht gibt.
 */
describe('buildOrbitals', () => {
    it('gibt nichts zurueck, wenn ein Bereich leer ist', () => {
        const out = buildOrbitals({ id: 'a', diameter: 120, spaces: [], documentCount: 0 });
        expect(out.moons).toEqual([]);
        expect(out.stars).toEqual([]);
    });

    it('macht aus jedem echten Bereich genau einen Mond', () => {
        const out = buildOrbitals({
            id: 'product',
            diameter: 140,
            spaces: [space('s1', 'Roadmap'), space('s2', 'Spezifikationen')],
            documentCount: 0,
        });

        expect(out.moons.map((m) => m.name)).toEqual(['Roadmap', 'Spezifikationen']);
        expect(out.moons.map((m) => m.id)).toEqual(['s1', 's2']);
    });

    it('verteilt Monde rundherum, nicht uebereinander', () => {
        const out = buildOrbitals({
            id: 'x',
            diameter: 140,
            spaces: [space('a', 'A'), space('b', 'B'), space('c', 'C'), space('d', 'D')],
            documentCount: 0,
        });

        const angles = out.moons.map((m) => m.angle).sort((p, q) => p - q);
        for (let i = 1; i < angles.length; i += 1) {
            expect(angles[i] - angles[i - 1]).toBeGreaterThan(0.9);
        }
    });

    it('haelt Monde ausserhalb des Planeten', () => {
        const diameter = 140;
        const out = buildOrbitals({
            id: 'x', diameter, spaces: [space('a', 'A')], documentCount: 0,
        });

        expect(out.moons[0].distance).toBeGreaterThan(diameter / 2);
    });

    it('macht aus jedem Dokument einen Stern', () => {
        const out = buildOrbitals({ id: 'x', diameter: 130, spaces: [], documentCount: 9 });
        expect(out.stars).toHaveLength(9);
    });

    // Saimoer HQ hat real 706 Dokumente in einer einzigen Firma. 706 einzeln
    // animierte Punkte pro Planet waeren weder lesbar noch fluessig - die
    // echte Zahl steht ohnehin als Text am Planeten.
    it('deckelt die sichtbaren Sterne, statt den Browser zu ueberladen', () => {
        const out = buildOrbitals({ id: 'x', diameter: 130, spaces: [], documentCount: 706 });
        expect(out.stars).toHaveLength(MAX_VISIBLE_STARS);
    });

    it('haelt Sterne ausserhalb des Planetenkoerpers', () => {
        const diameter = 130;
        const out = buildOrbitals({ id: 'x', diameter, spaces: [], documentCount: 20 });
        out.stars.forEach((star) => {
            expect(Math.hypot(star.x, star.y)).toBeGreaterThan(diameter / 2);
        });
    });

    it('ist deterministisch - gleiche Eingabe, gleiches Bild', () => {
        const input = { id: 'growth', diameter: 150, spaces: [space('s', 'Vertrieb')], documentCount: 12 };
        expect(buildOrbitals(input)).toEqual(buildOrbitals(input));
    });

    it('gibt zwei Bereichen unterschiedliche Sternenbilder', () => {
        const a = buildOrbitals({ id: 'growth', diameter: 140, spaces: [], documentCount: 10 });
        const b = buildOrbitals({ id: 'product', diameter: 140, spaces: [], documentCount: 10 });
        expect(a.stars).not.toEqual(b.stars);
    });
});

/**
 * Marius: "die Monde sind grau, es sind keine echten Inhalte."
 * CORE liefert node_count je Ordner - der Mond darf das zeigen, statt eine
 * Zufallsgroesse zu tragen.
 */
describe('Monde tragen echten Inhalt', () => {
    it('macht einen vollen Ordner groesser als einen leeren', () => {
        const [leer] = buildOrbitals({
            id: 'x', diameter: 120, documentCount: 0,
            spaces: [{ id: 'a', name: 'Leer', documents: 0 }],
        }).moons;
        const [voll] = buildOrbitals({
            id: 'x', diameter: 120, documentCount: 0,
            spaces: [{ id: 'a', name: 'Voll', documents: 12 }],
        }).moons;

        expect(voll.size).toBeGreaterThan(leer.size);
    });

    it('fuehrt die echte Dokumentzahl mit', () => {
        const [moon] = buildOrbitals({
            id: 'x', diameter: 120, documentCount: 0,
            spaces: [{ id: 'a', name: 'Preise', documents: 2 }],
        }).moons;
        expect(moon.documents).toBe(2);
    });

    // Ein Ordner ohne bekannte Zahl darf nicht so aussehen, als waere er voll.
    it('behandelt eine fehlende Zahl als leer, nicht als unbekannt-gross', () => {
        const [moon] = buildOrbitals({
            id: 'x', diameter: 120, documentCount: 0,
            spaces: [{ id: 'a', name: 'Ohne Angabe' }],
        }).moons;
        expect(moon.documents).toBe(0);
    });
});
