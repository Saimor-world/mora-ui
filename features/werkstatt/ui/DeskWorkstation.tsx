'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { CrewRelicAvatar, deriveCrewRelic } from '@/components/world/CrewRelicAvatar';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import type { DeptMember } from '@/features/universe/ui/Workbench';
import type { WorkTask } from '@/lib/universe/deptWork';

export type StationKind =
  | 'kueche-station'      // Café: Backstube (Bestandszähler + Kühlhaus-Protokoll + Rezept-Umrechner)
  | 'service-station'     // Café: Gastraum (Reservierungs-Tischplan + Google-Bewertungen beantworten)
  | 'theke-station'       // Café: Theke (Siebträger-Checklisten Öffnen/Schließen + Schichttausch)
  | 'verwaltung-station'  // Café: Verwaltung (Lieferanten-Bestellung + Tageskasse + Urlaubsantrag)
  | 'atelier-station'     // SAIMÔR: ORIGIN // 001 Relikt- & Material-Prüfsockel + Dossier-Schnellschreiber
  | 'bar-station'         // SAIMÔR: Crew-Logbuch, Schicht-Übergabe & Abteilungs-Funk
  | 'bridge-station'      // SAIMÔR: Kommandobrücke (Captains-Freigaben & Quartals-Kompass)
  | 'kontor-station'      // SAIMÔR: Treasury-Kontor (Budget-Freigabe & XRPL-Testnet-Wächter)
  | 'technik-station';    // SAIMÔR: Maschinenraum (Core v3 Schnittstellen- & System-Prüfstand)

export function resolveStationKind(planetId: string, planetTitle: string, archetype: string): {
  kind: StationKind;
  deskLabel: string;
  deskHint: string;
  badgeText: string;
  fixtureLabel: string;
  fixtureSub: string;
  fixtureBox: { x: number; y: number; w: number; h: number };
} {
  const raw = `${planetId} ${planetTitle}`.toLowerCase();
  if (raw.includes('küche') || raw.includes('kueche') || raw.includes('backstube')) {
    return {
      kind: 'kueche-station',
      deskLabel: 'Backstuben-Werkbank · Bestand & Kühlprotokoll',
      deskHint: 'Bestand zählen · Kühlhaus 3 °C abzeichnen · Rezept-Mengen',
      badgeText: 'Bestand & Kühlhaus (3 °C ✓)',
      fixtureLabel: 'Kühlhaus- & Backofen-Check',
      fixtureSub: '3,1 °C OK · 24 Zimtschnecken',
      fixtureBox: { x: 118, y: 380, w: 170, h: 210 },
    };
  }
  if (raw.includes('service') || raw.includes('gastraum') || raw.includes('reservierung')) {
    return {
      kind: 'service-station',
      deskLabel: 'Empfangspult · Reservierungen & Gästestimmen',
      deskHint: 'Tischplan (12:30 Kanzlei Weber) · Google-Bewertungen beantworten',
      badgeText: '3 Reservierungen · 3 Bewertungen',
      fixtureLabel: 'Siebträger & Gast-Empfang',
      fixtureSub: '12:30 Kanzlei Weber (12 Pers.)',
      fixtureBox: { x: 8, y: 560, w: 220, h: 340 },
    };
  }
  if (raw.includes('theke') || raw.includes('aushilfe') || raw.includes('schicht')) {
    return {
      kind: 'theke-station',
      deskLabel: 'Siebträger-Theke · Checklisten & Schichttausch',
      deskHint: 'Öffnen (07:30) / Schließen (18:00) abhaken · Schichttausch Jonas → Lena',
      badgeText: 'Checkliste & Schichttausch',
      fixtureLabel: 'Siebträger-Maschine (9 bar)',
      fixtureSub: 'Öffnen 07:30 · Schichttausch Do',
      fixtureBox: { x: 8, y: 560, w: 220, h: 340 },
    };
  }
  if (raw.includes('verwaltung') || raw.includes('inhaber') || raw.includes('einkauf') || raw.includes('büro')) {
    return {
      kind: 'verwaltung-station',
      deskLabel: 'Inhaber-Kontor · Bestellung, Kasse & Urlaub',
      deskHint: 'Bestellung (214 € bis 14:00) · Tageskasse (1.842 €) · Urlaub Lena',
      badgeText: 'Bestellung 214 € · Kasse 1.842 €',
      fixtureLabel: 'Kontor-Waage & Kassenbuch',
      fixtureSub: '1.842 € Kasse · Bestellung 214 €',
      fixtureBox: { x: 34, y: 420, w: 175, h: 200 },
    };
  }
  if (archetype === 'studio' || raw.includes('studio') || raw.includes('design') || raw.includes('atelier')) {
    return {
      kind: 'atelier-station',
      deskLabel: 'ORIGIN // 001 Prüfsockel & Konzept-Folio',
      deskHint: 'Relikt Seed 1001 Material-Abnahme · Dossier direkt am Tisch bearbeiten',
      badgeText: 'ORIGIN // 001 · Seed 1001',
      fixtureLabel: 'ORIGIN // 001 Skulptur-Sockel',
      fixtureSub: 'Seed 1001 · Basalt & Quarzglas',
      fixtureBox: { x: 24, y: 470, w: 120, h: 150 },
    };
  }
  if (archetype === 'bar' || raw.includes('betrieb') || raw.includes('bar') || raw.includes('kunde')) {
    return {
      kind: 'bar-station',
      deskLabel: 'Crew-Tresen · Übergabe-Logbuch & Funk',
      deskHint: 'Captain & Crew filtern · Schicht-Übergabe · Post & Termine',
      badgeText: 'Crew-Logbuch & Funk',
      fixtureLabel: 'Espresso-Siebträger & Bar-Funk',
      fixtureSub: 'Crew an Bord · Schicht-Logbuch',
      fixtureBox: { x: 8, y: 560, w: 220, h: 340 },
    };
  }
  if (archetype === 'bridge' || raw.includes('kommando') || raw.includes('strategie') || raw.includes('leitung')) {
    return {
      kind: 'bridge-station',
      deskLabel: 'Kommandopult · Captains-Runde & Freigaben',
      deskHint: 'Strategische Entscheidungen · Captains-Sync · Partner-Freigaben',
      badgeText: 'Kommandopult · 3 Entscheidungen',
      fixtureLabel: 'Führungs-Waage & Charta-Siegel',
      fixtureSub: 'Captains-Runde 10:00 · Phase 01',
      fixtureBox: { x: 34, y: 420, w: 175, h: 200 },
    };
  }
  if (archetype === 'kontor' || raw.includes('finanz') || raw.includes('recht') || raw.includes('treasury')) {
    return {
      kind: 'kontor-station',
      deskLabel: 'Treasury-Kontor · Budget & XRPL-Freigaben',
      deskHint: 'Abteilungs-Budgets prüfen · XRPL Testnet-Status · Verträge',
      badgeText: 'Treasury & XRPL Testnet',
      fixtureLabel: 'Präzisionswaage & XRPL-Wächter',
      fixtureSub: 'Testnet aktiv · Budget geprüft',
      fixtureBox: { x: 34, y: 420, w: 175, h: 200 },
    };
  }
  return {
    kind: 'technik-station',
    deskLabel: 'Werkbank · System-Prüfstand & Releases',
    deskHint: 'Core v3 Schnittstellen · Lokaler Dev-Master · Release-Checkliste',
    badgeText: 'System-Prüfstand · Bereit',
    fixtureLabel: 'Messinglampe & System-Prüfstand',
    fixtureSub: 'Core v3 & Local Master aktiv',
    fixtureBox: { x: 118, y: 380, w: 170, h: 210 },
  };
}

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, val: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore quota
  }
}

export interface DeskWorkstationProps {
  stationKind: StationKind;
  planetId: string;
  planetTitle: string;
  crew: DeptMember[];
  tasks: WorkTask[];
  docs: Array<{ id: string; name: string; meta: string; folderId: string }>;
  activeDocTitle?: string;
  activeDocContent?: string;
  onSaveDoc?: (newContent: string) => void;
  onOpenBook?: (docId: string) => void;
  onSelectDoc?: (docId: string) => void;
  onCreateDoc?: (title: string, body: string) => void;
  onAddTask?: (title: string, assignee?: string | null) => void;
  onToggleTask?: (task: WorkTask) => void;
  onOpenTask?: (taskId: string) => void;
  mails?: Array<{ id: string; subject?: string; from?: string; from_addr?: string; received_at?: string; snippet?: string }>;
  events?: Array<{ id: string; title: string; time?: string; start?: string; location?: string }>;
  onClose: () => void;
}

export function DeskWorkstation({
  stationKind,
  planetId,
  planetTitle,
  crew,
  tasks,
  docs,
  activeDocTitle = '',
  activeDocContent = '',
  onSaveDoc,
  onOpenBook,
  onSelectDoc,
  onCreateDoc,
  onAddTask,
  onToggleTask,
  onOpenTask,
  mails = [],
  events = [],
  onClose,
}: DeskWorkstationProps) {
  // 1. KÜCHE & BACKSTUBE STATE (Bestand, Kühlprotokoll, Rezept-Rechner)
  const [inventory, setInventory] = useState(() =>
    readLocal(`mora.station.kueche.inv.${planetId}`, [
      { id: 'inv-hafer', name: 'Hafermilch (Barista)', current: 18, min: 24, unit: 'Liter', ordered: false },
      { id: 'inv-espresso', name: 'Kaffee Espresso-Röstung', current: 4, min: 6, unit: 'kg', ordered: true },
      { id: 'inv-mehl', name: 'Weizenmehl Type 550', current: 18, min: 10, unit: 'kg', ordered: false },
      { id: 'inv-zimt', name: 'Ceylon-Zimt & Kardamom', current: 3, min: 2, unit: 'Dosen', ordered: false },
    ])
  );
  const [coolingLogs, setCoolingLogs] = useState(() =>
    readLocal(`mora.station.kueche.cool.${planetId}`, [
      { id: 'c-kuehlhaus', zone: 'Kühlhaus Backstube', target: '≤ 4,0 °C', temp: '3,1 °C', checked: true, by: 'Tarek' },
      { id: 'c-theke', zone: 'Kühlschrank Theke', target: '≤ 6,0 °C', temp: '4,8 °C', checked: true, by: 'Lena' },
      { id: 'c-tk', zone: 'Tiefkühlung Teiglinge', target: '≤ -18,0 °C', temp: '-19,5 °C', checked: false, by: '' },
    ])
  );
  const [batchMultiplier, setBatchMultiplier] = useState<number>(1);
  useEffect(() => writeLocal(`mora.station.kueche.inv.${planetId}`, inventory), [inventory, planetId]);
  useEffect(() => writeLocal(`mora.station.kueche.cool.${planetId}`, coolingLogs), [coolingLogs, planetId]);

  // 2. SERVICE & GASTRAUM STATE (Reservierungen & Google-Bewertungen)
  const [reservations, setReservations] = useState(() =>
    readLocal(`mora.station.service.res.${planetId}`, [
      { id: 'res-1', time: '12:30', guest: 'Kanzlei Weber (Firmenessen)', pax: 12, table: 'Tisch 4–6', note: '2× vegetarisch, 1× glutenfrei · Sammelrechnung', status: 'bestaetigt' as 'bestaetigt' | 'sitzt' | 'abgerechnet' },
      { id: 'res-2', time: '15:00', guest: 'Geburtstag Familie Lindner', pax: 4, table: 'Fenstertisch 2', note: 'Torte wird mitgebracht · Tortenteller & Kerzen', status: 'bestaetigt' as 'bestaetigt' | 'sitzt' | 'abgerechnet' },
      { id: 'res-3', time: '09:00 (Do)', guest: 'Frühstück Elternabend', pax: 6, table: 'Tisch 8', note: 'Großes Frühstück, 2× Hafermilch', status: 'bestaetigt' as 'bestaetigt' | 'sitzt' | 'abgerechnet' },
    ])
  );
  const [newResGuest, setNewResGuest] = useState('');
  const [newResTime, setNewResTime] = useState('18:00');
  const [newResPax, setNewResPax] = useState('2');
  const [reviews, setReviews] = useState(() =>
    readLocal(`mora.station.service.rev.${planetId}`, [
      { id: 'rev-1', stars: '★★★★★', title: '„Bester Flat White der Stadt“', meta: 'Google · gestern', reply: 'Danke dir! Wir sagen es Tarek – die Zimtschnecken kommen morgens um sieben frisch raus.', sent: true },
      { id: 'rev-3', stars: '★★★☆☆', title: '„Samstag etwas lange auf den Kaffee gewartet“', meta: 'Google · heute 06:58', reply: 'Danke für die ehrliche Rückmeldung! Samstags ist viel los – wir sind ab dieser Woche zu zweit an der Siebträger-Maschine.', sent: false },
    ])
  );
  useEffect(() => writeLocal(`mora.station.service.res.${planetId}`, reservations), [reservations, planetId]);
  useEffect(() => writeLocal(`mora.station.service.rev.${planetId}`, reviews), [reviews, planetId]);

  // 3. THEKE & SCHICHT STATE (Öffnen/Schließen Checkliste + Schichttausch)
  const [barChecks, setBarChecks] = useState(() =>
    readLocal(`mora.station.theke.checks.${planetId}`, [
      { id: 'chk-1', shift: 'Öffnen · 07:30', label: 'Siebträger-Gruppen spülen & Brühdruck (9 bar) prüfen', done: true },
      { id: 'chk-2', shift: 'Öffnen · 07:30', label: 'Mühle auf Espresso-Röstung einstellen (18 g → 36 g in 27 s)', done: true },
      { id: 'chk-3', shift: 'Öffnen · 07:30', label: 'Vitrine mit frischen Zimtschnecken & Bananenbrot bestücken', done: false },
      { id: 'chk-4', shift: 'Schließen · 18:00', label: 'Siebträger mit Kaffeefettlöser rückspülen & Dampflanze reinigen', done: false },
      { id: 'chk-5', shift: 'Schließen · 18:00', label: 'Kassensturz & Kartenterminal-Tagesabschluss drucken', done: false },
    ])
  );
  const [shiftSwapApproved, setShiftSwapApproved] = useState(() =>
    readLocal(`mora.station.theke.swap.${planetId}`, false)
  );
  useEffect(() => writeLocal(`mora.station.theke.checks.${planetId}`, barChecks), [barChecks, planetId]);
  useEffect(() => writeLocal(`mora.station.theke.swap.${planetId}`, shiftSwapApproved), [shiftSwapApproved, planetId]);

  // 4. VERWALTUNG & BÜRO STATE (Lieferanten-Bestellung, Tageskasse, Urlaubsantrag)
  const [orderLines, setOrderLines] = useState(() =>
    readLocal(`mora.station.verwaltung.order.${planetId}`, [
      { id: 'ord-1', supplier: 'Rösterei Hügel', item: 'Espresso-Röstung Hausblend', qty: 6, unit: 'kg', unitPrice: 23 },
      { id: 'ord-2', supplier: 'Hofmolkerei Sonnental', item: 'Hafermilch Barista', qty: 24, unit: 'Liter', unitPrice: 2.15 },
      { id: 'ord-3', supplier: 'Hofmolkerei Sonnental', item: 'Bio-Vollmilch 3,8 %', qty: 12, unit: 'Liter', unitPrice: 1.95 },
    ])
  );
  const [orderSubmitted, setOrderSubmitted] = useState(() =>
    readLocal(`mora.station.verwaltung.orderSent.${planetId}`, false)
  );
  const [vacationApproved, setVacationApproved] = useState<'offen' | 'genehmigt' | 'rueckfrage'>(() =>
    readLocal(`mora.station.verwaltung.vacation.${planetId}`, 'offen')
  );
  useEffect(() => writeLocal(`mora.station.verwaltung.order.${planetId}`, orderLines), [orderLines, planetId]);
  useEffect(() => writeLocal(`mora.station.verwaltung.orderSent.${planetId}`, orderSubmitted), [orderSubmitted, planetId]);
  useEffect(() => writeLocal(`mora.station.verwaltung.vacation.${planetId}`, vacationApproved), [vacationApproved, planetId]);

  // 5. SAIMÔR ATELIER STATE (ORIGIN // 001 Material-Abnahme + Direkt-Folio)
  const [originSpecs, setOriginSpecs] = useState(() =>
    readLocal(`mora.station.atelier.specs.${planetId}`, [
      { id: 'sp-basalt', part: 'Körper & Stein', detail: 'Dunkler Basalt mit mikro-taktilem Relief (Seed 1001)', status: 'Kanonisch' as 'Kanonisch' | 'In Prüfung' | 'Freigegeben' },
      { id: 'sp-quarz', part: 'Optischer Kern', detail: 'Geschmolzener Quarz · Echte Brechung & ruhige Kaustik (AgX)', status: 'Freigegeben' as 'Kanonisch' | 'In Prüfung' | 'Freigegeben' },
      { id: 'sp-metal', part: 'Präzisionsfassung', detail: 'Gebürstetes Messing (Captain) / Ruthenium-Titan (Crew)', status: 'Freigegeben' as 'Kanonisch' | 'In Prüfung' | 'Freigegeben' },
      { id: 'sp-ma', part: 'Raumhaltung (Ma)', detail: 'Asymmetrische Ruhe · Frei von künstlichem Nebel', status: 'Kanonisch' as 'Kanonisch' | 'In Prüfung' | 'Freigegeben' },
    ])
  );
  const [editingFolio, setEditingFolio] = useState(false);
  const [folioDraft, setFolioDraft] = useState(activeDocContent);
  const [folioSaved, setFolioSaved] = useState(false);
  const [newDocOpen, setNewDocOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocBody, setNewDocBody] = useState('');
  const [studioTaskDraft, setStudioTaskDraft] = useState('');
  useEffect(() => setFolioDraft(activeDocContent), [activeDocContent]);
  useEffect(() => writeLocal(`mora.station.atelier.specs.${planetId}`, originSpecs), [originSpecs, planetId]);

  // 6. SAIMÔR BAR / CREW-TRESEN STATE
  const [selectedCrewName, setSelectedCrewName] = useState<string | null>(null);
  const [handoverDraft, setHandoverDraft] = useState('');
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);

  // 7. SAIMÔR KOMMANDOBRÜCKE / KONTOR / TECHNIK STATE
  const [bridgeDecisions, setBridgeDecisions] = useState(() =>
    readLocal(`mora.station.bridge.dec.${planetId}`, [
      { id: 'dec-1', title: 'Phase 01: ORIGIN // 001 als visueller & technischer Master', owner: 'Captain Marius', approved: true },
      { id: 'dec-2', title: 'Jede Abteilung besitzt ihren eigenen physischen Arbeitsraum', owner: 'Kaito R. & Sorel M.', approved: true },
      { id: 'dec-3', title: 'Kooperationsrahmen für ersten Pilotkunden freigeben', owner: 'Elena V.', approved: false },
    ])
  );
  const [newDirective, setNewDirective] = useState('');
  const [newDirectiveOwner, setNewDirectiveOwner] = useState('Captain Marius');
  useEffect(() => writeLocal(`mora.station.bridge.dec.${planetId}`, bridgeDecisions), [bridgeDecisions, planetId]);

  const [kontorBudgets, setKontorBudgets] = useState(() =>
    readLocal(`mora.station.kontor.budgets.${planetId}`, [
      { id: 'kb-origin', label: 'Phase 01 Produktion · ORIGIN // 001 Master', amount: 18500, owner: 'Sorel M.', approved: true },
      { id: 'kb-core', label: 'Mora Core v3 & Raumschiff-Infrastruktur', amount: 12400, owner: 'Kaito R.', approved: true },
      { id: 'kb-pilot', label: 'Pilotkunden-Onboarding & Partner-Rahmen', amount: 6800, owner: 'Tarek B.', approved: false },
      { id: 'kb-reserve', label: 'Strategische Liquiditätsreserve (Q4)', amount: 45000, owner: 'Clara D.', approved: true },
    ])
  );
  const [xrplChecks, setXrplChecks] = useState(() =>
    readLocal(`mora.station.kontor.xrpl.${planetId}`, [
      { id: 'xrpl-1', label: 'XRPL Testnet-Only aktiv (Mainnet-Sperre ohne Human-Approval)', ok: true },
      { id: 'xrpl-2', label: 'Keine Private Keys oder Wallet-Seeds im Repository', ok: true },
      { id: 'xrpl-3', label: 'Deterministischer Seed-Vertrag (1001–1111) SHA-256 verifiziert', ok: true },
    ])
  );
  useEffect(() => writeLocal(`mora.station.kontor.budgets.${planetId}`, kontorBudgets), [kontorBudgets, planetId]);
  useEffect(() => writeLocal(`mora.station.kontor.xrpl.${planetId}`, xrplChecks), [xrplChecks, planetId]);

  const [techSystems, setTechSystems] = useState(() =>
    readLocal(`mora.station.technik.sys.${planetId}`, [
      { id: 'sys-tree', name: 'Core v3 · /v3/tree & Abteilungs-Räume', detail: '1 Abteilung = 1 physischer Raum + transparente Fenster', latency: '4 ms', ok: true },
      { id: 'sys-tasks', name: 'Core v3 · /v3/tasks & Ordner-Bindung', detail: 'Karten an der Wandtafel + Direkt-Anlage im Raum', latency: '6 ms', ok: true },
      { id: 'sys-nodes', name: 'Core v3 · /v3/nodes & Doppelseiten-Buch', detail: 'Stehpult-Satz & Wochenmappe synchron', latency: '5 ms', ok: true },
      { id: 'sys-seed', name: 'Generator · Seed 1001 (ORIGIN // 001)', detail: 'Blender 4.2 LTS · Cycles AgX · Deterministisch', latency: 'Verifiziert', ok: true },
    ])
  );
  const [techTaskDraft, setTechTaskDraft] = useState('');
  useEffect(() => writeLocal(`mora.station.technik.sys.${planetId}`, techSystems), [techSystems, planetId]);

  const filteredTasks = useMemo(() => {
    if (!selectedCrewName) return tasks;
    const t = selectedCrewName.toLowerCase();
    return tasks.filter((x) => (x.assignee ?? '').toLowerCase() === t);
  }, [tasks, selectedCrewName]);

  const activeMail = useMemo(() => mails.find((m) => m.id === selectedSignalId) ?? null, [mails, selectedSignalId]);
  const activeEvent = useMemo(() => events.find((e) => e.id === selectedSignalId) ?? null, [events, selectedSignalId]);
  const totalOrderSum = useMemo(
    () => orderLines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0),
    [orderLines]
  );

  return (
    <div className="wk-workstation" data-testid="wk-workstation" data-station-kind={stationKind} lang="de">
      {/* =========================================================================================
          1. CAFÉ MORGENROT · KÜCHE & BACKSTUBE (Bestand zählen, Kühlprotokoll, Rezept-Umrechner)
         ========================================================================================= */}
      {stationKind === 'kueche-station' ? (
        <div className="wk-ws-grid" data-testid="wk-station-kueche">
          <section className="wk-ws-sheet">
            <header className="wk-ws-head">
              <div>
                <span className="wk-ws-eyebrow">Backstube & Vorratskammer</span>
                <h2>Bestandsliste & Nachbestellung</h2>
              </div>
              <button type="button" className="wk-ws-close" onClick={onClose}>Zurück in den Raum</button>
            </header>
            <p className="wk-ws-sub">Zähle den aktuellen Bestand in der Backstube. Alles unter Mindestbestand wird für die Donnerstags-Bestellung markiert.</p>
            <div className="wk-ws-list">
              {inventory.map((item) => {
                const low = item.current < item.min;
                return (
                  <div key={item.id} className={`wk-ws-row${low ? ' is-warn' : ''}`} data-testid={`wk-inv-${item.id}`}>
                    <div className="wk-ws-row__main">
                      <b>{item.name}</b>
                      <small>Mindestbestand: {item.min} {item.unit} {low ? '· UNTER MINIMUM' : '· Ausreichend'}</small>
                    </div>
                    <div className="wk-ws-counter">
                      <button type="button" onClick={() => setInventory((l) => l.map((x) => (x.id === item.id ? { ...x, current: Math.max(0, x.current - 1) } : x)))} aria-label={`${item.name} minus 1`}>−</button>
                      <span data-testid={`wk-inv-val-${item.id}`}>{item.current} {item.unit}</span>
                      <button type="button" onClick={() => setInventory((l) => l.map((x) => (x.id === item.id ? { ...x, current: x.current + 1 } : x)))} aria-label={`${item.name} plus 1`}>+</button>
                    </div>
                    <button
                      type="button"
                      className={`wk-ws-chip${item.ordered ? ' is-done' : ''}`}
                      onClick={() => setInventory((l) => l.map((x) => (x.id === item.id ? { ...x, ordered: !x.ordered } : x)))}
                    >
                      {item.ordered ? 'Auf Bestellliste ✓' : 'Nachbestellen'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="wk-ws-side">
            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">HACCP · Täglich 07:00 Uhr</span>
              <h3>Kühlhaus- & Hygiene-Protokoll</h3>
              <div className="wk-ws-list">
                {coolingLogs.map((c) => (
                  <div key={c.id} className="wk-ws-row">
                    <div className="wk-ws-row__main">
                      <b>{c.zone}</b>
                      <small>Soll: {c.target} · Gemessen: <b>{c.temp}</b></small>
                    </div>
                    <button
                      type="button"
                      className={`wk-ws-chip${c.checked ? ' is-done' : ''}`}
                      data-testid={`wk-cool-${c.id}`}
                      onClick={() => setCoolingLogs((l) => l.map((x) => (x.id === c.id ? { ...x, checked: !x.checked, by: !x.checked ? 'Marius' : '' } : x)))}
                    >
                      {c.checked ? `Geprüft (${c.by || 'OK'}) ✓` : 'Jetzt abzeichnen'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="wk-ws-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="wk-ws-eyebrow">Backstuben-Rechner</span>
                  <h3>Zimtschnecken-Teig (06:45 Uhr)</h3>
                </div>
                <div className="wk-ws-pills">
                  {[1, 1.5, 2].map((m) => (
                    <button key={m} type="button" className={`wk-ws-chip${batchMultiplier === m ? ' is-done' : ''}`} onClick={() => setBatchMultiplier(m)}>
                      {Math.round(24 * m)} Stk.
                    </button>
                  ))}
                </div>
              </div>
              <ul className="wk-ws-recipe">
                <li><span>Weizenmehl Type 550</span><b>{(1.0 * batchMultiplier).toFixed(1)} kg</b></li>
                <li><span>Hafermilch / Vollmilch lauwarm</span><b>{Math.round(500 * batchMultiplier)} ml</b></li>
                <li><span>Rohrohrzucker & Kardamom</span><b>{Math.round(120 * batchMultiplier)} g</b></li>
                <li><span>Frische Hefe (45 Min. Gare · 180 °C)</span><b>{Math.round(42 * batchMultiplier)} g</b></li>
              </ul>
            </div>
          </section>
        </div>
      ) : null}

      {/* =========================================================================================
          2. CAFÉ MORGENROT · SERVICE & GASTRAUM (Reservierungs-Tischplan & Google-Bewertungen)
         ========================================================================================= */}
      {stationKind === 'service-station' ? (
        <div className="wk-ws-grid" data-testid="wk-station-service">
          <section className="wk-ws-sheet">
            <header className="wk-ws-head">
              <div>
                <span className="wk-ws-eyebrow">Gastraum & Empfangspult</span>
                <h2>Reservierungsbuch & Tischplan</h2>
              </div>
              <button type="button" className="wk-ws-close" onClick={onClose}>Zurück in den Raum</button>
            </header>
            <form
              className="wk-ws-inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newResGuest.trim()) return;
                setReservations((prev) => [
                  ...prev,
                  { id: `res-${Date.now()}`, time: newResTime, guest: newResGuest.trim(), pax: Number(newResPax) || 2, table: 'Tisch 3', note: 'Neu eingetragen', status: 'bestaetigt' },
                ]);
                setNewResGuest('');
              }}
            >
              <input value={newResTime} onChange={(e) => setNewResTime(e.target.value)} style={{ width: 86 }} aria-label="Uhrzeit" />
              <input value={newResGuest} onChange={(e) => setNewResGuest(e.target.value)} placeholder="Name / Gruppe für neue Reservierung…" aria-label="Gastname" data-testid="wk-res-new-guest" />
              <input value={newResPax} onChange={(e) => setNewResPax(e.target.value)} style={{ width: 64 }} aria-label="Personen" />
              <button type="submit" className="wk-ws-btn">+ Reservieren</button>
            </form>
            <div className="wk-ws-list">
              {reservations.map((r) => (
                <div key={r.id} className="wk-ws-row" data-testid={`wk-res-${r.id}`}>
                  <div className="wk-ws-row__main">
                    <b>{r.time} Uhr · {r.guest} ({r.pax} Pers. · {r.table})</b>
                    <small>{r.note}</small>
                  </div>
                  <button
                    type="button"
                    className={`wk-ws-chip${r.status === 'sitzt' ? ' is-active' : r.status === 'abgerechnet' ? ' is-done' : ''}`}
                    onClick={() =>
                      setReservations((l) =>
                        l.map((x) =>
                          x.id === r.id
                            ? { ...x, status: x.status === 'bestaetigt' ? 'sitzt' : x.status === 'sitzt' ? 'abgerechnet' : 'bestaetigt' }
                            : x
                        )
                      )
                    }
                  >
                    {r.status === 'bestaetigt' ? 'Erwartet → Platzieren' : r.status === 'sitzt' ? 'Am Tisch ✓' : 'Abgerechnet ✓'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="wk-ws-side">
            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">Gästestimmen · Google-Profil</span>
              <h3>Bewertungen direkt beantworten</h3>
              <div className="wk-ws-list">
                {reviews.map((rev) => (
                  <div key={rev.id} className="wk-ws-review">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <b>{rev.stars} {rev.title}</b>
                      <small>{rev.meta}</small>
                    </div>
                    <textarea
                      rows={2}
                      value={rev.reply}
                      onChange={(e) => setReviews((l) => l.map((x) => (x.id === rev.id ? { ...x, reply: e.target.value, sent: false } : x)))}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className={`wk-ws-chip${rev.sent ? ' is-done' : ''}`}
                        onClick={() => setReviews((l) => l.map((x) => (x.id === rev.id ? { ...x, sent: true } : x)))}
                      >
                        {rev.sent ? 'Antwort veröffentlicht ✓' : 'Antwort jetzt absenden'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* =========================================================================================
          3. CAFÉ MORGENROT · THEKE & SCHICHT (Öffnen/Schließen-Checkliste & Schichttausch)
         ========================================================================================= */}
      {stationKind === 'theke-station' ? (
        <div className="wk-ws-grid" data-testid="wk-station-theke">
          <section className="wk-ws-sheet">
            <header className="wk-ws-head">
              <div>
                <span className="wk-ws-eyebrow">Siebträger-Theke & Barista-Ablauf</span>
                <h2>Tages-Checkliste: Öffnen (07:30) & Schließen (18:00)</h2>
              </div>
              <button type="button" className="wk-ws-close" onClick={onClose}>Zurück in den Raum</button>
            </header>
            <div className="wk-ws-list">
              {barChecks.map((c) => (
                <div key={c.id} className="wk-ws-row" data-testid={`wk-theke-check-${c.id}`}>
                  <div className="wk-ws-row__main">
                    <b>{c.label}</b>
                    <small>{c.shift}</small>
                  </div>
                  <button
                    type="button"
                    className={`wk-ws-chip${c.done ? ' is-done' : ''}`}
                    onClick={() => setBarChecks((l) => l.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))}
                  >
                    {c.done ? 'Erledigt ✓' : 'Abhaken'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="wk-ws-side">
            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">Schichtplan KW 44 · Anfrage heute 06:40</span>
              <h3>Schichttausch bestätigen</h3>
              <p className="wk-ws-sub">
                <b>Jonas</b> bittet um Tausch für <b>Donnerstag (09:30–18:00 Uhr)</b>. <b>Lena</b> hat bereits zugesagt, die Schicht zu übernehmen.
              </p>
              <button
                type="button"
                className={`wk-ws-btn${shiftSwapApproved ? ' is-done' : ''}`}
                data-testid="wk-theke-swap-btn"
                onClick={() => setShiftSwapApproved((v) => !v)}
              >
                {shiftSwapApproved ? 'Schichttausch (Lena übernimmt Do 09:30–18:00) bestätigt ✓' : 'Schichttausch Jonas → Lena jetzt freigeben'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* =========================================================================================
          4. CAFÉ MORGENROT · VERWALTUNG & BÜRO (Lieferanten-Bestellung, Kasse & Urlaub)
         ========================================================================================= */}
      {stationKind === 'verwaltung-station' ? (
        <div className="wk-ws-grid" data-testid="wk-station-verwaltung">
          <section className="wk-ws-sheet">
            <header className="wk-ws-head">
              <div>
                <span className="wk-ws-eyebrow">Inhaber-Kontor · Bestellschluss 14:00 Uhr</span>
                <h2>Lieferanten-Bestellung für Donnerstag</h2>
              </div>
              <button type="button" className="wk-ws-close" onClick={onClose}>Zurück in den Raum</button>
            </header>
            <div className="wk-ws-list">
              {orderLines.map((line) => (
                <div key={line.id} className="wk-ws-row">
                  <div className="wk-ws-row__main">
                    <b>{line.item}</b>
                    <small>{line.supplier} · {line.unitPrice.toFixed(2).replace('.', ',')} € / {line.unit}</small>
                  </div>
                  <div className="wk-ws-counter">
                    <button type="button" onClick={() => setOrderLines((l) => l.map((x) => (x.id === line.id ? { ...x, qty: Math.max(0, x.qty - 1) } : x)))}>−</button>
                    <span>{line.qty} {line.unit}</span>
                    <button type="button" onClick={() => setOrderLines((l) => l.map((x) => (x.id === line.id ? { ...x, qty: x.qty + 1 } : x)))}>+</button>
                  </div>
                  <b style={{ minWidth: 74, textAlign: 'right' }}>{(line.qty * line.unitPrice).toFixed(2).replace('.', ',')} €</b>
                </div>
              ))}
            </div>
            <div className="wk-ws-footer">
              <span>Gesamtsumme Bestellung: <b>{totalOrderSum.toFixed(2).replace('.', ',')} €</b></span>
              <button
                type="button"
                className={`wk-ws-btn${orderSubmitted ? ' is-done' : ''}`}
                data-testid="wk-verwaltung-order-btn"
                onClick={() => setOrderSubmitted((v) => !v)}
              >
                {orderSubmitted ? 'Bestellung an Rösterei & Hofmolkerei gesendet ✓' : 'Bestellung jetzt verbindlich freigeben →'}
              </button>
            </div>
          </section>

          <section className="wk-ws-side">
            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">Kassenbuch & Monatsziel</span>
              <h3>Tagesabschluss: 1.842,00 € (+9 % zur Vorwoche)</h3>
              <p className="wk-ws-sub">Kasse stimmt · 71 % Kartenzahlung · Stärkste Stunde: 12:00–13:00 Uhr · Oktober bisher: <b>38.410 € / 42.000 €</b>.</p>
            </div>
            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">Team & Personal</span>
              <h3>Urlaubsantrag: Lena (18.–22.11.)</h3>
              <p className="wk-ws-sub">Vertretung an der Theke durch Tarek und Jonas ist im Schichtplan möglich.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={`wk-ws-chip${vacationApproved === 'genehmigt' ? ' is-done' : ''}`} onClick={() => setVacationApproved('genehmigt')}>
                  {vacationApproved === 'genehmigt' ? 'Urlaub genehmigt ✓' : 'Urlaub genehmigen'}
                </button>
                <button type="button" className="wk-ws-chip" onClick={() => setVacationApproved('rueckfrage')}>
                  {vacationApproved === 'rueckfrage' ? 'Rückfrage vermerkt' : 'Rückfrage stellen'}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* =========================================================================================
          5. SAIMÔR // ATELIER (ORIGIN // 001 Prüfsockel, Direkt-Folio & Entwurfs-Aufgaben)
         ========================================================================================= */}
      {stationKind === 'atelier-station' ? (
        <div className="wk-ws-grid" data-testid="wk-studio-lectern">
          <section className="wk-ws-sheet">
            <header className="wk-ws-head">
              <div>
                <span className="wk-ws-eyebrow">Atelier-Zeichentisch · Konzept & Dossier</span>
                <h2>{activeDocTitle || 'ORIGIN // 001 Material-Manifest'}{folioSaved ? ' · Gespeichert ✓' : ''}</h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="wk-ws-chip"
                  data-testid="wk-studio-edit-toggle"
                  onClick={() => {
                    if (editingFolio && onSaveDoc) {
                      onSaveDoc(folioDraft);
                      setFolioSaved(true);
                      window.setTimeout(() => setFolioSaved(false), 2000);
                    }
                    setEditingFolio((v) => !v);
                  }}
                >
                  {editingFolio ? 'Vorschau' : '✎ Direkt schreiben'}
                </button>
                {docs[0] && onOpenBook ? (
                  <button type="button" className="wk-ws-chip" onClick={() => onOpenBook(docs[0].id)}>
                    Am Pult im Buch blättern →
                  </button>
                ) : null}
                <button type="button" className="wk-ws-close" onClick={onClose}>Zurück in den Raum</button>
              </div>
            </header>

            <div className="wk-ws-pills" style={{ marginBottom: 10 }}>
              {docs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`wk-ws-chip${d.name === activeDocTitle ? ' is-done' : ''}`}
                  data-testid={`wk-doc-card-${d.id}`}
                  onClick={() => onSelectDoc?.(d.id)}
                >
                  {d.name}
                </button>
              ))}
              <button type="button" className="wk-ws-chip" data-testid="wk-studio-new-doc-toggle" onClick={() => setNewDocOpen((v) => !v)}>
                {newDocOpen ? 'Schließen' : '+ Neues Dossier'}
              </button>
            </div>

            {newDocOpen ? (
              <form
                className="wk-ws-inline-form"
                data-testid="wk-studio-new-doc-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newDocTitle.trim()) return;
                  onCreateDoc?.(newDocTitle.trim(), newDocBody.trim());
                  setNewDocTitle('');
                  setNewDocBody('');
                  setNewDocOpen(false);
                }}
              >
                <input value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} placeholder="Titel des neuen Dossiers…" data-testid="wk-studio-new-doc-title" />
                <input value={newDocBody} onChange={(e) => setNewDocBody(e.target.value)} placeholder="Kernaussage / Entwurf…" />
                <button type="submit" className="wk-ws-btn">Anlegen</button>
              </form>
            ) : null}

            {editingFolio ? (
              <div className="wk-ws-editor">
                <textarea
                  value={folioDraft}
                  onChange={(e) => setFolioDraft(e.target.value)}
                  rows={10}
                  data-testid="wk-studio-editor"
                  aria-label="Dossier direkt im Atelier bearbeiten"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    className="wk-ws-btn is-done"
                    data-testid="wk-studio-save"
                    onClick={() => {
                      onSaveDoc?.(folioDraft);
                      setEditingFolio(false);
                      setFolioSaved(true);
                      window.setTimeout(() => setFolioSaved(false), 2000);
                    }}
                  >
                    Im Atelier speichern ✓
                  </button>
                </div>
              </div>
            ) : (
              <div className="wk-ws-folio-preview" data-testid="wk-studio-doc-preview">
                {folioDraft.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
          </section>

          <section className="wk-ws-side" data-testid="wk-studio-focus">
            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">Werkstück-Sockel · Seed 1001</span>
              <h3>SAIMÔR // ORIGIN // 001 · Material-Spektrum</h3>
              <div className="wk-ws-list">
                {originSpecs.map((s) => (
                  <div key={s.id} className="wk-ws-row">
                    <div className="wk-ws-row__main">
                      <b>{s.part}</b>
                      <small>{s.detail}</small>
                    </div>
                    <button
                      type="button"
                      className={`wk-ws-chip${s.status === 'Freigegeben' || s.status === 'Kanonisch' ? ' is-done' : ''}`}
                      onClick={() =>
                        setOriginSpecs((l) =>
                          l.map((x) =>
                            x.id === s.id
                              ? { ...x, status: x.status === 'In Prüfung' ? 'Freigegeben' : x.status === 'Freigegeben' ? 'Kanonisch' : 'In Prüfung' }
                              : x
                          )
                        )
                      }
                    >
                      {s.status}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">Atelier-Aufgaben ({tasks.filter((t) => !t.done).length} offen)</span>
              <form
                className="wk-ws-inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!studioTaskDraft.trim()) return;
                  onAddTask?.(studioTaskDraft.trim());
                  setStudioTaskDraft('');
                }}
              >
                <input
                  value={studioTaskDraft}
                  onChange={(e) => setStudioTaskDraft(e.target.value)}
                  placeholder="Neue Aufgabe zum Konzept…"
                  data-testid="wk-studio-new-task"
                />
                <button type="submit" className="wk-ws-btn">+</button>
              </form>
              <div className="wk-ws-list">
                {tasks.slice(0, 4).map((t) => (
                  <div key={t.id} className="wk-ws-row">
                    <button type="button" className={`wk-ws-chip${t.done ? ' is-done' : ''}`} onClick={() => onToggleTask?.(t)}>
                      {t.done ? '✓' : '○'}
                    </button>
                    <button type="button" className="wk-ws-row__main" style={{ textAlign: 'left', background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }} onClick={() => onOpenTask?.(t.id)}>
                      <b>{t.title}</b>
                      <small>{t.assignee || 'Atelier'}</small>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* =========================================================================================
          6. SAIMÔR // PANORAMA-BAR & CREW-SALON (Crew-Filter, Schicht-Logbuch & Abteilungs-Funk)
         ========================================================================================= */}
      {stationKind === 'bar-station' ? (
        <div className="wk-ws-grid" data-testid="wk-bar-handover">
          <section className="wk-ws-sheet">
            <header className="wk-ws-head">
              <div>
                <span className="wk-ws-eyebrow">Empfang, Crew & Schicht-Logbuch</span>
                <h2>{planetTitle} · Panorama-Bar & Crew-Salon · Schicht-Übergabe</h2>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {selectedCrewName ? <span className="wk-ws-chip is-done">Filter: {selectedCrewName}</span> : null}
                <button type="button" className="wk-ws-close" onClick={onClose}>Zurück in den Raum</button>
              </div>
            </header>

            <div className="wk-ws-crew-strip">
              {crew.map((c) => {
                const cleanName = c.name.replace(/\s*\(fiktiv\)/gi, '');
                const relic = deriveCrewRelic(c.id || c.name, Boolean(c.isCaptain));
                const active = selectedCrewName?.toLowerCase() === cleanName.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`wk-ws-crew-pill${active ? ' is-active' : ''}`}
                    data-testid={`wk-crew-${c.id}`}
                    onClick={() => setSelectedCrewName((prev) => (prev?.toLowerCase() === cleanName.toLowerCase() ? null : cleanName))}
                  >
                    <CrewRelicAvatar id={c.id} name={cleanName} isCaptain={c.isCaptain} status={c.status} size={32} testId={`wk-crew-avatar-${c.id}`} />
                    <div>
                      <b>{c.isCaptain ? `Captain ${cleanName}` : cleanName}</b>
                      <small>ORIGIN #{relic.instance} · {c.role || 'Crew'}</small>
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                className="wk-ws-crew-pill"
                data-testid="wk-mora-ship"
                onClick={() => useOsShellStore.getState().setMoraOpen(true)}
              >
                <div>
                  <b>MÔRA · Das Schiff</b>
                  <small>Brücke & Funk rufen →</small>
                </div>
              </button>
            </div>

            <form
              className="wk-ws-inline-form"
              data-testid="wk-bar-handover-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!handoverDraft.trim()) return;
                onAddTask?.(handoverDraft.trim(), selectedCrewName);
                setHandoverDraft('');
              }}
            >
              <input
                value={handoverDraft}
                onChange={(e) => setHandoverDraft(e.target.value)}
                placeholder={selectedCrewName ? `Übergabe an ${selectedCrewName} notieren…` : 'Übergabe für die nächste Schicht oder Kunden-Aufgabe…'}
                data-testid="wk-bar-handover-input"
              />
              <button type="submit" className="wk-ws-btn">Festhalten</button>
            </form>

            <div className="wk-ws-list" data-testid="wk-bar-tasks">
              {filteredTasks.map((t) => (
                <div key={t.id} className="wk-ws-row">
                  <button type="button" className={`wk-ws-chip${t.done ? ' is-done' : ''}`} onClick={() => onToggleTask?.(t)}>
                    {t.done ? 'Erledigt ✓' : 'Offen'}
                  </button>
                  <button type="button" className="wk-ws-row__main" style={{ textAlign: 'left', background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }} onClick={() => onOpenTask?.(t.id)}>
                    <b>{t.title}</b>
                    <small>{t.assignee ? `Zuständig: ${t.assignee}` : 'Team'}</small>
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="wk-ws-side" data-testid="wk-bar-signals">
            <div className="wk-ws-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="wk-ws-eyebrow">Abteilungs-Funk</span>
                  <h3>Post & Termine ({mails.length + events.length})</h3>
                </div>
                <button type="button" className="wk-ws-chip" data-testid="wk-bar-open-post" onClick={() => useOsShellStore.getState().setActiveFeature('post')}>
                  Post & Kalender →
                </button>
              </div>
              {activeMail ? (
                <div className="wk-ws-signal-box" data-testid="wk-bar-signal-detail">
                  <b>{activeMail.subject}</b>
                  <small>{activeMail.from || activeMail.from_addr}</small>
                  <p>{activeMail.snippet || 'Nachricht liegt im Posteingang bereit.'}</p>
                </div>
              ) : activeEvent ? (
                <div className="wk-ws-signal-box" data-testid="wk-bar-signal-detail">
                  <b>{activeEvent.title}</b>
                  <small>{activeEvent.time || 'Heute'} Uhr</small>
                </div>
              ) : null}
              <div className="wk-ws-list">
                {mails.map((m) => (
                  <button key={m.id} type="button" className="wk-ws-row wk-bar-signal-card" onClick={() => setSelectedSignalId((p) => (p === m.id ? null : m.id))}>
                    <div className="wk-ws-row__main" style={{ textAlign: 'left' }}>
                      <b>{m.subject}</b>
                      <small>{m.from || m.from_addr}</small>
                    </div>
                  </button>
                ))}
                {events.map((ev) => (
                  <button key={ev.id} type="button" className="wk-ws-row wk-bar-signal-card" onClick={() => setSelectedSignalId((p) => (p === ev.id ? null : ev.id))}>
                    <div className="wk-ws-row__main" style={{ textAlign: 'left' }}>
                      <b>{ev.title}</b>
                      <small>{ev.time || 'Heute'} Uhr</small>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* =========================================================================================
          7. SAIMÔR // KOMMANDOBRÜCKE (Strategische Direktiven, Captains-Runde & Charta)
         ========================================================================================= */}
      {stationKind === 'bridge-station' ? (
        <div className="wk-ws-grid" data-testid="wk-station-bridge-station">
          <section className="wk-ws-sheet">
            <header className="wk-ws-head">
              <div>
                <span className="wk-ws-eyebrow">Kommandobrücke · Führung & Strategie</span>
                <h2>Strategische Direktiven & Freigaben</h2>
              </div>
              <button type="button" className="wk-ws-close" onClick={onClose}>Zurück in den Raum</button>
            </header>
            <p className="wk-ws-sub">Verbindliche Führungs-Entscheidungen und Meilenstein-Freigaben für alle Abteilungen an Bord von SAIMÔR HQ.</p>

            <form
              className="wk-ws-inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newDirective.trim()) return;
                setBridgeDecisions((prev) => [
                  { id: `dec-${Date.now()}`, title: newDirective.trim(), owner: newDirectiveOwner.trim() || 'Captain Marius', approved: false },
                  ...prev,
                ]);
                onAddTask?.(newDirective.trim(), newDirectiveOwner.trim() || 'Marius');
                setNewDirective('');
              }}
            >
              <input
                value={newDirective}
                onChange={(e) => setNewDirective(e.target.value)}
                placeholder="Neue strategische Direktive oder Freigabe…"
                data-testid="wk-bridge-new-directive"
              />
              <input
                value={newDirectiveOwner}
                onChange={(e) => setNewDirectiveOwner(e.target.value)}
                placeholder="Captain / Owner"
                style={{ maxWidth: 165 }}
              />
              <button type="submit" className="wk-ws-btn">+ Direktive</button>
            </form>

            <div className="wk-ws-list">
              {bridgeDecisions.map((d) => (
                <div key={d.id} className="wk-ws-row" data-testid={`wk-bridge-dec-${d.id}`}>
                  <div className="wk-ws-row__main">
                    <b>{d.title}</b>
                    <small>Verantwortlich: {d.owner}</small>
                  </div>
                  <button
                    type="button"
                    className={`wk-ws-chip${d.approved ? ' is-done' : ''}`}
                    onClick={() => setBridgeDecisions((l) => l.map((x) => (x.id === d.id ? { ...x, approved: !x.approved } : x)))}
                  >
                    {d.approved ? 'Freigegeben ✓' : 'Jetzt freigeben'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="wk-ws-side">
            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">Captains-Runde · Schiffs-Status</span>
              <h3>Abteilungen & Bereitschaft</h3>
              <div className="wk-ws-list">
                <div className="wk-ws-row"><div className="wk-ws-row__main"><b>Design & Studio (Atelier)</b><small>Captain Sorel M. · ORIGIN // 001 Seed 1001</small></div><span className="wk-ws-chip is-done">Kanonisch ✓</span></div>
                <div className="wk-ws-row"><div className="wk-ws-row__main"><b>Produkt & Technik (Werkstatt)</b><small>Captain Kaito R. · Saimôr OS & Core v3</small></div><span className="wk-ws-chip is-done">Bereit ✓</span></div>
                <div className="wk-ws-row"><div className="wk-ws-row__main"><b>Betrieb & Kunden (Panorama-Bar)</b><small>Captain Tarek B. · Pilot-Onboarding</small></div><span className="wk-ws-chip is-done">Aktiv ✓</span></div>
                <div className="wk-ws-row"><div className="wk-ws-row__main"><b>Finanzen & Recht (Kontor)</b><small>Captain Clara D. · Treasury & XRPL Testnet</small></div><span className="wk-ws-chip is-done">Geschützt ✓</span></div>
              </div>
            </div>

            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">Charta & Dossiers am Stehpult</span>
              <h3>Im gebundenen Buch öffnen</h3>
              <div className="wk-ws-list">
                {docs.map((d) => (
                  <div key={d.id} className="wk-ws-row">
                    <div className="wk-ws-row__main"><b>{d.name}</b></div>
                    <button type="button" className="wk-ws-chip" onClick={() => onOpenBook?.(d.id)}>Buch öffnen →</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* =========================================================================================
          8. SAIMÔR // TREASURY-KONTOR (Budget-Freigaben, Liquidität & XRPL-Guardrails)
         ========================================================================================= */}
      {stationKind === 'kontor-station' ? (
        <div className="wk-ws-grid" data-testid="wk-station-kontor-station">
          <section className="wk-ws-sheet">
            <header className="wk-ws-head">
              <div>
                <span className="wk-ws-eyebrow">Treasury & Controlling · Hauptbuch</span>
                <h2>Abteilungs-Budgets & Rücklagen</h2>
              </div>
              <button type="button" className="wk-ws-close" onClick={onClose}>Zurück in den Raum</button>
            </header>
            <p className="wk-ws-sub">Klare Trennung von operativem Projektbudget und strategischer Reserve. Änderungen werden sofort im Kontor-Hauptbuch verbucht.</p>
            <div className="wk-ws-list">
              {kontorBudgets.map((b) => (
                <div key={b.id} className="wk-ws-row" data-testid={`wk-kontor-budget-${b.id}`}>
                  <div className="wk-ws-row__main">
                    <b>{b.label}</b>
                    <small>Verantwortlich: {b.owner}</small>
                  </div>
                  <div className="wk-ws-counter">
                    <button type="button" onClick={() => setKontorBudgets((l) => l.map((x) => (x.id === b.id ? { ...x, amount: Math.max(0, x.amount - 500) } : x)))}>−</button>
                    <span>{b.amount.toLocaleString('de-DE')} €</span>
                    <button type="button" onClick={() => setKontorBudgets((l) => l.map((x) => (x.id === b.id ? { ...x, amount: x.amount + 500 } : x)))}>+</button>
                  </div>
                  <button
                    type="button"
                    className={`wk-ws-chip${b.approved ? ' is-done' : ''}`}
                    onClick={() => setKontorBudgets((l) => l.map((x) => (x.id === b.id ? { ...x, approved: !x.approved } : x)))}
                  >
                    {b.approved ? 'Geprüft ✓' : 'Freigeben'}
                  </button>
                </div>
              ))}
            </div>
            <footer className="wk-ws-footer">
              <div>
                <span>Gesamtvolumen (Treasury & Budgets): </span>
                <b>{kontorBudgets.reduce((s, x) => s + x.amount, 0).toLocaleString('de-DE')},00 €</b>
              </div>
              <span className="wk-ws-chip is-done">Alle Rücklagen gedeckt ✓</span>
            </footer>
          </section>

          <section className="wk-ws-side">
            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">Sicherheits-Matrix & XRPL-Wächter</span>
              <h3>Compliance & Ledger-Guardrails</h3>
              <div className="wk-ws-list">
                {xrplChecks.map((c) => (
                  <div key={c.id} className="wk-ws-row">
                    <div className="wk-ws-row__main"><b>{c.label}</b></div>
                    <button
                      type="button"
                      className={`wk-ws-chip${c.ok ? ' is-done' : ''}`}
                      onClick={() => setXrplChecks((l) => l.map((x) => (x.id === c.id ? { ...x, ok: !x.ok } : x)))}
                    >
                      {c.ok ? 'Geschützt ✓' : 'Prüfen'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">Vertrags- & Richtlinien-Archiv</span>
              <h3>Am Kontor-Stehpult aufschlagen</h3>
              <div className="wk-ws-list">
                {docs.map((d) => (
                  <div key={d.id} className="wk-ws-row">
                    <div className="wk-ws-row__main"><b>{d.name}</b></div>
                    <button type="button" className="wk-ws-chip" onClick={() => onOpenBook?.(d.id)}>Buch öffnen →</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* =========================================================================================
          9. SAIMÔR // TECHNIK-WERKBANK (Core v3 Schnittstellen, Seed-Verifikation & Releases)
         ========================================================================================= */}
      {stationKind === 'technik-station' ? (
        <div className="wk-ws-grid" data-testid="wk-station-technik-station">
          <section className="wk-ws-sheet">
            <header className="wk-ws-head">
              <div>
                <span className="wk-ws-eyebrow">Maschinenraum & Architektur · Werkbank</span>
                <h2>System-Prüfstand & Mora Core v3</h2>
              </div>
              <button type="button" className="wk-ws-close" onClick={onClose}>Zurück in den Raum</button>
            </header>
            <p className="wk-ws-sub">Technischer Prüfstand für Saimôr OS, deterministische Raum-Assets und Core-v3-Schnittstellen.</p>
            <div className="wk-ws-list">
              {techSystems.map((s) => (
                <div key={s.id} className="wk-ws-row" data-testid={`wk-tech-sys-${s.id}`}>
                  <div className="wk-ws-row__main">
                    <b>{s.name}</b>
                    <small>{s.detail} · Antwortzeit: {s.latency}</small>
                  </div>
                  <button
                    type="button"
                    className={`wk-ws-chip${s.ok ? ' is-done' : ''}`}
                    onClick={() => setTechSystems((l) => l.map((x) => (x.id === s.id ? { ...x, ok: !x.ok } : x)))}
                  >
                    {s.ok ? 'Verifiziert ✓' : 'Neu prüfen'}
                  </button>
                </div>
              ))}
            </div>

            <form
              className="wk-ws-inline-form"
              style={{ marginTop: 12 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!techTaskDraft.trim()) return;
                onAddTask?.(techTaskDraft.trim(), 'Kaito R.');
                setTechTaskDraft('');
              }}
            >
              <input
                value={techTaskDraft}
                onChange={(e) => setTechTaskDraft(e.target.value)}
                placeholder="Neues technisches Ticket / Prüfauftrag an die Pinnwand heften…"
                data-testid="wk-tech-new-task"
              />
              <button type="submit" className="wk-ws-btn">+ Anheften</button>
            </form>
          </section>

          <section className="wk-ws-side">
            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">Offene Engineering-Aufgaben ({tasks.filter((t) => !t.done).length})</span>
              <h3>Aktueller Sprint an der Werkbank</h3>
              <div className="wk-ws-list">
                {tasks.slice(0, 4).map((t) => (
                  <div key={t.id} className="wk-ws-row">
                    <button type="button" className={`wk-ws-chip${t.done ? ' is-done' : ''}`} onClick={() => onToggleTask?.(t)}>
                      {t.done ? '✓' : '○'}
                    </button>
                    <button type="button" className="wk-ws-row__main" style={{ textAlign: 'left', background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }} onClick={() => onOpenTask?.(t.id)}>
                      <b>{t.title}</b>
                      <small>{t.assignee || 'Engineering'}</small>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="wk-ws-card">
              <span className="wk-ws-eyebrow">System-Dokumentation am Lesepult</span>
              <h3>Spezifikationen im Buch öffnen</h3>
              <div className="wk-ws-list">
                {docs.map((d) => (
                  <div key={d.id} className="wk-ws-row">
                    <div className="wk-ws-row__main"><b>{d.name}</b></div>
                    <button type="button" className="wk-ws-chip" onClick={() => onOpenBook?.(d.id)}>Buch öffnen →</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
