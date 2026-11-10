/**
 * Bühne: jedes Bild der Werkstatt ist 1920×1080 „Einheiten“ groß und füllt das Fenster (cover).
 * Alle Objekte liegen in diesen Einheiten; die Kamera fährt nur per Transform.
 */
export const STAGE_W = 1920;
export const STAGE_H = 1080;
export interface Stage { k: number; x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export function coverStage(vw: number, vh: number): Stage {
  const k = Math.max(vw / STAGE_W, vh / STAGE_H);
  return { k, x: (vw - STAGE_W * k) / 2, y: (vh - STAGE_H * k) / 2 };
}

/** Rechteck in Bühnen-Einheiten → Fensterpixel. */
export const toScreen = (s: Stage, r: Rect): Rect => ({ x: s.x + r.x * s.k, y: s.y + r.y * s.k, w: r.w * s.k, h: r.h * s.k });

/**
 * Kamerafahrt auf ein Objekt: Skalierung und Versatz, die das Objekt (Fensterpixel) mittig auf `fill` des
 * Fensters bringen. Ergebnis als CSS-Transform mit transform-origin 0 0.
 */
export function cameraTo(target: Rect, vw: number, vh: number, fill = 0.9): { scale: number; tx: number; ty: number } {
  const scale = Math.max(1, Math.min((vw * fill) / Math.max(1, target.w), (vh * fill) / Math.max(1, target.h)));
  const cx = target.x + target.w / 2, cy = target.y + target.h / 2;
  return { scale, tx: vw / 2 - cx * scale, ty: vh / 2 - cy * scale };
}

/** Umgekehrt: ein Vollbild-Element so verkleinern, dass es genau auf `target` liegt (Start des Anflugs). */
export function shrinkTo(target: Rect, vw: number, vh: number): { sx: number; sy: number; tx: number; ty: number } {
  return { sx: target.w / Math.max(1, vw), sy: target.h / Math.max(1, vh), tx: target.x, ty: target.y };
}

/** Welche Welt? Morgens und mittags Morgennebel, abends und nachts die Nacht – wie der Dock (data-phase). */
export type World = 'morgennebel' | 'nacht';
export const worldFor = (phase: string | null | undefined): World => (phase === 'flow' || phase === 'build' ? 'morgennebel' : 'nacht');

/** Rand ober- und unterhalb des Raumbilds (gespiegelte Wand bzw. Boden), in Einheiten. */
export const ROOM_EXT = 200;
/**
 * Bühne des Raums: wie cover, aber bei schmalen Fenstern (4:3) so weit verkleinert, dass Regal und Pult
 * (x0…x1) beide sichtbar bleiben. Die entstehende Höhe füllt der gespiegelte Rand des Bilds (ROOM_EXT).
 */
export function roomStage(cover: Stage, x0 = 20, x1 = 1720): Stage {
  const vw = STAGE_W * cover.k + 2 * cover.x, vh = STAGE_H * cover.k + 2 * cover.y;
  const span = x1 - x0;
  if (vw / cover.k >= span) {
    // Breit genug: cover, aber nie so verschoben, dass x0…x1 angeschnitten wird.
    const x = Math.min(vw - x1 * cover.k, Math.max(-x0 * cover.k, cover.x));
    return { k: cover.k, x, y: cover.y };
  }
  const k = Math.max(vw / span, vh / (STAGE_H + 2 * ROOM_EXT));
  return { k, x: -x0 * k + (vw - span * k) / 2, y: (vh - STAGE_H * k) / 2 };
}
