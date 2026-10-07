/** Szenen wie im Legacy-Control-Center: automatisch nach Tageszeit. */
export type SceneId = 'flow' | 'build' | 'lounge' | 'night';
export const SCENES: Array<{ id: SceneId; label: string; range: string; from: number; to: number }> = [
  { id: 'flow', label: 'Flow', range: 'morgens · 05 – 11', from: 5, to: 11 },
  { id: 'build', label: 'Build', range: 'mittags · 11 – 17', from: 11, to: 17 },
  { id: 'lounge', label: 'Lounge', range: 'abends · 17 – 22', from: 17, to: 22 },
  { id: 'night', label: 'Nacht', range: 'nachts · 22 – 05', from: 22, to: 5 },
];
export function sceneFor(date = new Date()): (typeof SCENES)[number] {
  const h = date.getHours();
  return SCENES.find((s) => (s.from < s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to)) ?? SCENES[1];
}
