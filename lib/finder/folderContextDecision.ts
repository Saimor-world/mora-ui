/**
 * Ob der Finder den Ordnerkontext holen soll.
 *
 * Herausgezogen aus apps/finder/index.tsx, weil dort ein Fehler steckte, den
 * man im Bauch der Komponente nicht pruefen konnte: ein Mondklick im
 * Universe springt direkt in einen Ordner, aber der Finder holte dafuer
 * keinen Kontext und zeigte "Start" statt des Ordnernamens - obwohl er
 * dessen Dokumente bereits korrekt auflistete.
 *
 * Die alte Bedingung verlangte zusaetzlich `knownFolderFromSpaces`, also
 * dass der Ordner in einer Karte steht, die erst beim AUFKLAPPEN eines
 * Bereichs gefuellt wird. Wer direkt springt, hat sie leer.
 *
 * Wenn der Aufrufer sagt "das ist ein Ordner", ist das die Information -
 * eine lazy geladene Karte kann sie nicht bestaetigen und darf sie deshalb
 * auch nicht widerlegen. Ein Fehlgriff faengt der bestehende catch-Zweig ab.
 */
export interface FolderContextDecision {
    currentFolderId: string | null;
    /** Was der Aufrufer beim Oeffnen als Ordner benannt hat. */
    startFolderId: string | null;
    /** Typ des Knotens im geladenen Baum, falls dort bekannt. */
    nodeType: string | null;
    knownFromSpaces: boolean;
}

export function shouldLoadFolderContext({
    currentFolderId,
    startFolderId,
    nodeType,
    knownFromSpaces,
}: FolderContextDecision): boolean {
    if (!currentFolderId) return false;

    // Der Baum weiss es - beste Quelle.
    if (nodeType === 'folder') return true;

    // Der Baum kennt den Knoten und sagt: kein Ordner. Dann nicht.
    if (nodeType) return false;

    // Der Baum kennt ihn nicht. Dann gilt die Zusicherung des Aufrufers -
    // aber nur fuer genau den Ordner, den er benannt hat.
    if (startFolderId && startFolderId === currentFolderId) return true;

    return knownFromSpaces;
}
