/**
 * Monde sind Ordner - nicht Bereiche.
 *
 * Bis hierher kreisten die BEREICHE einer Abteilung als Monde. Das war der
 * bequeme Weg: der Baum liefert Bereiche eager mit, Ordner erst beim
 * Aufklappen. Gemeint war aber, was Marius von Anfang an gesagt hat -
 * "monde als ordner". Ein Mond soll ein Ordner sein, mit dem Namen, den er
 * wirklich traegt.
 *
 * GET /v3/folders?company_id=... liefert alle Ordner der Firma in einem
 * Abruf; die Zuordnung zur Abteilung laeuft ueber den Bereich, in dem der
 * Ordner liegt.
 */

export interface RawFolder {
    id: string;
    name?: string;
    space_id?: string;
    node_count?: number;
    updated_at?: string | null;
}

export interface MoonFolder {
    id: string;
    name: string;
    /** Echte Dokumentzahl aus CORE (node_count) - nicht geschaetzt. */
    documents: number;
    /** Wann zuletzt angefasst - wird zur Helligkeit des Mondes. */
    updatedAt?: string | null;
}

export function groupFoldersByDepartment(
    folders: RawFolder[],
    spaceToDepartment: Record<string, string>,
): Record<string, MoonFolder[]> {
    const grouped: Record<string, MoonFolder[]> = {};

    folders.forEach((folder) => {
        const departmentId = folder.space_id ? spaceToDepartment[folder.space_id] : undefined;
        // Ein Ordner ohne zuordenbare Abteilung bekommt keinen Mond. Lieber
        // gar keiner als einer, der um den falschen Planeten kreist.
        if (!departmentId) return;

        if (!grouped[departmentId]) grouped[departmentId] = [];
        grouped[departmentId].push({
            id: String(folder.id),
            name: String(folder.name || '').trim() || 'Ordner',
            documents: Math.max(0, Number(folder.node_count) || 0),
            updatedAt: folder.updated_at ?? null,
        });
    });

    return grouped;
}
