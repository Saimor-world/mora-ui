/**
 * MÔRA-Zeile im Raum: freie Sprache → strukturierte Einstellungsänderung.
 * Weg 1 (echt): CORE /v3/chat mit fester Antwortform (nur JSON), danach streng
 * geprüft – nur bekannte Felder, Werte geklemmt. Weg 2 (offline): Schlüsselwörter.
 * Angewendet wird nie direkt: der Raum zeigt die Änderung, Marius behält oder nimmt zurück.
 */
import type { RitualSceneId } from '@/lib/os/ritualMode';

export type RaumState = { scene: RitualSceneId; volume: number; ambientOn: boolean; warmth: number; quiet: number | null };
export type RaumChange = { scene?: RitualSceneId; volume?: number; ambientOn?: boolean; warmth?: number; quiet?: number | null; open?: string };
export type RaumSectionRef = { id: string; label: string };
export type RaumIntent = { change: RaumChange; source: 'mora' | 'offline'; note?: string };

const SCENES: RitualSceneId[] = ['flow', 'build', 'lounge', 'night'];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function raumPrompt(text: string, s: RaumState, sections: RaumSectionRef[]): string {
  return [
    'Du steuerst die Einstellungen von Saimôr. Antworte NUR mit einem JSON-Objekt, ohne Text davor oder danach.',
    'Erlaubte Felder (alle optional): ',
    '"scene": "flow"|"build"|"lounge"|"night" (Licht: Morgen, Tag, Abend/warm, Nacht),',
    '"volume": Zahl 0-100 (Lautstärke Hintergrundklang),',
    '"ambientOn": true|false (Hintergrundklang an/aus),',
    '"warmth": Zahl 0-100 (MÔRAs Stimme: 0 klar, 100 warm),',
    '"quiet": Stunde 0-23 oder null (Stille ab dieser Stunde, null = keine Stille),',
    `"open": eine von ${sections.map((x) => `"${x.id}"`).join(', ')} (nur wenn ein Bereich geöffnet werden soll),`,
    '"note": kurzer deutscher Satz (max. 8 Wörter), was du änderst.',
    'Wenn nichts davon passt: {} .',
    `Aktuell: ${JSON.stringify({ scene: s.scene, volume: Math.round(s.volume * 100), ambientOn: s.ambientOn, warmth: s.warmth, quiet: s.quiet })}.`,
    `Bitte: ${text}`,
  ].join('\n');
}

/** Nimmt nur, was erlaubt ist. Unbekanntes wird verworfen. */
export function validateRaumChange(raw: unknown, sections: RaumSectionRef[]): { change: RaumChange; note?: string } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const c: RaumChange = {};
  if (typeof r.scene === 'string' && (SCENES as string[]).includes(r.scene)) c.scene = r.scene as RitualSceneId;
  if (typeof r.volume === 'number' && Number.isFinite(r.volume)) c.volume = clamp(r.volume, 0, 100) / 100;
  if (typeof r.ambientOn === 'boolean') c.ambientOn = r.ambientOn;
  if (typeof r.warmth === 'number' && Number.isFinite(r.warmth)) c.warmth = Math.round(clamp(r.warmth, 0, 100));
  if (r.quiet === null) c.quiet = null;
  else if (typeof r.quiet === 'number' && Number.isInteger(r.quiet) && r.quiet >= 0 && r.quiet <= 23) c.quiet = r.quiet;
  if (typeof r.open === 'string' && sections.some((x) => x.id === r.open)) c.open = r.open;
  const note = typeof r.note === 'string' ? r.note.trim().slice(0, 80) : undefined;
  return { change: c, note };
}

/** Erstes JSON-Objekt aus einer Antwort (auch in ```json-Blöcken). */
export function extractJson(reply: string): unknown {
  const m = reply.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

/** Offline-Weg: Schlüsselwörter. */
export function parseRaumLocal(text: string, s: RaumState, sections: RaumSectionRef[]): RaumChange {
  const t = text.trim().toLowerCase();
  const c: RaumChange = {};
  if (/stimme/.test(t)) {
    if (/wärmer|weicher|tiefer|warm/.test(t)) c.warmth = Math.min(100, s.warmth + 25);
    else if (/klarer|heller|frischer|klar/.test(t)) c.warmth = Math.max(0, s.warmth - 25);
  } else if (/wärmer|abend|gemütlich|lounge/.test(t)) c.scene = 'lounge';
  else if (/nacht|dunkler|dunkel/.test(t)) c.scene = 'night';
  else if (/morgen|frisch/.test(t)) c.scene = 'flow';
  else if (/heller|tag|fokus|arbeit/.test(t)) c.scene = 'build';
  if (/leiser/.test(t)) c.volume = Math.max(0, s.volume - 0.2);
  if (/lauter/.test(t)) c.volume = Math.min(1, s.volume + 0.2);
  if (/(musik|klang) (an|ein)|spiel/.test(t)) c.ambientOn = true;
  if (/(musik|klang) aus/.test(t)) c.ambientOn = false;
  const q = t.match(/(still|ruhe|stille)\D*(\d{1,2})/);
  if (q) c.quiet = Number(q[2]) % 24;
  else if (/keine (stille|ruhe)/.test(t)) c.quiet = null;
  if (!Object.keys(c).length) {
    const sec = sections.find((x) => t.includes(x.label.toLowerCase().split(' ')[0]));
    if (sec) c.open = sec.id;
  }
  return c;
}

export type ChatFn = (body: Record<string, unknown>) => Promise<unknown>;

export async function resolveRaumIntent(text: string, s: RaumState, sections: RaumSectionRef[], chat: ChatFn, timeoutMs = 12000): Promise<RaumIntent> {
  try {
    const res = await Promise.race([
      chat({ message: raumPrompt(text, s, sections), history: [], temperature: 0, provider_preference: 'auto' }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
    ]) as { reply?: string; response?: string } | null;
    const reply = res?.reply || res?.response || '';
    const v = validateRaumChange(extractJson(reply), sections);
    if (v) return { change: v.change, source: 'mora', note: v.note };
  } catch { /* offline → Fallback */ }
  return { change: parseRaumLocal(text, s, sections), source: 'offline' };
}
