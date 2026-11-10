import type { FFolder, FNode } from '@/lib/lea/finder';
import type { WorldDepartment, WorldTask } from '@/lib/lea/world';
import type { DeptMember } from '@/features/universe/ui/Workbench';

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

export function buildCanonicalShipWorld(now = new Date()): {
  departments: WorldDepartment[];
  folders: FFolder[];
  nodes: FNode[];
  tasks: WorldTask[];
} {
  const departments: WorldDepartment[] = [];
  const folders: FFolder[] = [];
  const nodes: FNode[] = [];
  const tasks: WorldTask[] = [];

  for (const dept of CANONICAL_SHIP_DEPARTMENTS) {
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

export function getShipNodeById(nodeId: string): { id: string; title: string; name: string; type: string; folder_id: string; content: string } | null {
  for (const dept of CANONICAL_SHIP_DEPARTMENTS) {
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
  const match = CANONICAL_SHIP_DEPARTMENTS.find(
    (d) => d.id.toLowerCase() === key || d.name.toLowerCase() === key
  );
  return match ? match.crew : null;
}
