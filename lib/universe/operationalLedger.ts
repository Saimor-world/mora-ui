'use client';
import { useEffect, useState } from 'react';

/**
 * PRIORITÄT 0 & 1:
 * - Strikte Scope-Isolation zwischen SAIMÔR HQ ('saimor-hq') und Café Morgenrot ('demo-morgenrot').
 * - Idempotente Dokumentenspur (AuditLedger): Jede wichtige Tischaktion erzeugt genau EINEN
 *   nachvollziehbaren Eintrag (Zeitpunkt, Person, Abteilung, Aktion, Ergebnis, Sicherheitsstufe).
 *   Wiederholte Klicks mit demselben `idempotencyKey` erzeugen niemals doppelte Buchungen.
 * - Durchgehender 4-Raum-Geschäftsprozess "Kanzlei Weber" für Café Morgenrot.
 */

export type ScopeKey = 'demo-morgenrot' | 'saimor-hq';
export type DataTruth = 'local-sim' | 'core-synced';
export type SafetyLevel = 'routine' | 'buchung' | 'freigabe';

export interface AuditEntry {
  id: string;
  idempotencyKey: string;
  timestamp: string;
  isoTime: string;
  actor: string;
  departmentId: string;
  departmentTitle: string;
  action: string;
  result: string;
  safetyLevel: SafetyLevel;
  truth: DataTruth;
  amountDelta?: number;
}

export interface KanzleiWeberState {
  /** Schritt 1 (Gastraum): Reservierung bestätigt & Auftrag an Küche/Theke ausgelöst */
  step1Confirmed: boolean;
  /** Schritt 2 (Küche & Backstube): Frische Zimtschnecken-Charge gebacken & an Theke gemeldet */
  step2Baked: boolean;
  /** Schritt 3 (Theke & Schicht): Vitrinenbestand übernommen & 12× Getränke/Gedeck zugeordnet */
  step3Served: boolean;
  /** Schritt 4 (Verwaltung & Büro): 142,00 € exakt einmalig verbucht & Dossier erzeugt */
  step4Booked: boolean;
  /** MÔRAs Folge-Aktion: Hafermilch-Nachbestellung für morgen vorbereitet */
  oatMilkReorderPrepared: boolean;
}

export interface ScopedOperationalState {
  scope: ScopeKey;
  truth: DataTruth;
  /** Basis-Tageskasse im Café (1842,00 €) */
  baseTillEur: number;
  /** Summe aller idempotent verbuchten Umsätze */
  bookedRevenueEur: number;
  /** Kassenabschluss im Büro vollzogen */
  tillClosed: boolean;
  /** Verbindliche Lieferantenbestellung im Büro freigegeben */
  supplierOrderApproved: boolean;
  /** Anzahl gebackener Zimtschnecken-Bleche in der Vitrine */
  vitrineTrays: number;
  /** Aktueller Hafermilch-Bestand in Litern (Warnung bei < 20 L) */
  oatMilkLiters: number;
  /** Durchgehender 4-Raum-Vorgang Kanzlei Weber */
  kanzleiWeber: KanzleiWeberState;
  /** Idempotente Dokumentenspur (neueste zuerst) */
  auditTrail: AuditEntry[];
}

const EVENT_NAME = 'mora:operational-ledger-sync';

export function resolveScopeKey(companyId?: string | null, planetId?: string | null): ScopeKey {
  if (
    companyId?.startsWith('demo-') ||
    planetId === 'd-kueche' ||
    planetId === 'd-service' ||
    planetId === 'd-theke' ||
    planetId === 'd-verw'
  ) {
    return 'demo-morgenrot';
  }
  return 'saimor-hq';
}

function storageKey(scope: ScopeKey): string {
  return `mora.operational.ledger.v2.${scope}`;
}

function defaultState(scope: ScopeKey): ScopedOperationalState {
  return {
    scope,
    truth: 'local-sim',
    baseTillEur: scope === 'demo-morgenrot' ? 1842.0 : 0,
    bookedRevenueEur: 0,
    tillClosed: false,
    supplierOrderApproved: false,
    vitrineTrays: 1,
    oatMilkLiters: 18,
    kanzleiWeber: {
      step1Confirmed: false,
      step2Baked: false,
      step3Served: false,
      step4Booked: false,
      oatMilkReorderPrepared: false,
    },
    auditTrail: [],
  };
}

export function readOperationalState(scope: ScopeKey): ScopedOperationalState {
  if (typeof window === 'undefined') return defaultState(scope);
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return defaultState(scope);
    const parsed = JSON.parse(raw) as Partial<ScopedOperationalState>;
    const def = defaultState(scope);
    return {
      ...def,
      ...parsed,
      scope,
      kanzleiWeber: { ...def.kanzleiWeber, ...(parsed.kanzleiWeber ?? {}) },
      auditTrail: Array.isArray(parsed.auditTrail) ? parsed.auditTrail : [],
    };
  } catch {
    return defaultState(scope);
  }
}

function writeOperationalState(scope: ScopeKey, next: ScopedOperationalState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { scope, state: next } }));
  } catch {
    // ignore storage quota errors
  }
}

export function recordOperationalAction(
  scope: ScopeKey,
  params: {
    idempotencyKey: string;
    actor: string;
    departmentId: string;
    departmentTitle: string;
    action: string;
    result: string;
    safetyLevel?: SafetyLevel;
    amountDelta?: number;
    mutate?: (draft: ScopedOperationalState) => void;
  }
): { state: ScopedOperationalState; entry: AuditEntry; alreadyRecorded: boolean } {
  const current = readOperationalState(scope);
  const existing = current.auditTrail.find((e) => e.idempotencyKey === params.idempotencyKey);
  if (existing) {
    return { state: current, entry: existing, alreadyRecorded: true };
  }

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const entry: AuditEntry = {
    id: `audit-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    idempotencyKey: params.idempotencyKey,
    timestamp: `${hh}:${mm}`,
    isoTime: now.toISOString(),
    actor: params.actor,
    departmentId: params.departmentId,
    departmentTitle: params.departmentTitle,
    action: params.action,
    result: params.result,
    safetyLevel: params.safetyLevel ?? 'buchung',
    truth: current.truth,
    amountDelta: params.amountDelta,
  };

  const next: ScopedOperationalState = {
    ...current,
    bookedRevenueEur:
      typeof params.amountDelta === 'number'
        ? Math.round((current.bookedRevenueEur + params.amountDelta) * 100) / 100
        : current.bookedRevenueEur,
    kanzleiWeber: { ...current.kanzleiWeber },
    auditTrail: [entry, ...current.auditTrail],
  };

  if (params.mutate) {
    params.mutate(next);
  }

  writeOperationalState(scope, next);
  return { state: next, entry, alreadyRecorded: false };
}

export function useOperationalLedger(scope: ScopeKey) {
  const [state, setState] = useState<ScopedOperationalState>(() => readOperationalState(scope));

  useEffect(() => {
    setState(readOperationalState(scope));
    const onSync = (ev: Event) => {
      const detail = (ev as CustomEvent<{ scope: ScopeKey; state: ScopedOperationalState }>).detail;
      if (!detail || detail.scope === scope) {
        setState(readOperationalState(scope));
      }
    };
    window.addEventListener(EVENT_NAME, onSync);
    return () => window.removeEventListener(EVENT_NAME, onSync);
  }, [scope]);

  return {
    state,
    record: (params: Parameters<typeof recordOperationalAction>[1]) => recordOperationalAction(scope, params),
  };
}

/** Formatiert einen AuditEntry als Markdown-Zeile für die automatische Dokumentenspur im Buch am Stehpult. */
export function formatAuditMarkdownLine(entry: AuditEntry): string {
  const levelBadge =
    entry.safetyLevel === 'freigabe'
      ? '[FREIGABE]'
      : entry.safetyLevel === 'buchung'
        ? '[BUCHUNG]'
        : '[CHECK]';
  return `- **${entry.timestamp} Uhr · ${entry.departmentTitle} (${entry.actor})** ${levelBadge}: ${entry.action} → *${entry.result}* (\`#${entry.idempotencyKey}\`)`;
}

/** Abteilungs-Vorlagen für das Wandregal (Priorität 4: Vorlagen- und Dossier-Archiv) */
export interface ShelfTemplate {
  id: string;
  title: string;
  category: string;
  body: string;
}

export function getShelfTemplatesForDepartment(planetId: string, planetTitle: string): ShelfTemplate[] {
  if (planetId === 'd-service') {
    return [
      {
        id: 'tpl-weber-beleg',
        title: 'Bewirtungs- & Gruppenprotokoll Kanzlei Weber',
        category: 'Gastraum-Vorlage',
        body: `## Gruppenprotokoll · Kanzlei Weber (12 Personen)\n\n- **Tisch**: Tafel 4–6 (Gastraum Fensterseite)\n- **Menü & Besonderheiten**: 2× vegetarisch, 1× glutenfrei, Sammelrechnung (142,00 €)\n- **Service-Verantwortung**: Lena K.\n- **Status**: Vorbereitet & mit Backstube/Theke abgestimmt.`,
      },
      {
        id: 'tpl-event-kalk',
        title: 'Wochenend-Reservierungs- & Tafelplan',
        category: 'Service-Vorlage',
        body: `## Wochenend-Tafelplan (${planetTitle})\n\n- **Samstag Frühschicht**: Vollbesetzung an Siebträger & Empfang\n- **Große Gruppen**: Kanzlei- & Familien-Reservierungen vorab eindecken.`,
      },
    ];
  }
  if (planetId === 'd-kueche') {
    return [
      {
        id: 'tpl-haccp-monat',
        title: 'HACCP-Kühlhaus- & Hygiene-Nachweis',
        category: 'Pflicht-Nachweis',
        body: `## HACCP-Temperatur- & Hygiene-Protokoll\n\n- **Kühlhaus Backstube**: Soll ≤ 4,0 °C · Ist 3,1 °C (Tarek B.)\n- **Kühlschrank Theke**: Soll ≤ 6,0 °C · Ist 4,8 °C (Lena K.)\n- **Tiefkühlung Teiglinge**: Soll ≤ -18,0 °C · Ist -19,5 °C\n- **Freigabe**: Alle Kühlketten eingehalten.`,
      },
      {
        id: 'tpl-saison-rezept',
        title: 'Backstuben-Rezeptblatt · Kardamom-Zimtschnecken (36 Stk.)',
        category: 'Rezeptur',
        body: `## Rezeptblatt · Kardamom-Zimtschnecken (180 °C Schwaden)\n\n- **Weizenmehl Type 550**: 1.800 g\n- **Butter (Weide)**: 390 g\n- **Ceylon-Zimt & Kardamom**: 68 g\n- **Backzeit**: 14 Minuten bei 180 °C mit Schwadenstoß.`,
      },
    ];
  }
  if (planetId === 'd-theke') {
    return [
      {
        id: 'tpl-barista-kalibrierung',
        title: 'Siebträger- & Mühlen-Kalibrierungsprotokoll',
        category: 'Barista-Standard',
        body: `## Espresso-Kalibrierung · Hausröstung Hügel\n\n- **Dosis**: 18,5 g im Doppelsieb\n- **bezogene Menge (Yield)**: 38,0 g in 27 Sekunden\n- **Temperatur**: 93,2 °C · Druck: 9,0 bar.`,
      },
      {
        id: 'tpl-schicht-uebergabe',
        title: 'Schicht-Übergabeprotokoll Früh → Spät',
        category: 'Schichtbuch',
        body: `## Schicht-Übergabe (${planetTitle})\n\n- **Vitrine**: Frisch bestückt aus der Backstube\n- **Hafermilch-Vorrat**: Nachmittags-Reserve im Unterbau geprüft.`,
      },
    ];
  }
  if (planetId === 'd-verw') {
    return [
      {
        id: 'tpl-tagesabschluss',
        title: 'Prüfbarer Kassen- & Tagesabschluss-Bericht',
        category: 'Buchhaltung',
        body: `## Tagesabschluss-Dossier · Café Morgenrot\n\n- **Basis-Umsatz**: 1.842,00 €\n- **Großauftrag Kanzlei Weber**: 142,00 € (Sammelrechnung Tafel 4–6)\n- **Lieferantenfreigabe**: Rösterei Hügel & Hofmolkerei (213,00 €).`,
      },
      {
        id: 'tpl-hafermilch-order',
        title: 'Lieferanten-Nachbestellung · Hofmolkerei (Hafermilch & Sahne)',
        category: 'Bestellwesen',
        body: `## Verbindliche Nachbestellung · Hofmolkerei\n\n- **Anlass**: Bestand Hafermilch nach Kanzlei-Weber-Service unter Meldegrenze (16 / 24 L)\n- **Bestellmenge**: 36 Liter Hafermilch Barista + 10 Liter frische Vollmilch.`,
      },
    ];
  }
  // SAIMÔR HQ Vorlagen
  return [
    {
      id: `tpl-hq-adr-${planetId}`,
      title: `Architektur- & Entscheidungs-Dossier (${planetTitle})`,
      category: 'SAIMÔR HQ Standard',
      body: `## Architektur- & Entscheidungs-Dossier · ${planetTitle}\n\n- **Kanonische Referenz**: SAIMÔR // ORIGIN (Seed 1001)\n- **Verantwortung**: Abteilungs-Captain\n- **Dokumentenspur**: Verifiziert im Abteilungs-Hauptbuch.`,
    },
    {
      id: `tpl-hq-audit-${planetId}`,
      title: `Meilenstein- & Freigabe-Protokoll (${planetTitle})`,
      category: 'Freigabe-Dossier',
      body: `## Meilenstein-Freigabe · ${planetTitle}\n\n- **Sicherheitsstufe**: Verbindliche Freigabe\n- **Guardrails**: Deterministisches Parameter-Manifest & XRPL Testnet-Isolierung aktiv.`,
    },
  ];
}
