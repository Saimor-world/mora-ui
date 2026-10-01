/**
 * Demo Data for Begleitungen App
 *
 * Used only in development mode when backend is unavailable.
 * Generic examples for coaches, consultants, freelancers, mentors.
 */

import type {
  Angebot,
  Begleitung,
  BegleitungDatei,
  BegleitungenOverview,
  BegleitungSession,
  Klientin,
  KlientinMitAttention,
} from './types';
import type { BegleitungDetail } from './begleitungenClient';

const ANGEBOTE: Angebot[] = [
  {
    id: 'angebot-einzel',
    name: 'Einzelsession',
    typ: 'einmalig',
    beschreibung: 'Einmalige Beratung oder Standortbestimmung.',
  },
  {
    id: 'angebot-beratung',
    name: 'Laufende Beratung',
    typ: 'laufend',
    beschreibung: 'Regelmäßige Begleitung ohne festes Ende.',
  },
  {
    id: 'angebot-programm',
    name: '12-Wochen-Programm',
    typ: 'programm',
    beschreibung: 'Strukturiertes Programm mit festem Zeitrahmen.',
    dauerWochen: 12,
  },
];

const DEMO_KLIENTINNEN: Klientin[] = [
  {
    id: 'kl-001',
    name: 'Alex Müller',
    email: 'alex.m@example.com',
    notizen: 'Fokus auf berufliche Neuorientierung.',
    erstelltAm: '2026-07-15T10:00:00Z',
  },
  {
    id: 'kl-002',
    name: 'Chris Weber',
    email: 'chris.w@example.com',
    telefon: '+49 171 555 1234',
    notizen: 'Arbeitet an persönlicher Entwicklung.',
    erstelltAm: '2026-08-01T14:30:00Z',
  },
  {
    id: 'kl-003',
    name: 'Sam Fischer',
    email: 'sam.f@example.com',
    notizen: 'Selbstständig, sucht strategische Klarheit.',
    erstelltAm: '2026-08-20T09:00:00Z',
  },
  {
    id: 'kl-004',
    name: 'Kim Bauer',
    email: 'kim.b@example.com',
    notizen: 'Erste Zusammenarbeit, Einzelsession gebucht.',
    erstelltAm: '2026-09-10T11:00:00Z',
  },
];

const DEMO_BEGLEITUNGEN: Begleitung[] = [
  {
    id: 'bgl-001',
    klientinId: 'kl-001',
    angebotId: 'angebot-programm',
    status: 'aktiv',
    startDatum: '2026-08-01',
    endDatum: '2026-10-24',
    aktuelleWoche: 9,
    gesamtWochen: 12,
    erstelltAm: '2026-07-28T10:00:00Z',
  },
  {
    id: 'bgl-002',
    klientinId: 'kl-002',
    angebotId: 'angebot-programm',
    status: 'aktiv',
    startDatum: '2026-09-01',
    endDatum: '2026-11-24',
    aktuelleWoche: 5,
    gesamtWochen: 12,
    erstelltAm: '2026-08-25T14:00:00Z',
  },
  {
    id: 'bgl-003',
    klientinId: 'kl-003',
    angebotId: 'angebot-beratung',
    status: 'aktiv',
    startDatum: '2026-09-15',
    erstelltAm: '2026-09-14T09:00:00Z',
  },
  {
    id: 'bgl-004',
    klientinId: 'kl-004',
    angebotId: 'angebot-einzel',
    status: 'abgeschlossen',
    startDatum: '2026-09-20',
    erstelltAm: '2026-09-18T11:00:00Z',
  },
];

const DEMO_SESSIONS: BegleitungSession[] = [
  {
    id: 'sess-001',
    begleitungId: 'bgl-001',
    datum: '2026-08-05T10:00:00Z',
    status: 'durchgeführt',
    dauer: 60,
    rohNotizen: 'Erstes Kennenlernen. Aktuelle Situation und Ziele besprochen.',
    zusammenfassung: 'Klare Ausgangslage definiert. Bereitschaft für Veränderung ist da.',
    naechsteSchritte: ['Ziele schriftlich festhalten', 'Aktuelle Situation reflektieren'],
    erstelltAm: '2026-08-05T11:30:00Z',
  },
  {
    id: 'sess-002',
    begleitungId: 'bgl-001',
    datum: '2026-08-19T10:00:00Z',
    status: 'durchgeführt',
    dauer: 55,
    rohNotizen: 'Reflexion hat neue Erkenntnisse gebracht. Konkrete Richtung wird klarer.',
    zusammenfassung: 'Fortschritt bei der Zieldefinition. Nächste Schritte identifiziert.',
    naechsteSchritte: ['Plan für die nächsten 4 Wochen erstellen', 'Ressourcen sammeln'],
    erstelltAm: '2026-08-19T11:15:00Z',
  },
  {
    id: 'sess-003',
    begleitungId: 'bgl-001',
    datum: '2026-09-02T10:00:00Z',
    status: 'durchgeführt',
    dauer: 65,
    rohNotizen: 'Umsetzungsphase begonnen. Erste Erfolge sichtbar.',
    erstelltAm: '2026-09-02T11:30:00Z',
  },
  {
    id: 'sess-004',
    begleitungId: 'bgl-001',
    datum: '2026-09-16T10:00:00Z',
    status: 'durchgeführt',
    dauer: 50,
    rohNotizen: 'Guter Fortschritt. Herausforderungen besprochen und Lösungen gefunden.',
    erstelltAm: '2026-09-16T11:00:00Z',
  },
  {
    id: 'sess-005',
    begleitungId: 'bgl-002',
    datum: '2026-09-05T14:00:00Z',
    status: 'durchgeführt',
    dauer: 60,
    rohNotizen: 'Fokus auf persönliche Entwicklung. Ausgangspunkt definiert.',
    zusammenfassung: 'Klares Bild der aktuellen Situation. Motivation ist hoch.',
    naechsteSchritte: ['Tägliche Reflexion 10 Min', 'Fortschritte dokumentieren'],
    erstelltAm: '2026-09-05T15:30:00Z',
  },
  {
    id: 'sess-006',
    begleitungId: 'bgl-002',
    datum: '2026-09-19T14:00:00Z',
    status: 'durchgeführt',
    dauer: 55,
    rohNotizen: 'Dokumentation war hilfreich. Erste Muster erkannt.',
    erstelltAm: '2026-09-19T15:15:00Z',
  },
  {
    id: 'sess-007',
    begleitungId: 'bgl-004',
    datum: '2026-09-20T11:00:00Z',
    status: 'durchgeführt',
    dauer: 75,
    rohNotizen: 'Einzelsession für Standortbestimmung. Klare Handlungsempfehlungen.',
    zusammenfassung: 'Situationsanalyse abgeschlossen. Konkrete nächste Schritte definiert.',
    naechsteSchritte: ['Empfehlungen in den nächsten 3 Wochen umsetzen'],
    erstelltAm: '2026-09-20T12:30:00Z',
  },
];

const DEMO_DATEIEN: BegleitungDatei[] = [
  {
    id: 'file-001',
    begleitungId: 'bgl-001',
    sessionId: 'sess-001',
    name: 'Woche1-Arbeitsblatt.pdf',
    typ: 'worksheet',
    groesse: 245000,
    hochgeladenAm: '2026-08-05T12:00:00Z',
  },
  {
    id: 'file-002',
    begleitungId: 'bgl-001',
    sessionId: 'sess-002',
    name: 'Ressourcen-Übersicht.pdf',
    typ: 'dokument',
    groesse: 850000,
    hochgeladenAm: '2026-08-19T12:00:00Z',
  },
  {
    id: 'file-003',
    begleitungId: 'bgl-002',
    sessionId: 'sess-005',
    name: 'Reflexions-Vorlage.pdf',
    typ: 'worksheet',
    groesse: 180000,
    hochgeladenAm: '2026-09-05T16:00:00Z',
  },
];

function findAngebot(id: string): Angebot {
  return ANGEBOTE.find((a) => a.id === id) || ANGEBOTE[0];
}

function findKlientin(id: string): Klientin | undefined {
  return DEMO_KLIENTINNEN.find((k) => k.id === id);
}

function findSessions(begleitungId: string): BegleitungSession[] {
  return DEMO_SESSIONS.filter((s) => s.begleitungId === begleitungId).sort(
    (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()
  );
}

export function generateDemoData(): BegleitungenOverview {
  const klientinnen: KlientinMitAttention[] = DEMO_BEGLEITUNGEN.map((begleitung) => {
    const klientin = findKlientin(begleitung.klientinId);
    const angebot = findAngebot(begleitung.angebotId);
    const sessions = findSessions(begleitung.id);
    const letzteSession = sessions.find((s) => s.status === 'durchgeführt');

    if (!klientin) {
      throw new Error(`Klientin ${begleitung.klientinId} nicht gefunden`);
    }

    return {
      klientin,
      begleitung,
      angebot,
      letzteSession,
      sessionCount: sessions.length,
    };
  });

  const stats = {
    aktiv: klientinnen.filter((k) => k.begleitung.status === 'aktiv').length,
    pausiert: klientinnen.filter((k) => k.begleitung.status === 'pausiert').length,
    abgeschlossen: klientinnen.filter((k) => k.begleitung.status === 'abgeschlossen').length,
    total: klientinnen.length,
  };

  return {
    klientinnen,
    needsAttention: [],
    stats,
  };
}

export function getDemoBegleitungDetail(begleitungId: string): BegleitungDetail | null {
  const begleitung = DEMO_BEGLEITUNGEN.find((b) => b.id === begleitungId);
  if (!begleitung) return null;

  const klientin = findKlientin(begleitung.klientinId);
  if (!klientin) return null;

  const angebot = findAngebot(begleitung.angebotId);
  const sessions = findSessions(begleitungId);
  const dateien = DEMO_DATEIEN.filter((d) => d.begleitungId === begleitungId);

  return {
    begleitung,
    klientin,
    angebot,
    sessions,
    dateien,
  };
}
