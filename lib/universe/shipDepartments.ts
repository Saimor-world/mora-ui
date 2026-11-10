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

export interface DeptRoomFocusItem {
  label: string;
  value: string;
  status?: string;
}

export interface DeptRoomContext {
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

  if (raw.includes('kommando') || raw.includes('strategie') || raw.includes('führung')) {
    return {
      werkstatt: {
        tag: 'Raum 01 · Führung',
        name: 'Kommandobrücke',
        shortLabel: 'Werkstatt',
        subtitle: 'Strategische Entscheidungen, Prioritäten & Wochen-Taktung',
        focusHint: 'Führungsaufgaben, Freigaben & Meilensteine',
      },
      studio: {
        tag: 'Raum 02 · Charta & Dossiers',
        name: 'Kartenraum & Dossiers',
        shortLabel: 'Studio',
        subtitle: 'Architektur-Charta, Quartalsziele & Partner-Verträge am Lesepult',
        focusTitle: 'Strategischer Kompass & Leitplanken',
        focusItems: [
          { label: 'Phase 01 Fokus', value: 'ORIGIN // 001 Master & feste Abteilungsräume', status: 'Aktiv' },
          { label: 'Führungs-Takt', value: 'Tägliche Captains-Runde (10:00 Uhr)', status: 'Stabil' },
          { label: 'Kooperationen', value: 'Pilotkunden & Partner-Rahmenverträge', status: 'In Prüfung' },
        ],
      },
      bar: {
        tag: 'Raum 03 · Captains-Runde',
        name: 'Offiziersmesse & Bar',
        shortLabel: 'Bar',
        subtitle: 'Abstimmung der Captains, Schicht-Übergabe & direkte Führungs-Signale',
        loungeTitle: 'Captains-Tisch & Führungs-Übergabe',
        handoverPrompt: 'Strategische Übergabe oder Auftrag an die Crew notieren…',
      },
    };
  }

  if (raw.includes('technik') || raw.includes('produkt') || raw.includes('maschine') || raw.includes('core')) {
    return {
      werkstatt: {
        tag: 'Raum 01 · Engineering',
        name: 'Maschinenraum & Labor',
        shortLabel: 'Werkstatt',
        subtitle: 'Umsetzung, Core-Schnittstellen, Releases & technische Aufgaben',
        focusHint: 'Sprints, Architektur & System-Verifikation',
      },
      studio: {
        tag: 'Raum 02 · Architektur',
        name: 'System-Studio & Blaupausen',
        shortLabel: 'Studio',
        subtitle: 'Spezifikationen, Core v3 Verträge & System-Dokumentation am Pult',
        focusTitle: 'System-Architektur & Core v3 Status',
        focusItems: [
          { label: 'Saimôr OS v15', value: 'Feste Abteilungen, echte Ordner & kontextuelle Räume', status: 'Bereit' },
          { label: 'Mora Core v3', value: '/v3/tree · /v3/tasks · /v3/nodes deterministisch', status: 'Verifiziert' },
          { label: 'Local Dev-Master', value: 'Sofort-Start (0 ms) ohne externe Netzwerk-Blocker', status: 'Aktiv' },
        ],
      },
      bar: {
        tag: 'Raum 03 · Bereitschaft',
        name: 'Technik-Kajüte & Bar',
        shortLabel: 'Bar',
        subtitle: 'Release-Übergabe, Bereitschaftsdienst & schneller Engineering-Sync',
        loungeTitle: 'Engineering-Lounge & Release-Übergabe',
        handoverPrompt: 'Technische Übergabe oder Prüfpunkt für die Schicht…',
      },
    };
  }

  if (raw.includes('studio') || raw.includes('design') || raw.includes('atelier') || raw.includes('origin')) {
    return {
      werkstatt: {
        tag: 'Raum 01 · Formbau',
        name: 'Formbau-Werkstatt',
        shortLabel: 'Werkstatt',
        subtitle: 'Material-Abnahmen, Raum-Licht, 3D-Assets & handwerklicher Feinschliff',
        focusHint: 'Werkstücke, Lichtstimmung & Oberflächenprüfung',
      },
      studio: {
        tag: 'Raum 02 · Atelier',
        name: 'ORIGIN-Atelier & Lesepult',
        shortLabel: 'Studio',
        subtitle: 'ORIGIN // 001 Material-Manifest, Gestaltungskonzepte & Entwürfe',
        focusTitle: 'SAIMÔR // ORIGIN // 001 · Material-Spektrum',
        focusItems: [
          { label: 'Körper & Stein', value: 'Dunkler Basalt mit mikro-taktilem Relief (Seed 1001)', status: 'Kanonisch' },
          { label: 'Optischer Kern', value: 'Geschmolzener Quarz · Echte Brechung & ruhige Kaustik', status: 'AgX Cycles' },
          { label: 'Präzisionsfassung', value: 'Gebürstetes Messing (Captain) / Ruthenium-Titan (Crew)', status: 'Freigegeben' },
          { label: 'Raumhaltung (Ma)', value: 'Asymmetrische Ruhe · Frei von künstlichem Nebel', status: 'Geprüft' },
        ],
      },
      bar: {
        tag: 'Raum 03 · Kritik & Salon',
        name: 'Atelier-Salon & Bar',
        shortLabel: 'Bar',
        subtitle: 'Werkkritik, Abnahmen im Team & ruhiger gestalterischer Austausch',
        loungeTitle: 'Atelier-Salon & Werk-Übergabe',
        handoverPrompt: 'Gestaltungs-Impuls oder Abnahme-Aufgabe festhalten…',
      },
    };
  }

  if (raw.includes('betrieb') || raw.includes('kunde') || raw.includes('projekt') || raw.includes('service')) {
    return {
      werkstatt: {
        tag: 'Raum 01 · Leitstand',
        name: 'Deck-Leitstand & Werkstatt',
        shortLabel: 'Werkstatt',
        subtitle: 'Laufende Kundenprojekte, Onboarding-Aufgaben & operativer Fluss',
        focusHint: 'Projekt-Steuerung & tägliche Umsetzung',
      },
      studio: {
        tag: 'Raum 02 · Playbooks',
        name: 'Playbook-Studio & Leitfäden',
        shortLabel: 'Studio',
        subtitle: 'Onboarding-Leitfäden, Projektübersichten & Prozess-Handbücher',
        focusTitle: 'Operative Playbooks & Projekt-Status',
        focusItems: [
          { label: 'Team-Onboarding', value: 'Feste Abteilungen, Captains & Ordner in 3 Schritten', status: 'Bereit' },
          { label: 'Wochen-Rhythmus', value: 'Wochenmappe + tägliche Übergabe in der Bar', status: 'Aktiv' },
          { label: 'Kunden-Betreuung', value: 'Verbindliche Übergaben ohne Informationsverlust', status: 'Stabil' },
        ],
      },
      bar: {
        tag: 'Raum 03 · Empfang & Crew',
        name: 'Bord-Bar & Schichtwechsel',
        shortLabel: 'Bar',
        subtitle: 'Tägliche Schicht-Übergabe, Kunden-Signale & Abstimmung der Crew',
        loungeTitle: 'Bord-Bar & Schicht-Übergabe',
        handoverPrompt: 'Übergabe für die nächste Schicht oder Kunden-Aufgabe…',
      },
    };
  }

  if (raw.includes('finanz') || raw.includes('recht') || raw.includes('treasury') || raw.includes('büro') || raw.includes('verwaltung')) {
    return {
      werkstatt: {
        tag: 'Raum 01 · Kontor',
        name: 'Treasury-Kontor & Werkstatt',
        shortLabel: 'Werkstatt',
        subtitle: 'Budgets, Freigaben, Prüfaufträge & laufende Fristen',
        focusHint: 'Liquidität, Controlling & Freigaben',
      },
      studio: {
        tag: 'Raum 02 · Tresor-Archiv',
        name: 'Tresor-Archiv & Richtlinien',
        shortLabel: 'Studio',
        subtitle: 'Finanzübersicht, Sicherheitsrichtlinien & Compliance-Dossiers',
        focusTitle: 'Treasury- & Sicherheits-Matrix',
        focusItems: [
          { label: 'Budget & Rücklagen', value: 'Klare Trennung von Betrieb und strategischer Reserve', status: 'Geprüft' },
          { label: 'XRPL Guardrails', value: 'Entwicklung strikt auf Testnet · Mainnet nur mit Freigabe', status: 'Geschützt' },
          { label: 'Compliance-Stand', value: 'Freigaberichtlinien & Verträge dokumentiert', status: 'Synchron' },
        ],
      },
      bar: {
        tag: 'Raum 03 · Kuratorium',
        name: 'Kontor-Lounge & Bar',
        shortLabel: 'Bar',
        subtitle: 'Freigabe-Runde, Budget-Abstimmung & vertrauliche Übergaben',
        loungeTitle: 'Kontor-Lounge & Freigabe-Tisch',
        handoverPrompt: 'Prüfauftrag oder Freigabe-Notiz für das Kontor…',
      },
    };
  }

  return {
    werkstatt: {
      tag: 'Raum 01 · Umsetzung',
      name: `${label} · Werkstatt`,
      shortLabel: 'Werkstatt',
      subtitle: 'Aufgabenbrett, Schreibtisch & Wochenmappe der Abteilung',
      focusHint: 'Tägliche Aufgaben & Wochenplanung',
    },
    studio: {
      tag: 'Raum 02 · Wissen & Buch',
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
      tag: 'Raum 03 · Crew & Übergabe',
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
