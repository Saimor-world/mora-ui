import type { LandscapeInput } from './landscape';

/** Local preview only (no CORE session). Generic, clearly marked example content — no real people or companies. */
export function sampleLandscapeInput(): Omit<LandscapeInput, 'finance' | 'labs'> {
  return {
    sample: true,
    tasks: { open: 4, overdue: 1, dueToday: 1, titles: ['Beispiel: Angebot finalisieren', 'Beispiel: Belege hochladen'] },
    calendar: { titles: ['Beispiel: Wochenplanung', 'Beispiel: Fokuszeit'] },
    mail: { unread: 2, subjects: ['Beispiel: Rückfrage zum Angebot', 'Beispiel: Rechnung Oktober', 'Beispiel: Newsletter'] },
    memories: { count: 3, titles: ['Beispiel: Ton für Kundenmails', 'Beispiel: Quartalsziele', 'Beispiel: Ablage-Regeln'] },
    spaces: { names: ['Beispiel: Vertrieb', 'Beispiel: Produkt', 'Beispiel: Betrieb', 'Beispiel: Marketing'] },
    connections: { configured: [], missing: ['E-Mail', 'Kalender', 'Cloud-Speicher', 'Feeds'] },
  };
}
