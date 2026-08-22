import { groupFoldersByDepartment } from '@/lib/universe/moonsFromFolders';

const folder = (id: string, name: string, spaceId: string) => ({ id, name, space_id: spaceId });

/**
 * Marius: "monde als ordner ... die Monde sollen die Namen bekommen, die sie
 * haben sollen anhand der Planeten, um die sie kreisen - ergo Abteilung, ergo
 * welche Dateien das halt sind."
 *
 * Bis hierher waren Monde die BEREICHE einer Abteilung (eine Ebene ueber den
 * Ordnern). Der Baum liefert Bereiche eager, Ordner aber nur beim Aufklappen -
 * deshalb war das der bequeme, nicht der richtige Weg. Diese Funktion ordnet
 * die echten Ordner ihrer Abteilung zu, damit ein Mond wirklich ein Ordner
 * ist.
 */
describe('groupFoldersByDepartment', () => {
    const spaceToDepartment = { 'sp-1': 'growth', 'sp-2': 'growth', 'sp-3': 'product' };

    it('gibt nichts zurueck, wenn es keine Ordner gibt', () => {
        expect(groupFoldersByDepartment([], spaceToDepartment)).toEqual({});
    });

    it('haengt jeden Ordner an die Abteilung seines Bereichs', () => {
        const grouped = groupFoldersByDepartment(
            [folder('f1', 'Pipeline', 'sp-1'), folder('f2', 'Preise', 'sp-2'), folder('f3', '2027', 'sp-3')],
            spaceToDepartment,
        );

        expect(grouped.growth.map((f) => f.name)).toEqual(['Pipeline', 'Preise']);
        expect(grouped.product.map((f) => f.name)).toEqual(['2027']);
    });

    // Ein Ordner in einem Bereich ohne Abteilung darf nicht willkuerlich
    // irgendwo landen - lieber gar kein Mond als ein falscher.
    it('laesst einen Ordner ohne zuordenbare Abteilung weg', () => {
        const grouped = groupFoldersByDepartment(
            [folder('f1', 'Verwaist', 'sp-unbekannt'), folder('f2', 'Pipeline', 'sp-1')],
            spaceToDepartment,
        );

        expect(Object.keys(grouped)).toEqual(['growth']);
        expect(grouped.growth.map((f) => f.name)).toEqual(['Pipeline']);
    });

    it('behaelt die Reihenfolge, damit sich Mondbahnen nicht bei jedem Laden umsortieren', () => {
        const input = [folder('f2', 'B', 'sp-1'), folder('f1', 'A', 'sp-1')];
        expect(groupFoldersByDepartment(input, spaceToDepartment).growth.map((f) => f.id)).toEqual(['f2', 'f1']);
    });

    it('verkraftet fehlende Felder, ohne zu stuerzen', () => {
        const grouped = groupFoldersByDepartment(
            [{ id: 'f1', name: '', space_id: 'sp-1' } as any, { id: 'f2', space_id: 'sp-1' } as any],
            spaceToDepartment,
        );
        expect(grouped.growth).toHaveLength(2);
        expect(grouped.growth.every((f) => typeof f.name === 'string' && f.name.length > 0)).toBe(true);
    });
});
