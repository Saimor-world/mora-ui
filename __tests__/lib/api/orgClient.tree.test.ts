import { mapTreeResponseToNodes } from '@/lib/api/orgClient';
import { UNASSIGNED_DEPARTMENT_ID, UNASSIGNED_DEPARTMENT_NAME } from '@/lib/constants/tree';

/**
 * CORE liefert seit dem 21.08.2026 additiv `unassigned_spaces` - Spaces ohne
 * department_id, die vorher stillschweigend verworfen wurden (2 von 8 bei der
 * echten Saimoer-HQ-Firma, mit 2 Ordnern und 7 echten Dokumenten). Diese
 * Zuordnung buendelt sie zu einem synthetischen, department-foermigen
 * Baumeintrag, damit alles, was den Baum liest (allen voran Universe), sie
 * ohne Sonderfall wie eine Abteilung behandeln kann.
 */
describe('mapTreeResponseToNodes: nicht zugeordnete Bereiche', () => {
    it('haengt nichts an, wenn nichts unzugeordnet ist', () => {
        const nodes = mapTreeResponseToNodes({
            departments: [{ id: 'd1', name: 'Product', slug: 'product', spaces: [] }],
            unassigned_spaces: [],
        });

        expect(nodes.map((n) => n.id)).toEqual(['d1']);
    });

    it('buendelt unassigned_spaces zu einem department-foermigen Eintrag', () => {
        const nodes = mapTreeResponseToNodes({
            departments: [{ id: 'd1', name: 'Product', slug: 'product', spaces: [] }],
            unassigned_spaces: [{ id: 's-orphan', name: 'My Space', slug: 'my-space', folders: [] }],
        });

        const bucket = nodes.find((n) => n.id === UNASSIGNED_DEPARTMENT_ID);
        expect(bucket).toBeDefined();
        expect(bucket?.type).toBe('department');
        expect(bucket?.name).toBe(UNASSIGNED_DEPARTMENT_NAME);
        expect(bucket?.children?.map((c) => c.id)).toEqual(['s-orphan']);
    });

    it('laesst ein fehlendes Feld unassigned_spaces genauso leer wie ein leeres', () => {
        const nodes = mapTreeResponseToNodes({
            departments: [{ id: 'd1', name: 'Product', slug: 'product', spaces: [] }],
        });

        expect(nodes.find((n) => n.id === UNASSIGNED_DEPARTMENT_ID)).toBeUndefined();
    });
});
