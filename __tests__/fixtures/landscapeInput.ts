import type { LandscapeInput } from '@/features/universe/data/landscape';

/** Test-Fixture (nur Tests): ein kleines Tagesbild in der Form, die CORE liefert. */
export function landscapeFixture(): Omit<LandscapeInput, 'finance' | 'labs'> {
  return {
    sample: true,
    tasks: { open: 3, overdue: 1, dueToday: 1, titles: ['Instagram: Herbst-Designs posten', 'Gel-Farbe Herbstrot nachbestellen', 'Angebot schreiben'] },
    calendar: { titles: ['Neumodellage Gel – Sophie', 'Auffüllen – Fr. Demir'] },
    mail: { unread: 1, subjects: ['Terminanfrage Samstag', 'Lieferung Gel-Farben'] },
    memories: { count: 2, titles: ['Sophie mag Nude-Töne', 'Lieferant liefert dienstags'] },
    spaces: { names: ['Studio', 'Wissen'] },
    connections: { configured: [], missing: ['E-Mail', 'Kalender', 'Cloud-Speicher', 'Feeds'] },
  };
}
