import { shouldLoadFolderContext } from '@/lib/finder/folderContextDecision';

/**
 * Ein Mondklick im Universe springt direkt in einen Ordner. Der Finder holte
 * dafuer aber keinen Ordnerkontext - und zeigte deshalb "Start" statt des
 * Ordnernamens, obwohl er dessen Dokumente bereits korrekt auflistete.
 *
 * Die Bedingung war:
 *
 *   const isDirectFolderStart =
 *       !currentNode && startFolderId === currentFolderId && knownFolderFromSpaces;
 *
 * knownFolderFromSpaces stammt aus einer Karte, die erst beim AUFKLAPPEN
 * eines Bereichs gefuellt wird. Wer direkt aus dem Universe kommt, hat sie
 * leer. Die Zusicherung des Aufrufers ("das ist ein Ordner") wurde also
 * genau dann ignoriert, wenn sie gebraucht wurde.
 */
describe('shouldLoadFolderContext', () => {
    it('laedt, wenn der Baum den Knoten kennt und er ein Ordner ist', () => {
        expect(shouldLoadFolderContext({
            currentFolderId: 'f1', startFolderId: null, nodeType: 'folder', knownFromSpaces: false,
        })).toBe(true);
    });

    // Der eigentliche Fehler.
    it('vertraut dem Aufrufer, auch wenn der Baum den Ordner noch nicht kennt', () => {
        expect(shouldLoadFolderContext({
            currentFolderId: 'f1', startFolderId: 'f1', nodeType: null, knownFromSpaces: false,
        })).toBe(true);
    });

    it('laedt nicht fuer einen Knoten, der kein Ordner ist', () => {
        expect(shouldLoadFolderContext({
            currentFolderId: 'n1', startFolderId: null, nodeType: 'node', knownFromSpaces: false,
        })).toBe(false);
    });

    // Ein Bereich ist kein Ordner - /v3/folders/{id}/context wuerde 404 geben.
    it('laedt nicht fuer einen Bereich', () => {
        expect(shouldLoadFolderContext({
            currentFolderId: 's1', startFolderId: null, nodeType: 'space', knownFromSpaces: false,
        })).toBe(false);
    });

    it('laedt nicht ohne aktuellen Ordner', () => {
        expect(shouldLoadFolderContext({
            currentFolderId: null, startFolderId: 'f1', nodeType: null, knownFromSpaces: true,
        })).toBe(false);
    });

    // Weitergeblaettert: der Startordner ist nicht mehr der aktuelle, und der
    // Baum kennt den neuen noch nicht - dann greift die Zusicherung nicht mehr.
    it('vertraut der Zusicherung nur fuer genau den genannten Ordner', () => {
        expect(shouldLoadFolderContext({
            currentFolderId: 'f2', startFolderId: 'f1', nodeType: null, knownFromSpaces: false,
        })).toBe(false);
    });
});
