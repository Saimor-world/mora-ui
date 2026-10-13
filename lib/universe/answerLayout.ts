/** Universe v2 – wo die Antwort im Raum steht und wie weit Planeten ausweichen. */
export function answerBox(vw: number, cx: number, cy: number) {
  // Schmal genug, dass die Planeten links und rechts frei bleiben.
  const width = Math.round(Math.max(300, Math.min(380, vw * 0.26)));
  return { width, left: cx - width / 2, top: cy - 90 };
}

/**
 * Wie weit ein Planet zur Seite rückt, solange eine Antwort offen ist.
 * Nur horizontal, weg von der Mitte; Planeten außerhalb des Antwortkorridors bleiben stehen.
 */
export function easeApart(planetX: number, planetR: number, cx: number, answerWidth: number, gap = 28): number {
  const half = answerWidth / 2 + gap;
  const dx = planetX - cx;
  const inner = Math.abs(dx) - planetR;
  if (inner >= half) return 0;
  const push = half - inner;
  return Math.round(dx >= 0 ? push : -push);
}
