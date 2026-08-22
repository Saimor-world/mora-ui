/**
 * Wo die Bereiche wirklich stehen - eine Quelle, aus der alle lesen.
 *
 * Vorher trug MyceliumOverlay eine eigene, fest einprogrammierte Karte der
 * Planetenpositionen mit dem Kommentar "matching exact UniverseView topology".
 * Der Kommentar stimmte zum Zeitpunkt, an dem er geschrieben wurde. Dann zog
 * das Feld auf buildOrganicUniverseLayout um, und das Netz haing seitdem neben
 * den Planeten - unbemerkt, weil eine Kopie nicht auffaellt, wenn sie falsch
 * wird.
 *
 * Der Ausweg ist nicht "richtiger kopieren", sondern gar nicht kopieren: das
 * Feld misst sich selbst und veroeffentlicht, wo seine Bereiche stehen.
 */

export interface FieldAnchor {
    id: string;
    name: string;
    color: string;
    /** Prozent der Feldbreite. */
    x: number;
    /** Prozent der Feldhoehe. */
    y: number;
}

/** Das gemessene Feld in Bildschirmkoordinaten. */
export interface FieldRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface ViewportAnchor {
    id: string;
    name: string;
    color: string;
    x: number;
    y: number;
}

export function anchorsToViewport(
    anchors: FieldAnchor[],
    rect: FieldRect | null,
): ViewportAnchor[] {
    // Ein Feld ohne Ausdehnung entsteht real: gemessen wird, bevor das Layout
    // steht. Ohne diese Pruefung faenden alle Anker auf demselben Punkt
    // zusammen und das Netz waere ein Stern im Nichts.
    if (!rect || rect.width <= 0 || rect.height <= 0) return [];

    return anchors.map((anchor) => ({
        id: anchor.id,
        name: anchor.name,
        color: anchor.color,
        x: rect.left + (anchor.x / 100) * rect.width,
        y: rect.top + (anchor.y / 100) * rect.height,
    }));
}
