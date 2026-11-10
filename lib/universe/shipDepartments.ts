import type { FFolder, FNode } from '@/lib/lea/finder';
import type { WorldDepartment, WorldTask } from '@/lib/lea/world';
import type { DeptMember } from '@/features/universe/ui/Workbench';
import type { TodaySnapshot } from '@/lib/api/todayClient';

export interface ShipDepartmentSeed {
  id: string;
  name: string;
  spaceId: string;
  spaceName: string;
  folders: Array<{
    id: string;
    name: string;
    docs: Array<{
      id: string;
      title: string;
      content: string;
    }>;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    folderId?: string;
    assignee: string;
    dueOffsetDays: number;
    priority?: 'low' | 'medium' | 'high';
  }>;
  crew: DeptMember[];
}

export const CANONICAL_SHIP_DEPARTMENTS: ShipDepartmentSeed[] = [
  {
    id: 'dept-kommando',
    name: 'Kommando & Strategie',
    spaceId: 'sp-kommando',
    spaceName: 'Brücke & Führung',
    folders: [
      {
        id: 'f-strategie',
        name: 'Strategie & Ziele',
        docs: [
          {
            id: 'ship-doc-charta',
            title: 'Architektur-Charta: Raumschiff-Haus',
            content: [
              '# Architektur-Charta: Das Raumschiff-Haus',
              '',
              'Jede Abteilung an Bord ist ein eigener Ort mit klarer Verantwortung, eigenem Captain und drei festen Arbeitsräumen:',
              '',
              '- **Werkstatt**: Aufgabenbrett, Schreibtisch und Wochenmappe für die tägliche Umsetzung.',
              '- **Studio**: Lesepult und Buch für Konzepte, Entwürfe und Dokumentation.',
              '- **Bar**: Crew-Treffpunkt für Übergaben, Schichtwechsel und kurze Abstimmungen.',
              '',
              '## Grundsatz',
              '',
              'Alle Abteilungen haben ihre eigenen Captains – aber **MÔRA ist das Schiff**. Sie verbindet die Räume, hält den Kurs im Universum und unterstützt jede Crew.',
            ].join('\n'),
          },
          {
            id: 'ship-doc-roadmap',
            title: 'Quartalsziele & Meilensteine',
            content: [
              '# Quartalsziele & Meilensteine',
              '',
              '1. **Stabile Abteilungsräume**: Jede Abteilung arbeitet in ihren echten Ordnern, Aufgaben und Dokumenten.',
              '2. **SAIMÔR // ORIGIN 001**: Visueller und technischer Master in Museumsqualität.',
              '3. **Verlässliche Brücke**: Klare Zahlen ohne künstlichen Nebel oder Demo-Rauschen.',
            ].join('\n'),
          },
        ],
      },
      {
        id: 'f-vertraege',
        name: 'Verträge & Partner',
        docs: [
          {
            id: 'ship-doc-partner',
            title: 'Partner- & Kooperationsrahmen',
            content: [
              '# Partner- & Kooperationsrahmen',
              '',
              'Übersicht aller strategischen Partnerschaften, Pilotkunden und Rahmenvereinbarungen von SAIMÔR HQ.',
            ].join('\n'),
          },
        ],
      },
    ],
    tasks: [
      { id: 'ship-task-k1', title: 'Abteilungsräume & Deck-Ansicht live abnehmen', folderId: 'f-strategie', assignee: 'Marius', dueOffsetDays: 0, priority: 'high' },
      { id: 'ship-task-k2', title: 'Quartalsziele mit allen Captains abstimmen', folderId: 'f-strategie', assignee: 'Elena V.', dueOffsetDays: 2, priority: 'medium' },
      { id: 'ship-task-k3', title: 'Kooperationsvertrag Pilotkunde gegenlesen', folderId: 'f-vertraege', assignee: 'Marius', dueOffsetDays: 4, priority: 'medium' },
    ],
    crew: [
      { id: 'crew-marius', name: 'Marius', role: 'Kommandant & Gründer', status: 'online', isCaptain: true },
      { id: 'crew-elena', name: 'Elena V.', role: 'Strategie & Partner', status: 'online' },
    ],
  },
  {
    id: 'dept-technik',
    name: 'Produkt & Technik',
    spaceId: 'sp-technik',
    spaceName: 'Maschinenraum & Architektur',
    folders: [
      {
        id: 'f-os-v15',
        name: 'Saimôr OS',
        docs: [
          {
            id: 'ship-doc-os-spec',
            title: 'Spezifikation: Abteilungs-Deck & Räume',
            content: [
              '# Saimôr OS · Abteilungs-Deck & Räume',
              '',
              'Beim Klick auf einen Abteilungs-Planeten öffnet sich zuerst das **Abteilungs-Deck**:',
              '',
              '- Sichtbarkeit von **Captain** und **Crew** mit deterministischen Relic-Avataren (`#001`–`#111`).',
              '- Direkter Zugang zu den drei Räumen **Werkstatt**, **Studio** und **Bar**.',
              '- Echte Ordner-Filterung ohne Datenverlust beim Anlegen neuer Aufgaben.',
            ].join('\n'),
          },
        ],
      },
      {
        id: 'f-core-api',
        name: 'Mora Core & API',
        docs: [
          {
            id: 'ship-doc-core-contract',
            title: 'Core v3 Schnittstellen-Vertrag',
            content: [
              '# Mora Core v3 · Schnittstellen',
              '',
              '- `/v3/tree`: Abteilungen, Bereiche und Ordnerstruktur.',
              '- `/v3/tasks`: Aufgaben mit fester `department_id`- und `folder_id`-Bindung.',
              '- `/v3/nodes`: Dokumente, Wochenmappen und Wissens-Einträge.',
            ].join('\n'),
          },
        ],
      },
    ],
    tasks: [
      { id: 'ship-task-t1', title: 'Feste Abteilungen und Raum-Navigation verifizieren', folderId: 'f-os-v15', assignee: 'Kaito R.', dueOffsetDays: 0, priority: 'high' },
      { id: 'ship-task-t2', title: 'Lokalen Dev-Master-Zugang ohne Blocker sichern', folderId: 'f-os-v15', assignee: 'Milan S.', dueOffsetDays: 1, priority: 'high' },
      { id: 'ship-task-t3', title: 'API-Antwortzeiten für Ordner & Dokumente prüfen', folderId: 'f-core-api', assignee: 'Nora T.', dueOffsetDays: 3, priority: 'medium' },
    ],
    crew: [
      { id: 'crew-kaito', name: 'Kaito R.', role: 'Lead Architect', status: 'online', isCaptain: true },
      { id: 'crew-milan', name: 'Milan S.', role: 'Core & Systems', status: 'online' },
      { id: 'crew-nora', name: 'Nora T.', role: 'QA & Security', status: 'offline' },
    ],
  },
  {
    id: 'dept-studio',
    name: 'Design & Studio',
    spaceId: 'sp-studio',
    spaceName: 'Atelier & Formgebung',
    folders: [
      {
        id: 'f-origin',
        name: 'SAIMÔR // ORIGIN',
        docs: [
          {
            id: 'ship-doc-origin-001',
            title: 'ORIGIN // 001 Material-Manifest',
            content: [
              '# SAIMÔR // ORIGIN // 001',
              '',
              '## Materialität & Haltung',
              '',
              '- **Dunkler Basalt**: Feines mikro-taktiles Relief statt glatter Plastikflächen.',
              '- **Optischer Quarz**: Echte Lichtbrechung und ruhige Kaustik statt grellem Neon.',
              '- **Präzisionsfassung**: Gebürstetes Messing für Captains, Ruthenium-Titan für die Crew.',
              '- **Ma (Japanische räumliche Zurückhaltung)**: Kraft durch asymmetrische Balance und Ruhe.',
            ].join('\n'),
          },
        ],
      },
      {
        id: 'f-raumdesign',
        name: 'Raum-Design & Licht',
        docs: [
          {
            id: 'ship-doc-licht',
            title: 'Licht & Oberfläche in den Räumen',
            content: [
              '# Licht & Oberfläche in den Räumen',
              '',
              'Holz, warmes Papier, Messingschilder und ein klarer Blick durch das Fenster ins Universum – frei von künstlichem Nebel oder Milchglas-Schleiern.',
            ].join('\n'),
          },
        ],
      },
    ],
    tasks: [
      { id: 'ship-task-s1', title: 'ORIGIN // 001 Basalt- und Quarz-Fassung abnehmen', folderId: 'f-origin', assignee: 'Sorel M.', dueOffsetDays: 0, priority: 'high' },
      { id: 'ship-task-s2', title: 'Holzboden und Lichtstimmung in Werkstatt & Studio prüfen', folderId: 'f-raumdesign', assignee: 'Lina H.', dueOffsetDays: 1, priority: 'medium' },
    ],
    crew: [
      { id: 'crew-sorel', name: 'Sorel M.', role: 'Art Direction', status: 'online', isCaptain: true },
      { id: 'crew-lina', name: 'Lina H.', role: 'Material & 3D', status: 'online' },
    ],
  },
  {
    id: 'dept-betrieb',
    name: 'Betrieb & Kunden',
    spaceId: 'sp-betrieb',
    spaceName: 'Deck-Betrieb & Projekte',
    folders: [
      {
        id: 'f-projekte',
        name: 'Aktuelle Projekte',
        docs: [
          {
            id: 'ship-doc-projekte',
            title: 'Projektübersicht & Übergaben',
            content: [
              '# Projektübersicht & Übergaben',
              '',
              'Status der laufenden Kundenprojekte, Einführungs-Workshops und wöchentlichen Übergaben an Bord.',
            ].join('\n'),
          },
        ],
      },
      {
        id: 'f-kunden',
        name: 'Kunden & Onboarding',
        docs: [
          {
            id: 'ship-doc-onboarding',
            title: 'Leitfaden: Neue Teams an Bord holen',
            content: [
              '# Neue Teams an Bord holen',
              '',
              '1. Abteilungen und Captains festlegen.',
              '2. Echte Ordner pro Abteilung verbinden.',
              '3. Erste Woche in der Wochenmappe planen.',
            ].join('\n'),
          },
        ],
      },
    ],
    tasks: [
      { id: 'ship-task-b1', title: 'Pilot-Onboarding für erstes Partner-Team vorbereiten', folderId: 'f-kunden', assignee: 'Tarek B.', dueOffsetDays: 1, priority: 'medium' },
      { id: 'ship-task-b2', title: 'Wochenübergabe für die Bar zusammenstellen', folderId: 'f-projekte', assignee: 'Lena K.', dueOffsetDays: 2, priority: 'low' },
    ],
    crew: [
      { id: 'crew-tarek', name: 'Tarek B.', role: 'Operations Captain', status: 'online', isCaptain: true },
      { id: 'crew-lena', name: 'Lena K.', role: 'Projektleitung', status: 'online' },
      { id: 'crew-jonas', name: 'Jonas W.', role: 'Kundenbetreuung', status: 'offline' },
    ],
  },
  {
    id: 'dept-finanzen',
    name: 'Finanzen & Recht',
    spaceId: 'sp-finanzen',
    spaceName: 'Treasury & Kontor',
    folders: [
      {
        id: 'f-treasury',
        name: 'Treasury & Budget',
        docs: [
          {
            id: 'ship-doc-treasury',
            title: 'Finanz- & Liquiditätsübersicht',
            content: [
              '# Finanz- & Liquiditätsübersicht',
              '',
              'Klare Trennung von operativem Cashflow, Rücklagen und Projektbudgets pro Abteilung.',
            ].join('\n'),
          },
        ],
      },
      {
        id: 'f-recht',
        name: 'Recht & Compliance',
        docs: [
          {
            id: 'ship-doc-compliance',
            title: 'Freigaben & Sicherheitsrichtlinien',
            content: [
              '# Freigaben & Sicherheitsrichtlinien',
              '',
              'Alle kritischen Transaktionen und Hauptnetz-Freigaben erfordern die ausdrückliche Bestätigung durch das Kommando.',
            ].join('\n'),
          },
        ],
      },
    ],
    tasks: [
      { id: 'ship-task-f1', title: 'Monatsbudget und Rücklagen prüfen', folderId: 'f-treasury', assignee: 'Clara D.', dueOffsetDays: 1, priority: 'medium' },
      { id: 'ship-task-f2', title: 'Freigaberichtlinie aktualisieren', folderId: 'f-recht', assignee: 'David K.', dueOffsetDays: 5, priority: 'low' },
    ],
    crew: [
      { id: 'crew-clara', name: 'Clara D.', role: 'Finance Captain', status: 'online', isCaptain: true },
      { id: 'crew-david', name: 'David K.', role: 'Controlling', status: 'online' },
    ],
  },
];

export const CANONICAL_MORGENROT_DEPARTMENTS: ShipDepartmentSeed[] = [
  {
    id: 'd-kueche',
    name: 'Küche & Backstube',
    spaceId: 'sp-kueche',
    spaceName: 'Vorbereitung & Ofen',
    folders: [
      {
        id: 'k-rez',
        name: 'Rezepte & Backstube',
        docs: [
          {
            id: 'rez-1',
            title: 'Zimtschnecken · Teigführung & Backplan',
            content: [
              '# Zimtschnecken · Teigführung & Backplan',
              '',
              '## Grundrezept (24 Stück · Teig ab 06:45 Uhr)',
              '',
              '- **Mehl Type 550**: 1.000 g',
              '- **Vollmilch / Haferdrink**: 500 ml (lauwarm)',
              '- **Rohrzucker**: 120 g',
              '- **Frischhefe**: 42 g',
              '- **Ceylon-Zimt & Kardamom**: 35 g für die Füllung',
              '',
              '## Ablauf in der Backstube',
              '',
              '1. Vorteig 15 Minuten anspringen lassen, dann 10 Minuten langsam kneten.',
              '2. Erste Gare: 45 Minuten abgedeckt ruhen lassen.',
              '3. Ausrollen, mit Butter-Zimt-Kardamom bestreichen und in 24 gleichmäßige Rollen schneiden.',
              '4. Backofen auf **180 °C Ober-/Unterhitze** vorheizen und **18 Minuten** goldbraun backen.',
            ].join('\n'),
          },
          {
            id: 'rez-2',
            title: 'Hokkaido-Kürbissuppe (Herbstkarte)',
            content: [
              '# Hokkaido-Kürbissuppe (20 Portionen)',
              '',
              '- **3,0 kg Hokkaido-Kürbis** (entkernt, mit Schale gewürfelt)',
              '- **2,0 l Gemüsebrühe** (Hausansatz)',
              '- **400 ml Kokosmilch** & frischer Ingwer',
              '- Garnitur: Geröstete Kürbiskerne & steirisches Kernöl.',
            ].join('\n'),
          },
        ],
      },
      {
        id: 'k-best',
        name: 'Bestand & Lager',
        docs: [
          {
            id: 'inv-1',
            title: 'Mindestbestände & Donnerstag-Bestellung',
            content: [
              '# Mindestbestände & Donnerstag-Bestellung',
              '',
              '- **Hafermilch (Barista)**: Mindestbestand 24 Liter (Bestellung Hofmolkerei Sonnental bis Mi 14:00 Uhr).',
              '- **Espresso-Röstung (Hausblend)**: Mindestbestand 6 kg (Rösterei Hügel).',
              '- **Weizenmehl Type 550**: Mindestbestand 10 kg (aktuell 18 kg auf Lager).',
            ].join('\n'),
          },
        ],
      },
      {
        id: 'k-hyg',
        name: 'HACCP & Hygiene',
        docs: [
          {
            id: 'hyg-1',
            title: 'Kühlprotokoll & Reinigungsplan Küche',
            content: [
              '# HACCP Kühlprotokoll & Reinigungsplan',
              '',
              '- **Kühlhaus Hauptlager**: Soll ≤ 4,0 °C (täglich 07:00 Uhr prüfen und an der Werkbank gegenzeichnen).',
              '- **Unterbaukühlung Theke**: Soll ≤ 6,0 °C.',
              '- **Tiefkühlung Backstube**: Soll ≤ -18,0 °C.',
              '- **Mittwoch-Schwerpunkt**: Backofen-Schwadenkanal und Dunstabzug entfetten.',
            ].join('\n'),
          },
        ],
      },
    ],
    tasks: [
      { id: 'demo-t1', title: 'Kuchenvitrine auffüllen & 36er Zimtschnecken-Charge backen', folderId: 'k-rez', assignee: 'Tarek B.', dueOffsetDays: 0, priority: 'high' },
      { id: 'demo-t-k2', title: 'Hafermilch- und Espresso-Bestand vor 14:00 Uhr zählen', folderId: 'k-best', assignee: 'Tarek B.', dueOffsetDays: 0, priority: 'high' },
      { id: 'demo-t-k3', title: 'Kühlhaus- & Thekentemperatur im HACCP-Protokoll gegenzeichnen', folderId: 'k-hyg', assignee: 'Lena K.', dueOffsetDays: 1, priority: 'medium' },
    ],
    crew: [
      { id: 'cafe-tarek', name: 'Tarek B.', role: 'Küchenchef & Bäcker', status: 'online', isCaptain: true },
      { id: 'cafe-lena-k', name: 'Lena K.', role: 'Vorbereitung & Backstube', status: 'online' },
    ],
  },
  {
    id: 'd-service',
    name: 'Service & Gastraum',
    spaceId: 'sp-service',
    spaceName: 'Gastraum & Terrasse',
    folders: [
      {
        id: 's-res',
        name: 'Reservierungen',
        docs: [
          {
            id: 'res-1',
            title: 'Tischplan heute: Kanzlei Weber & Geburtstag',
            content: [
              '# Reservierungen & Tischplan (Heute)',
              '',
              '## 12:30 Uhr · Kanzlei Weber (12 Personen · Tisch 4–6)',
              '- Lange Tafel am Fenster zusammenstellen.',
              '- 2× vegetarisch, 1× glutenfrei vorab markiert.',
              '- Abrechnung erfolgt auf eine gemeinsame Sammelrechnung.',
              '',
              '## 15:00 Uhr · Geburtstag (4 Personen · Tisch 2)',
              '- Eigene Torte wird mitgebracht; Kuchenteller, Gabeln und Kerzen bereitlegen.',
            ].join('\n'),
          },
        ],
      },
      {
        id: 's-bew',
        name: 'Bewertungen',
        docs: [
          {
            id: 'rev-1',
            title: 'Google-Bewertungen & Antwort-Leitfaden',
            content: [
              '# Gästefeedback & Bewertungen',
              '',
              '- **★★★★★ „Bester Flat White der Stadt“**: Danke dir! Wir geben das Lob direkt an Tarek und unser Barista-Team weiter.',
              '- **★★★☆☆ „Samstag lange Wartezeit an der Theke“**: Ehrliche Rückmeldung annehmen – ab dieser Woche besetzen wir die Samstagsspitze (10–14 Uhr) fest zu zweit an der Siebträgermaschine.',
            ].join('\n'),
          },
        ],
      },
      {
        id: 's-karte',
        name: 'Speisekarte',
        docs: [
          {
            id: 'menu-1',
            title: 'Herbstkarte 2026 & Allergen-Matrix',
            content: [
              '# Herbstkarte 2026 (gültig bis 30.11.)',
              '',
              '- **Hokkaido-Kürbissuppe** mit Kernöl & Sauerteigbrot — 6,50 €',
              '- **Hausgemachte Zimtschnecke** (warm aus dem Ofen) — 3,40 €',
              '- **Flat White** (Doppelter Ristretto, Bio-Vollmilch oder Hafer) — 3,90 €',
            ].join('\n'),
          },
        ],
      },
    ],
    tasks: [
      { id: 'demo-t2', title: 'Tisch 4–6 für Kanzlei Weber (12 Pers., 12:30 Uhr) eindecken', folderId: 's-res', assignee: 'Lena K.', dueOffsetDays: 0, priority: 'high' },
      { id: 'demo-t-s2', title: 'Tortenteller & Kerzen für Tisch 2 (15:00 Uhr) bereitlegen', folderId: 's-res', assignee: 'Jonas W.', dueOffsetDays: 0, priority: 'medium' },
      { id: 'demo-t-s3', title: 'Google-Bewertung zum Samstag-Service beantworten', folderId: 's-bew', assignee: 'Lena K.', dueOffsetDays: 1, priority: 'low' },
    ],
    crew: [
      { id: 'cafe-lena', name: 'Lena K.', role: 'Service-Leitung', status: 'online', isCaptain: true },
      { id: 'cafe-jonas', name: 'Jonas W.', role: 'Gastraum & Terrasse', status: 'online' },
    ],
  },
  {
    id: 'd-theke',
    name: 'Theke & Schicht',
    spaceId: 'sp-theke',
    spaceName: 'Siebträger & Kasse',
    folders: [
      {
        id: 'a-check',
        name: 'Checklisten',
        docs: [
          {
            id: 'chk-1',
            title: 'Barista-Checkliste: Öffnen (07:30) & Schließen (18:00)',
            content: [
              '# Barista-Checkliste · Theke & Siebträger',
              '',
              '## Öffnen (07:30 Uhr)',
              '1. Siebträgermaschine (La Marzocco 2-gruppig) spülen, Kesseldruck (1,2 bar) und Brühdruck (9,0 bar) prüfen.',
              '2. Mühle einmahlen: **18,5 g In → 38 g Out in 27 Sekunden**.',
              '3. Kuchenvitrine mit frischen Zimtschnecken und Bananenbrot bestücken.',
              '',
              '## Schließen (18:00 Uhr)',
              '1. Beide Brühgruppen mit Blindsieb und Kaffeefettlöser rückspülen.',
              '2. Dampflanzen entlüften und Düsen reinigen.',
              '3. Kassensturz durchführen und Z-Bon im Kassenbuch ablegen.',
            ].join('\n'),
          },
        ],
      },
      {
        id: 'a-schicht',
        name: 'Schichtplan',
        docs: [
          {
            id: 'sch-1',
            title: 'Schichtplan KW 45 & Übergabe',
            content: [
              '# Schichtplan KW 45 · Café Morgenrot',
              '',
              '- **Mittwoch**: Tarek (06:30–14:30) · Lena (07:30–16:00) · Jonas (11:00–18:00)',
              '- **Donnerstag**: Tarek (06:30–14:30) · Lena übernimmt Spätschicht (09:30–18:00) für Jonas',
              '- **Freitag & Samstag**: Doppelbesetzung an der Siebträgermaschine ab 09:30 Uhr.',
            ].join('\n'),
          },
        ],
      },
    ],
    tasks: [
      { id: 'demo-t-th1', title: 'Mahlgrad & Brühdruck (9,0 bar) an der Siebträgermaschine einmahlen', folderId: 'a-check', assignee: 'Jonas W.', dueOffsetDays: 0, priority: 'high' },
      { id: 'demo-t-th2', title: 'Schichttausch Donnerstag (Jonas → Lena 09:30–18:00) bestätigen', folderId: 'a-schicht', assignee: 'Lena K.', dueOffsetDays: 0, priority: 'medium' },
    ],
    crew: [
      { id: 'cafe-jonas-t', name: 'Jonas W.', role: 'Head Barista', status: 'online', isCaptain: true },
      { id: 'cafe-tarek-t', name: 'Tarek B.', role: 'Frühschicht & Röstung', status: 'online' },
      { id: 'cafe-lena-t', name: 'Lena K.', role: 'Spätschicht & Service', status: 'online' },
    ],
  },
  {
    id: 'd-verw',
    name: 'Verwaltung & Büro',
    spaceId: 'sp-verw',
    spaceName: 'Kontor & Einkauf',
    folders: [
      {
        id: 'v-zahl',
        name: 'Zahlen & Kasse',
        docs: [
          {
            id: 'num-1',
            title: 'Kassenbericht & Monatsziel',
            content: [
              '# Kassenbericht & Monatsübersicht · Café Morgenrot',
              '',
              '- **Tagesumsatz gestern**: **1.842,00 €** (+9 % gegenüber Vorwoche).',
              '- **Zahlungsarten**: 71 % Kartenzahlung (1.307,80 €), 29 % Barzahlung (534,20 €) – Kasse stimmt auf den Cent.',
              '- **Stärkste Stunde**: 12:00–13:00 Uhr (Mittagsgeschäft & Flat White to go).',
              '- **Monatsstand**: 38.410,00 € von 42.000,00 € Ziel.',
            ].join('\n'),
          },
        ],
      },
      {
        id: 'v-lief',
        name: 'Lieferanten & Einkauf',
        docs: [
          {
            id: 'sup-1',
            title: 'Lieferanten-Rahmen: Rösterei Hügel & Hofmolkerei',
            content: [
              '# Lieferanten & Bestellfristen',
              '',
              '- **Rösterei Hügel**: Espresso-Röstung (6 kg zu 138,00 €) · Bestellschluss Mittwoch 14:00 Uhr für Donnerstag-Lieferung.',
              '- **Hofmolkerei Sonnental**: Barista-Hafermilch (24 L zu 52,00 €) & Bio-Vollmilch (12 L zu 23,00 €) · Lieferung Mo & Do.',
            ].join('\n'),
          },
        ],
      },
      {
        id: 'v-team',
        name: 'Team & Verträge',
        docs: [
          {
            id: 'team-1',
            title: 'Urlaubsplanung & Ladenlokal-Verträge',
            content: [
              '# Team-Urlaub & Verträge',
              '',
              '- **Offener Urlaubsantrag**: Lena K. (18.–22.11., 5 Urlaubstage) – Vertretung durch Jonas & Tarek gesichert.',
              '- **Mietvertrag Ladenlokal**: Festlaufzeit bis 2029, Nebenkostenabrechnung geprüft.',
            ].join('\n'),
          },
        ],
      },
    ],
    tasks: [
      { id: 'demo-t0', title: 'Donnerstag-Bestellung bei Rösterei Hügel & Hofmolkerei (213 €) freigeben', folderId: 'v-lief', assignee: 'Marius', dueOffsetDays: 0, priority: 'high' },
      { id: 'demo-t-v2', title: 'Tagesabschluss (1.842,00 € · 71 % Karte) im Kassenbuch gegenzeichnen', folderId: 'v-zahl', assignee: 'Marius', dueOffsetDays: 0, priority: 'medium' },
      { id: 'demo-t-v3', title: 'Urlaubsantrag Lena K. (18.–22.11.) im Kontor genehmigen', folderId: 'v-team', assignee: 'Marius', dueOffsetDays: 2, priority: 'low' },
    ],
    crew: [
      { id: 'cafe-marius', name: 'Marius', role: 'Inhaber & Geschäftsführung', status: 'online', isCaptain: true },
      { id: 'cafe-lena-v', name: 'Lena K.', role: 'Betriebsleitung', status: 'online' },
    ],
  },
];

function buildWorldFromSeeds(seeds: ShipDepartmentSeed[], now = new Date()): {
  departments: WorldDepartment[];
  folders: FFolder[];
  nodes: FNode[];
  tasks: WorldTask[];
} {
  const departments: WorldDepartment[] = [];
  const folders: FFolder[] = [];
  const nodes: FNode[] = [];
  const tasks: WorldTask[] = [];

  for (const dept of seeds) {
    departments.push({
      id: dept.id,
      name: dept.name,
      spaces: [{ id: dept.spaceId, name: dept.spaceName }],
    });
    for (const folder of dept.folders) {
      folders.push({
        id: folder.id,
        name: folder.name,
        space_id: dept.spaceId,
      });
      for (const doc of folder.docs) {
        nodes.push({
          id: doc.id,
          name: doc.title,
          title: doc.title,
          type: 'document',
          folder_id: folder.id,
          created_at: now.toISOString(),
        });
      }
    }
    for (const t of dept.tasks) {
      const due = new Date(now.getTime() + t.dueOffsetDays * 86_400_000);
      const iso = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
      tasks.push({
        id: t.id,
        title: t.title,
        status: 'open',
        due_date: iso,
        folder_id: t.folderId,
        assignee: t.assignee,
      });
    }
  }

  return { departments, folders, nodes, tasks };
}

export function buildCanonicalShipWorld(now = new Date()) {
  return buildWorldFromSeeds(CANONICAL_SHIP_DEPARTMENTS, now);
}

export function buildCanonicalMorgenrotWorld(now = new Date()) {
  return buildWorldFromSeeds(CANONICAL_MORGENROT_DEPARTMENTS, now);
}

const ALL_CANONICAL_DEPARTMENTS: ShipDepartmentSeed[] = [
  ...CANONICAL_SHIP_DEPARTMENTS,
  ...CANONICAL_MORGENROT_DEPARTMENTS,
];

export function getShipNodeById(nodeId: string): { id: string; title: string; name: string; type: string; folder_id: string; content: string } | null {
  for (const dept of ALL_CANONICAL_DEPARTMENTS) {
    for (const folder of dept.folders) {
      for (const doc of folder.docs) {
        if (doc.id === nodeId) {
          return {
            id: doc.id,
            title: doc.title,
            name: doc.title,
            type: 'document',
            folder_id: folder.id,
            content: doc.content,
          };
        }
      }
    }
  }
  return null;
}

export function getShipDepartmentCrew(deptIdOrName: string): DeptMember[] | null {
  const key = deptIdOrName.trim().toLowerCase();
  const match = ALL_CANONICAL_DEPARTMENTS.find(
    (d) => d.id.toLowerCase() === key || d.name.toLowerCase() === key
  );
  return match ? match.crew : null;
}

export interface DeptRoomFocusItem {
  label: string;
  value: string;
  status?: string;
}

export type DeptRoomArchetype = 'werkstatt' | 'studio' | 'bar' | 'bridge' | 'kontor';

export interface DeptRoomContext {
  /** Jede Abteilung hat genau EINEN eigenen Raum passend zu ihrer Aufgabe */
  primaryRoom: 'werkstatt' | 'studio' | 'bar';
  archetype: DeptRoomArchetype;
  roomTag: string;
  roomName: string;
  roomSubtitle: string;
  enterLabel: string;
  werkstatt: {
    tag: string;
    name: string;
    shortLabel: string;
    subtitle: string;
    focusHint: string;
  };
  studio: {
    tag: string;
    name: string;
    shortLabel: string;
    subtitle: string;
    focusTitle: string;
    focusItems: DeptRoomFocusItem[];
  };
  bar: {
    tag: string;
    name: string;
    shortLabel: string;
    subtitle: string;
    loungeTitle: string;
    handoverPrompt: string;
  };
}

export function getDepartmentRoomContext(deptIdOrName: string, deptTitle?: string): DeptRoomContext {
  const raw = `${deptIdOrName || ''} ${deptTitle || ''}`.toLowerCase();
  const label = deptTitle || deptIdOrName || 'Abteilung';

  if (raw.includes('kommando') || raw.includes('strategie') || raw.includes('führung') || raw.includes('brücke')) {
    return {
      primaryRoom: 'studio',
      archetype: 'bridge',
      roomTag: 'Abteilungs-Raum · Kommandobrücke (Obsidian & Gold)',
      roomName: 'Kommandobrücke & Strategie-Kanzel',
      roomSubtitle: 'Strategie-Dossiers & Charta am Kommandopult, Führungs-Leitplanken, Prioritäten & Wochenplan',
      enterLabel: 'Kommandobrücke betreten →',
      werkstatt: {
        tag: 'Kommandobrücke · Führung',
        name: 'Kommandobrücke & Strategie-Kanzel',
        shortLabel: 'Kommandobrücke',
        subtitle: 'Strategische Entscheidungen, Prioritäten & Wochen-Taktung',
        focusHint: 'Führungsaufgaben, Freigaben & Meilensteine',
      },
      studio: {
        tag: 'Kommandobrücke · Charta & Strategie',
        name: 'Kommandobrücke & Strategie-Kanzel',
        shortLabel: 'Kommandobrücke',
        subtitle: 'Architektur-Charta, Quartalsziele & Partner-Verträge direkt am Kommandopult',
        focusTitle: 'Strategischer Kompass & Leitplanken',
        focusItems: [
          { label: 'Phase 01 Fokus', value: 'ORIGIN // 001 Master & ein eigener Raum pro Abteilung', status: 'Aktiv' },
          { label: 'Führungs-Takt', value: 'Tägliche Captains-Runde (10:00 Uhr)', status: 'Stabil' },
          { label: 'Kooperationen', value: 'Pilotkunden & Partner-Rahmenverträge', status: 'In Prüfung' },
        ],
      },
      bar: {
        tag: 'Kommandobrücke · Captains-Runde',
        name: 'Offiziersmesse & Brücke',
        shortLabel: 'Brücke',
        subtitle: 'Abstimmung der Captains, Schicht-Übergabe & direkte Führungs-Signale',
        loungeTitle: 'Captains-Tisch & Führungs-Übergabe',
        handoverPrompt: 'Strategische Übergabe oder Auftrag an die Crew notieren…',
      },
    };
  }

  if (raw.includes('technik') || raw.includes('produkt') || raw.includes('maschine') || raw.includes('core') || raw.includes('backstube') || raw.includes('küche') || raw.includes('werkstatt')) {
    const isCafe = raw.includes('backstube') || raw.includes('küche');
    const rName = isCafe ? 'Backstube & Werkstatt' : 'Technik-Werkstatt & Maschinenlabor';
    return {
      primaryRoom: 'werkstatt',
      archetype: 'werkstatt',
      roomTag: isCafe ? 'Abteilungs-Raum · Handwerk & Backstube' : 'Abteilungs-Raum · Holz-Werkbank & Pinnwand',
      roomName: rName,
      roomSubtitle: 'Aufgabenkarten an der Pinnwand, Wochenmappe am Tisch & technisches Handbuch am Lesepult',
      enterLabel: `${rName} betreten →`,
      werkstatt: {
        tag: 'Abteilungs-Raum · Werkstatt',
        name: rName,
        shortLabel: 'Werkstatt',
        subtitle: 'Umsetzung, Core-Schnittstellen, Releases & tägliche Aufgaben an der Pinnwand',
        focusHint: 'Aufgaben-Pinnwand, Wochenmappe am Tisch & Handbuch am Pult',
      },
      studio: {
        tag: 'Technik-Architektur',
        name: 'System-Studio & Blaupausen',
        shortLabel: 'Blaupausen',
        subtitle: 'Spezifikationen, Core v3 Verträge & System-Dokumentation am Pult',
        focusTitle: 'System-Architektur & Core v3 Status',
        focusItems: [
          { label: 'Saimôr OS v15', value: 'Jede Abteilung besitzt ihren eigenen kontextuellen Raum', status: 'Bereit' },
          { label: 'Mora Core v3', value: '/v3/tree · /v3/tasks · /v3/nodes deterministisch', status: 'Verifiziert' },
          { label: 'Local Dev-Master', value: 'Sofort-Start (0 ms) ohne externe Netzwerk-Blocker', status: 'Aktiv' },
        ],
      },
      bar: {
        tag: 'Bereitschaft',
        name: 'Technik-Kajüte',
        shortLabel: 'Kajüte',
        subtitle: 'Release-Übergabe, Bereitschaftsdienst & schneller Engineering-Sync',
        loungeTitle: 'Engineering-Lounge & Release-Übergabe',
        handoverPrompt: 'Technische Übergabe oder Prüfpunkt für die Schicht…',
      },
    };
  }

  if (raw.includes('studio') || raw.includes('design') || raw.includes('atelier') || raw.includes('origin')) {
    return {
      primaryRoom: 'studio',
      archetype: 'studio',
      roomTag: 'Abteilungs-Raum · Basalt- & Quarzglas-Atelier',
      roomName: 'ORIGIN-Atelier & Lesepult',
      roomSubtitle: 'Dossier-Regal, direkt beschreibbares Konzept-Folio vor dem Panorama-Fenster & Material-Fokus',
      enterLabel: 'ORIGIN-Atelier betreten →',
      werkstatt: {
        tag: 'Formbau',
        name: 'Formbau-Werkstatt',
        shortLabel: 'Werkstatt',
        subtitle: 'Material-Abnahmen, Raum-Licht, 3D-Assets & handwerklicher Feinschliff',
        focusHint: 'Werkstücke, Lichtstimmung & Oberflächenprüfung',
      },
      studio: {
        tag: 'Abteilungs-Raum · Atelier',
        name: 'ORIGIN-Atelier & Lesepult',
        shortLabel: 'Atelier',
        subtitle: 'ORIGIN // 001 Material-Manifest, Gestaltungskonzepte & Entwürfe direkt im Folio',
        focusTitle: 'SAIMÔR // ORIGIN // 001 · Material-Spektrum',
        focusItems: [
          { label: 'Körper & Stein', value: 'Dunkler Basalt mit mikro-taktilem Relief (Seed 1001)', status: 'Kanonisch' },
          { label: 'Optischer Kern', value: 'Geschmolzener Quarz · Echte Brechung & ruhige Kaustik', status: 'AgX Cycles' },
          { label: 'Präzisionsfassung', value: 'Gebürstetes Messing (Captain) / Ruthenium-Titan (Crew)', status: 'Freigegeben' },
          { label: 'Raumhaltung (Ma)', value: 'Asymmetrische Ruhe · Frei von künstlichem Nebel', status: 'Geprüft' },
        ],
      },
      bar: {
        tag: 'Kritik & Salon',
        name: 'Atelier-Salon & Bar',
        shortLabel: 'Salon',
        subtitle: 'Werkkritik, Abnahmen im Team & ruhiger gestalterischer Austausch',
        loungeTitle: 'Atelier-Salon & Werk-Übergabe',
        handoverPrompt: 'Gestaltungs-Impuls oder Abnahme-Aufgabe festhalten…',
      },
    };
  }

  if (raw.includes('betrieb') || raw.includes('kunde') || raw.includes('projekt') || raw.includes('service') || raw.includes('gastraum') || raw.includes('theke') || raw.includes('bar')) {
    const isCafe = raw.includes('gastraum') || raw.includes('theke') || raw.includes('service');
    const rName = isCafe ? 'Gastraum, Theke & Bar' : 'Panorama-Bar & Crew-Salon';
    return {
      primaryRoom: 'bar',
      archetype: 'bar',
      roomTag: isCafe ? 'Abteilungs-Raum · Gastraum & Theke' : 'Abteilungs-Raum · Panorama-Lounge am See',
      roomName: rName,
      roomSubtitle: 'Captain & Crew an Bord, Schicht-Übergabe, laufende Aufgaben & direkter Abteilungs-Funk (Post & Termine)',
      enterLabel: `${rName} betreten →`,
      werkstatt: {
        tag: 'Leitstand',
        name: rName,
        shortLabel: 'Bar',
        subtitle: 'Laufende Kundenprojekte, Onboarding-Aufgaben & operativer Fluss',
        focusHint: 'Projekt-Steuerung & tägliche Umsetzung',
      },
      studio: {
        tag: 'Playbooks',
        name: 'Playbook-Studio & Leitfäden',
        shortLabel: 'Playbooks',
        subtitle: 'Onboarding-Leitfäden, Projektübersichten & Prozess-Handbücher',
        focusTitle: 'Operative Playbooks & Projekt-Status',
        focusItems: [
          { label: 'Team-Onboarding', value: 'Feste Abteilungen, Captains & Ordner in 3 Schritten', status: 'Bereit' },
          { label: 'Wochen-Rhythmus', value: 'Wochenmappe + tägliche Übergabe in der Bar', status: 'Aktiv' },
          { label: 'Kunden-Betreuung', value: 'Verbindliche Übergaben ohne Informationsverlust', status: 'Stabil' },
        ],
      },
      bar: {
        tag: 'Abteilungs-Raum · Empfang & Crew',
        name: rName,
        shortLabel: 'Bar',
        subtitle: 'Tägliche Schicht-Übergabe, Kunden-Signale & Abstimmung der Crew',
        loungeTitle: `${rName} · Schicht-Übergabe`,
        handoverPrompt: 'Übergabe für die nächste Schicht oder Kunden-Aufgabe…',
      },
    };
  }

  if (raw.includes('finanz') || raw.includes('recht') || raw.includes('treasury') || raw.includes('büro') || raw.includes('einkauf') || raw.includes('verwaltung')) {
    const isCafe = raw.includes('büro') || raw.includes('einkauf');
    const rName = isCafe ? 'Kontor & Einkaufs-Büro' : 'Treasury-Kontor & Vertrags-Archiv';
    return {
      primaryRoom: 'studio',
      archetype: 'kontor',
      roomTag: isCafe ? 'Abteilungs-Raum · Kontor & Einkauf' : 'Abteilungs-Raum · Smaragd- & Bronze-Kontor',
      roomName: rName,
      roomSubtitle: 'Verträge, Kalkulationen & Richtlinien direkt am Kontor-Pult, Freigabe-Matrix & Fristen-Aufgaben',
      enterLabel: `${rName} betreten →`,
      werkstatt: {
        tag: 'Kontor',
        name: rName,
        shortLabel: 'Kontor',
        subtitle: 'Budgets, Freigaben, Prüfaufträge & laufende Fristen',
        focusHint: 'Liquidität, Controlling & Freigaben',
      },
      studio: {
        tag: 'Abteilungs-Raum · Kontor & Archiv',
        name: rName,
        shortLabel: 'Kontor',
        subtitle: 'Finanzübersicht, Sicherheitsrichtlinien & Compliance-Dossiers direkt am Kontor-Pult',
        focusTitle: 'Treasury- & Sicherheits-Matrix',
        focusItems: [
          { label: 'Budget & Rücklagen', value: 'Klare Trennung von Betrieb und strategischer Reserve', status: 'Geprüft' },
          { label: 'XRPL Guardrails', value: 'Entwicklung strikt auf Testnet · Mainnet nur mit Freigabe', status: 'Geschützt' },
          { label: 'Compliance-Stand', value: 'Freigaberichtlinien & Verträge dokumentiert', status: 'Synchron' },
        ],
      },
      bar: {
        tag: 'Kuratorium',
        name: 'Kontor-Lounge',
        shortLabel: 'Kontor',
        subtitle: 'Freigabe-Runde, Budget-Abstimmung & vertrauliche Übergaben',
        loungeTitle: 'Kontor-Lounge & Freigabe-Tisch',
        handoverPrompt: 'Prüfauftrag oder Freigabe-Notiz für das Kontor…',
      },
    };
  }

  return {
    primaryRoom: 'werkstatt',
    archetype: 'werkstatt',
    roomTag: 'Abteilungs-Raum · Werkstatt',
    roomName: `${label} · Werkstatt`,
    roomSubtitle: 'Aufgabenbrett, Schreibtisch, Handbuch am Pult & Wochenmappe der Abteilung',
    enterLabel: `${label} · Raum betreten →`,
    werkstatt: {
      tag: 'Abteilungs-Raum · Umsetzung',
      name: `${label} · Werkstatt`,
      shortLabel: 'Werkstatt',
      subtitle: 'Aufgabenbrett, Schreibtisch & Wochenmappe der Abteilung',
      focusHint: 'Tägliche Aufgaben & Wochenplanung',
    },
    studio: {
      tag: 'Wissen & Buch',
      name: `${label} · Studio`,
      shortLabel: 'Studio',
      subtitle: 'Lesepult, Handbücher, Konzepte & Dokumente der Abteilung',
      focusTitle: `Wissens- & Qualitätsfokus · ${label}`,
      focusItems: [
        { label: 'Dokumentation', value: 'Alle Konzepte und Handbücher direkt am Lesepult editierbar', status: 'Aktiv' },
        { label: 'Ordner-Struktur', value: 'Jedes Dokument fest mit seinem Abteilungs-Ordner verknüpft', status: 'Synchron' },
      ],
    },
    bar: {
      tag: 'Crew & Übergabe',
      name: `${label} · Bar`,
      shortLabel: 'Bar',
      subtitle: 'Captain, Crew, Schicht-Übergabe & laufende Signale am Tisch',
      loungeTitle: `Crew-Tisch & Übergabe · ${label}`,
      handoverPrompt: 'Übergabe-Notiz oder Aufgabe für das Team festhalten…',
    },
  };
}

export function buildShipTodaySnapshot(
  companyId: string,
  userId: string,
  tenantId: string,
  now = new Date()
): TodaySnapshot {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);
  const iso = now.toISOString();
  const meta = (source: string) => ({
    status: 'ok' as const,
    source,
    connection: 'local-hq',
    complete: true,
    as_of: iso,
    stale_after_seconds: 3600,
    scope: { level: 'company' as const, tenant_id: tenantId, user_id: userId, company_id: companyId },
  });
  const at = (h: string) => `${date}T${h}:00`;
  const mails: Array<[string, string, string, string]> = [
    ['OS v15 Abteilungs-Decks & Räume bereit zur Abnahme', 'Kaito R. · Produkt & Technik', 'dept-produkt', '09:15'],
    ['ORIGIN // 001 Material-Manifest finalisiert', 'Sorel M. · Design & Studio', 'dept-studio', '08:40'],
    ['Pilotkunde Kooperationsvertrag zur Freigabe', 'Elena V. · Kommando & Strategie', 'dept-kommando', '08:05'],
  ];
  const events: Array<[string, string, string]> = [
    ['Captains-Runde auf der Brücke', '10:00', 'dept-kommando'],
    ['Review: OS v15 Abteilungsräume (Werkstatt & Studio)', '14:30', 'dept-produkt'],
    ['Übergabe in der Bar (alle Abteilungen)', '17:30', 'dept-betrieb'],
  ];
  const allTasks = CANONICAL_SHIP_DEPARTMENTS.flatMap((dept) =>
    dept.tasks.map((t) => {
      const due = new Date(now.getTime() + t.dueOffsetDays * 86_400_000);
      const dueIso = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
      return {
        id: t.id,
        title: t.title,
        status: 'open',
        due_date: dueIso,
        department_id: dept.id,
        folder_id: t.folderId,
      };
    })
  );
  const dueToday = allTasks.filter((t) => t.due_date === date);
  const restItems = allTasks.filter((t) => t.due_date !== date);
  return {
    status: 'ok',
    date,
    timezone: 'Europe/Berlin',
    generated_at: iso,
    requested_scope: { tenant_id: tenantId, user_id: userId, company_id: companyId, level: 'company' },
    mail: {
      ...meta('local-hq'),
      inbox_loaded: mails.length,
      sample_limit: 20,
      unread_count: mails.length,
      total: 18,
      items: mails.map(([subject, from, department_id, t], i) => ({
        id: `ship-mail-${i}`,
        subject,
        from,
        from_addr: from,
        read: false,
        received_at: at(t),
        department_id,
      })),
    },
    calendar: {
      ...meta('local-hq'),
      date,
      count: events.length,
      next_event: { id: 'ship-ev-1', title: events[1][0], date, time: events[1][1], start: at(events[1][1]), department_id: events[1][2] },
      events: events.map(([title, time, department_id], i) => ({
        id: `ship-ev-${i}`,
        title,
        date,
        time,
        start: at(time),
        department_id,
      })),
    },
    tasks: {
      ...meta('local-hq'),
      counts: { open: allTasks.length, in_progress: 3, due_today: dueToday.length, overdue: 0 },
      due_today: dueToday,
      overdue: [],
      items: restItems,
    },
    nightwatch: { ...meta('local-hq'), open_incidents: 0, health_score: 100, incidents: [] },
  } as unknown as TodaySnapshot;
}
