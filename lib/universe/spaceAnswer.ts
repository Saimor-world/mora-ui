// Universe v2 – MÔRA ohne Fenster. Reine Logik für Antworten im Raum (testbar, ohne DOM).
import type { MoraMode, MoraModeProposal, MoraModeSource } from '@/lib/mora/moraModes';

export type SpaceAnswer = {
  mode: MoraMode;
  question: string;
  text: string;
  sources: MoraModeSource[];
  proposals: MoraModeProposal[];
  flags: string[];
};

const HINTS: [RegExp, RegExp][] = [
  [/finanz|buchhalt|rechnung|bank|umsatz|zahlung|liquidit/i, /finanz|wirtschaft|finance/i],
  [/kalender|termin|post|mail|eingang|brief/i, /post|termin|kalender|mail/i],
  [/werkstatt|freigabe|github|deploy|engineering|website|code/i, /werkstatt|engineering|technik|product/i],
  [/wissen|dokument|leitfaden|notiz|handbuch|web|artikel/i, /wissen|knowledge/i],
  [/wache|nightwatch|server|störung|alarm/i, /wache|watch/i],
];

/** Ordnet eine Quelle dem passenden Planeten zu – nur bei echtem Treffer, nie geraten. */
export function planetForSource(source: MoraModeSource, planets: string[]): number | null {
  const hay = `${source.title ?? ''} ${source.kind ?? ''} ${source.snippet ?? ''}`;
  for (const [src, planet] of HINTS) {
    if (!src.test(hay)) continue;
    const i = planets.findIndex((n) => planet.test(n));
    if (i >= 0) return i;
  }
  return null;
}

/** Ruhige Typografie: Antwort in höchstens N Sätze kürzen; der Rest lebt im Fenster. */
export function calmExcerpt(text: string, maxChars = 420): { excerpt: string; truncated: boolean } {
  const clean = text.replace(/\s+/g, ' ').replace(/[#*_`>]+/g, '').trim();
  if (clean.length <= maxChars) return { excerpt: clean, truncated: false };
  const cut = clean.slice(0, maxChars);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return { excerpt: (end > maxChars * 0.5 ? cut.slice(0, end + 1) : cut.replace(/\s\S*$/, '') + ' …'), truncated: true };
}

/** Beispielantworten nur für die lokale Demo (Cookie local_demo_fallback). */
export function demoAnswer(mode: MoraMode, question: string): SpaceAnswer {
  if (mode === 'bauen') {
    return { mode, question, flags: [], sources: [{ title: 'Buchhaltung · Offene Posten', kind: 'Finanzen' }],
      text: 'Ich würde eine freundliche Zahlungserinnerung für R-2041 vorbereiten. Ausgeführt wird nichts, bevor du zustimmst.',
      proposals: [{ id: 'demo-reminder', label: 'Zahlungserinnerung für R-2041 vorbereiten', risk: 'gering', status: 'awaiting_approval' }] };
  }
  if (mode === 'recherche') {
    return { mode, question, flags: [], proposals: [],
      text: 'Heute zählen zwei Dinge: Die Rechnung R-2041 ist seit 14 Tagen offen, und um 10:00 steht das Bankgespräch an. Beides hängt zusammen – mit der offenen Summe gehst du stärker ins Gespräch.',
      sources: [{ title: 'Buchhaltung · Offene Posten', kind: 'Finanzen' }, { title: 'Kalender · heute', kind: 'Termine' }] };
  }
  return { mode, question, flags: [], proposals: [], sources: [],
    text: 'Ein ruhiger Start. Wenn du nur eine Sache heute schaffst, dann das Bankgespräch gut vorbereiten – der Rest kann warten.' };
}
