/**
 * Begleitungen (Client Journeys) Domain Types
 *
 * Data model for tracking client relationships over time.
 * Built for coaches, consultants, freelancers, and mentors.
 */

export type AngebotTyp = 'einmalig' | 'laufend' | 'programm';
export type BegleitungStatus = 'aktiv' | 'pausiert' | 'abgeschlossen';
export type SessionStatus = 'geplant' | 'durchgeführt' | 'abgesagt';

export interface Angebot {
  id: string;
  name: string;
  typ: AngebotTyp;
  beschreibung?: string;
  dauerWochen?: number;
}

export interface Klientin {
  id: string;
  name: string;
  email?: string;
  telefon?: string;
  notizen?: string;
  avatarUrl?: string;
  erstelltAm: string;
  aktualisiertAm?: string;
}

export interface Begleitung {
  id: string;
  klientinId: string;
  angebotId: string;
  status: BegleitungStatus;
  startDatum: string;
  endDatum?: string;
  aktuelleWoche?: number;
  gesamtWochen?: number;
  notizen?: string;
  erstelltAm: string;
  aktualisiertAm?: string;
}

export interface BegleitungSession {
  id: string;
  begleitungId: string;
  datum: string;
  status: SessionStatus;
  dauer?: number;
  rohNotizen?: string;
  zusammenfassung?: string;
  naechsteSchritte?: string[];
  erstelltAm: string;
  aktualisiertAm?: string;
}

export interface BegleitungDatei {
  id: string;
  begleitungId: string;
  sessionId?: string;
  name: string;
  typ: 'worksheet' | 'audio' | 'video' | 'dokument' | 'sonstiges';
  url?: string;
  groesse?: number;
  hochgeladenAm: string;
}

export interface NaechsterTermin {
  sessionId?: string;
  datum: string;
  notiz?: string;
}

export interface KlientinMitBegleitung {
  klientin: Klientin;
  begleitung: Begleitung;
  angebot: Angebot;
  letzteSession?: BegleitungSession;
  naechsterTermin?: NaechsterTermin;
  sessionCount: number;
}

export interface AttentionSignal {
  typ: 'keine_session' | 'endet_bald' | 'ueberfallig';
  nachricht: string;
  dringlichkeit: 'niedrig' | 'mittel' | 'hoch';
  tage?: number;
}

export interface KlientinMitAttention extends KlientinMitBegleitung {
  attention?: AttentionSignal;
}

export interface BegleitungenOverview {
  klientinnen: KlientinMitAttention[];
  needsAttention: KlientinMitAttention[];
  stats: {
    aktiv: number;
    pausiert: number;
    abgeschlossen: number;
    total: number;
  };
}

export interface SessionSummaryRequest {
  rohNotizen: string;
  klientinName: string;
  angebotName: string;
  woche?: number;
}

export interface SessionSummaryResponse {
  zusammenfassung: string;
  naechsteSchritte: string[];
}
