/**
 * Planetengröße nach echter Aktivität: Ordner (Monde) und ein offenes Signal machen den Planeten größer.
 * Kein Signal, keine Ordner → kleinste ruhige Größe. Nie mehr als +22 %, damit das Layout kollisionsfrei bleibt.
 */
export function activityScale(folders: number, active: boolean): number {
  const f = Math.max(0, Math.min(8, Number.isFinite(folders) ? folders : 0));
  const s = 0.86 + (f / 8) * 0.28 + (active ? 0.08 : 0);
  return Math.round(Math.min(1.22, s) * 1000) / 1000;
}
