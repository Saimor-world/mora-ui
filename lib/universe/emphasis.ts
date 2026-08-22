/**
 * Wer hervortritt und wer zuruecktritt.
 *
 * Marius: "Nichts zieht den Blick auf eine Sache." Das Feld hatte vier
 * gleich schwere Planeten - richtig als Zustand, falsch als Dauerzustand.
 *
 * Die Hierarchie ist nicht erfunden, sondern folgt der Logik, die es schon
 * gibt (lib/mora/attention.ts): ein offener Vorfall oder eine fehlende
 * Datenquelle hebt genau einen Planeten hervor. Liegt nichts an, bleibt
 * alles gleich - eine ruhige Organisation soll ruhig aussehen, nicht
 * kuenstlich dramatisiert.
 */

export interface EmphasisInput {
    id: string;
    /** Worauf Môra gerade schaut, oder null. */
    attentionId: string | null;
    /** Was der Mensch selbst gewaehlt hat, oder null. */
    selectedId: string | null;
}

export interface Emphasis {
    opacity: number;
    scale: number;
}

const RUHIG: Emphasis = { opacity: 1, scale: 1 };
const HERVOR: Emphasis = { opacity: 1, scale: 1.06 };
// Zuruecktreten heisst nicht verschwinden: die anderen muessen lesbar
// bleiben, sonst ist es kein Feld mehr, sondern ein Einzelbild.
const ZURUECK: Emphasis = { opacity: 0.62, scale: 0.97 };

export function emphasisFor({ id, attentionId, selectedId }: EmphasisInput): Emphasis {
    // Wer selbst klickt, will dorthin schauen - nicht dorthin, wo Môra
    // hinzeigt. Die eigene Auswahl schlaegt den Vorschlag.
    if (selectedId) return id === selectedId ? HERVOR : ZURUECK;
    if (!attentionId) return RUHIG;
    return id === attentionId ? HERVOR : ZURUECK;
}
