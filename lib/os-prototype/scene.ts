/** Szenen wie im Legacy-Control-Center: automatisch nach Tageszeit. */
export type SceneId = 'flow' | 'build' | 'lounge' | 'night';
export const SCENES: Array<{ id: SceneId; label: string; range: string; from: number; to: number }> = [
  { id: 'flow', label: 'Flow', range: 'morgens · 05 – 11', from: 5, to: 11 },
  { id: 'build', label: 'Build', range: 'mittags · 11 – 17', from: 11, to: 17 },
  { id: 'lounge', label: 'Lounge', range: 'abends · 17 – 22', from: 17, to: 22 },
  { id: 'night', label: 'Nacht', range: 'nachts · 22 – 05', from: 22, to: 5 },
];
export function sceneFor(date = new Date()): (typeof SCENES)[number] {
  return sceneForHour(berlinHour(date));
}

/** Berlin-hour of a Date, used everywhere a greeting or scene follows the day. */
export function berlinHour(date = new Date()): number {
  const h = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' }).formatToParts(date).find((x) => x.type === 'hour')?.value;
  return Number(h ?? date.getHours());
}

/** One greeting for Home, Heute, Briefing and the companion. Hours match the scenes (Flow/Build/Lounge/Nacht). */
export function greetingFor(date = new Date(), name?: string | null): string {
  const scene = sceneForHour(berlinHour(date));
  const base = scene.id === 'flow' ? 'Guten Morgen' : scene.id === 'build' ? 'Guten Tag' : 'Guten Abend';
  const who = name?.trim();
  return who ? `${base}, ${who}.` : `${base}.`;
}

export function sceneForHour(hour: number): (typeof SCENES)[number] {
  return SCENES.find((s) => (s.from < s.to ? hour >= s.from && hour < s.to : hour >= s.from || hour < s.to)) ?? SCENES[1];
}
