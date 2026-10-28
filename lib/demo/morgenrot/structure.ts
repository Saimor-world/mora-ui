import type { JobRoleId } from './jobRoles';

/**
 * Firmenstruktur als Universum (FIKTIV): Planeten = Abteilungen, Monde = Ordner, Einträge = Dateien.
 * Alle Inhalte sind ausgedacht und nur für die Vorführung.
 */
export interface DemoFile { id: string; name: string; meta: string; body: string[] }
export interface DemoMoon {
  id: string;
  title: string;
  files: DemoFile[];
  loadError?: boolean;
  hint?: string;
  disabled?: boolean;
}
export interface DemoPlanet { id: string; title: string; jobRoles: JobRoleId[]; glass: 'bluegrey' | 'lavender' | 'sage' | 'champagne' | 'paleblue'; moons: DemoMoon[] }

const f = (id: string, name: string, meta: string, ...body: string[]): DemoFile => ({ id, name, meta, body });

export const MORGENROT_STRUCTURE: DemoPlanet[] = [
  { id: 'service', title: 'Service', jobRoles: ['service'], glass: 'sage', moons: [
    { id: 's-res', title: 'Reservierungen', files: [
      f('res-1', 'Heute 12:30 · 12 Personen', 'Firmenessen Kanzlei Weber (fiktiv)', 'Tisch 4–6 zusammenstellen.', 'Zwei vegetarisch, eine Person glutenfrei.', 'Rechnung als Sammelrechnung.'),
      f('res-2', 'Heute 15:00 · 4 Personen', 'Geburtstag, Torte wird mitgebracht', 'Tortenteller und Kerzen bereitlegen.'),
      f('res-3', 'Do 09:00 · 6 Personen', 'Frühstück Elternabend (fiktiv)', 'Großes Frühstück, zweimal Hafermilch.') ] },
    { id: 's-bew', title: 'Bewertungen', files: [
      f('rev-1', '★★★★★ „Bester Flat White der Stadt“', 'Google · gestern', 'Antwort-Entwurf: Danke dir! Wir sagen es Tarek – die Zimtschnecken kommen morgens um sieben frisch raus.'),
      f('rev-2', '★★★★★ „Ruhig, freundlich, gutes WLAN“', 'Google · gestern', 'Antwort-Entwurf: Schön, dass du bei uns arbeiten konntest. Bis bald!'),
      f('rev-3', '★★★☆☆ „Lange auf den Kaffee gewartet“', 'Google · heute 06:58', 'Antwort-Entwurf: Danke für die ehrliche Rückmeldung. Samstags ist es voll – wir haben ab dieser Woche eine zweite Person an der Theke.') ] },
    { id: 's-karte', title: 'Speisekarte', files: [
      f('menu-1', 'Herbstkarte 2026', 'gültig bis 30.11.', 'Kürbissuppe 6,50 €', 'Zimtschnecke 3,40 €', 'Flat White 3,90 €'),
      f('menu-2', 'Allergene', 'zuletzt geprüft 01.10.', 'Alle 14 Hauptallergene je Gericht gekennzeichnet.') ] } ] },
  { id: 'kueche', title: 'Küche', jobRoles: ['kueche'], glass: 'champagne', moons: [
    { id: 'k-rez', title: 'Rezepte', files: [
      f('rez-1', 'Zimtschnecken', 'für 24 Stück · Teig ab 06:45', '1 kg Mehl, 500 ml Milch, 120 g Zucker, 42 g Hefe', 'Teig 45 Minuten gehen lassen, 18 Minuten bei 180 °C.'),
      f('rez-2', 'Kürbissuppe', 'für 20 Portionen', '3 kg Hokkaido, 2 l Gemüsebrühe, 400 ml Kokosmilch, Ingwer'),
      f('rez-3', 'Bananenbrot (vegan)', 'für 2 Kastenformen', 'Reife Bananen, Haferdrink, Walnüsse.') ] },
    { id: 'k-best', title: 'Bestand', files: [
      f('inv-1', 'Hafermilch', 'Mindestbestand 24 Liter', 'Wird vor der Bestellung am Donnerstag gezählt.'),
      f('inv-2', 'Kaffee Espresso-Röstung', 'Mindestbestand 6 kg', 'Aktuell 4 kg, Bestellung vorbereitet.'),
      f('inv-3', 'Mehl Type 550', 'Mindestbestand 10 kg', 'Aktuell 18 kg.') ] },
    { id: 'k-hyg', title: 'Hygiene', files: [
      f('hyg-1', 'Kühlprotokoll Oktober', 'täglich 07:00', 'Kühlhaus 3 °C, Kühlschrank Theke 5 °C – alles im Rahmen.'),
      f('hyg-2', 'Reinigungsplan Küche', 'wöchentlich', 'Mittwoch: Ofen und Abzug.') ] } ] },
  { id: 'aushilfe', title: 'Theke', jobRoles: ['aushilfe'], glass: 'lavender', moons: [
    { id: 'a-check', title: 'Checklisten', files: [
      f('chk-1', 'Öffnen', '07:30', 'Siebträger spülen, Mühle einstellen, Vitrine füllen.'),
      f('chk-2', 'Schließen', '18:00', 'Kasse zählen, Tagesabschluss, Maschine rückspülen, Terrasse prüfen.') ] },
    { id: 'a-schicht', title: 'Schichtplan', files: [
      f('sch-1', 'Diese Woche', 'KW 44', 'Mi: Tarek 06:30–14:30 · Lena 07:30–16:00 · Jonas 11:00–18:00', 'Do: Tarek 06:30–14:30 · Lena 09:30–18:00') ] } ] },
  { id: 'verwaltung', title: 'Verwaltung', jobRoles: ['inhaber'], glass: 'bluegrey', moons: [
    { id: 'v-zahl', title: 'Zahlen', files: [
      f('num-1', 'Gestern · 1.842 €', 'Kasse stimmt · 71 % Karte', '+9 % zur Vorwoche.', 'Stärkste Stunde: 12–13 Uhr.'),
      f('num-2', 'Oktober bisher · 38.410 €', 'Ziel 42.000 €', 'Noch 3 Öffnungstage.') ] },
    { id: 'v-lief', title: 'Lieferanten', files: [
      f('sup-1', 'Rösterei Hügel (fiktiv)', 'Kaffee · Lieferung Do', 'Bestellschluss Mi 14:00.'),
      f('sup-2', 'Hofmolkerei Sonnental (fiktiv)', 'Milch & Hafermilch', 'Lieferung Mo/Do.') ] },
    { id: 'v-vert', title: 'Verträge', files: [
      f('con-1', 'Mietvertrag Ladenlokal', 'läuft bis 2029', 'Nebenkostenabrechnung im März.'),
      f('con-2', 'Kassensystem', 'monatlich kündbar', '39 € im Monat.') ] },
    { id: 'v-team', title: 'Team', files: [
      f('team-1', 'Urlaub', 'Lena 18.–22.11. beantragt', 'Noch offen.'),
      f('team-2', 'Kontakte', '4 Personen', 'Alle Namen außer Marius sind fiktiv.') ] } ] },
];

/** Was MÔRA über Nacht vorbereitet hat (FIKTIV). */
export interface DemoEvents {
  swap: { from: string; to: string; day: string; shift: string; at: string };
  reviews: { date: string; fileIds: string[] };
  order: { date: string; for: string; lines: { item: string; qty: string; price: number }[]; cutoff: string };
  yesterday: { date: string; revenue: number; card: number; vsLastWeek: number; tillOk: boolean };
}

export const MORGENROT_EVENTS: DemoEvents = {
  swap: { from: 'jonas', to: 'lena', day: 'Donnerstag', shift: '09:30–18:00', at: '06:40' },
  reviews: { date: '2026-10-28', fileIds: ['rev-1', 'rev-2', 'rev-3'] },
  order: { date: '2026-10-28', for: 'Donnerstag', cutoff: '14:00', lines: [
    { item: 'Espresso-Röstung', qty: '6 kg', price: 138 }, { item: 'Hafermilch', qty: '24 l', price: 52 }, { item: 'Vollmilch', qty: '12 l', price: 24 } ] },
  yesterday: { date: '2026-10-27', revenue: 1842, card: 0.71, vsLastWeek: 0.09, tillOk: true },
};

export const orderTotal = (ev: DemoEvents) => ev.order.lines.reduce((s, l) => s + l.price, 0);
export const findMoon = (moonId: string) => {
  for (const p of MORGENROT_STRUCTURE) { const m = p.moons.find((x) => x.id === moonId); if (m) return { planet: p, moon: m }; }
  return null;
};
