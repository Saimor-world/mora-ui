'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Sparkles,
  User,
} from 'lucide-react';
import type { BegleitungSession, BegleitungStatus, SessionStatus } from './types';
import { fetchBegleitungDetail, generateSessionSummary, type BegleitungDetail } from './begleitungenClient';
import { executeAgenticLoop } from '@/lib/api/cognitionClient';

interface Props {
  begleitungId: string;
  onBack: () => void;
}

const SESSION_STATUS_ICON: Record<SessionStatus, { icon: React.ReactNode; color: string }> = {
  geplant: { icon: <Calendar size={12} />, color: 'text-blue-400' },
  durchgeführt: { icon: <Check size={12} />, color: 'text-emerald-400' },
  abgesagt: { icon: <AlertTriangle size={12} />, color: 'text-red-400' },
};

const STATUS_BADGE: Record<BegleitungStatus, { label: string; className: string }> = {
  aktiv: { label: 'Aktiv', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  pausiert: { label: 'Pausiert', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  abgeschlossen: { label: 'Abgeschlossen', className: 'bg-white/10 text-white/50 border-white/20' },
};

interface SessionCardProps {
  session: BegleitungSession;
  klientinName: string;
  angebotName: string;
  woche?: number;
  onSummaryGenerated: (sessionId: string, zusammenfassung: string, schritte: string[]) => void;
}

function SessionCard({ session, klientinName, angebotName, woche, onSummaryGenerated }: SessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState(session.rohNotizen || '');
  const statusInfo = SESSION_STATUS_ICON[session.status];

  const date = new Date(session.datum);
  const dateStr = date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  const handleGenerateSummary = useCallback(async () => {
    if (!notes.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      const prompt = `Fasse die folgenden Session-Notizen kurz zusammen und schlage 2-3 konkrete nächste Schritte für die Klientin vor.

Klient:in: ${klientinName}
Angebot: ${angebotName}${woche ? `, Woche ${woche}` : ''}

Notizen:
${notes}

Antworte auf Deutsch in warmem, unterstützendem Ton. Strukturiere deine Antwort so:
ZUSAMMENFASSUNG: (2-3 Sätze)
NÄCHSTE SCHRITTE:
1. ...
2. ...
3. ...`;

      const response = await executeAgenticLoop(prompt, {
        level: 'begleitungen',
        entityType: 'session',
        entityId: session.id,
      });

      if (response.final_message) {
        const text = response.final_message;
        const zusammenfassungMatch = text.match(/ZUSAMMENFASSUNG:\s*([\s\S]*?)(?=NÄCHSTE SCHRITTE:|$)/i);
        const schritteMatch = text.match(/NÄCHSTE SCHRITTE:\s*([\s\S]*?)$/i);

        const zusammenfassung = zusammenfassungMatch?.[1]?.trim() || text;
        const schritteText = schritteMatch?.[1]?.trim() || '';
        const schritte = schritteText
          .split(/\n/)
          .map((line) => line.replace(/^\d+\.\s*/, '').trim())
          .filter((line) => line.length > 0);

        onSummaryGenerated(session.id, zusammenfassung, schritte);
      }
    } catch (error) {
      console.error('[Begleitungen] Summary generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [notes, isGenerating, klientinName, angebotName, woche, session.id, onSummaryGenerated]);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ${statusInfo.color}`}>
            {statusInfo.icon}
          </div>
          <div>
            <div className="text-sm font-medium text-white/85">{dateStr}</div>
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <span>{timeStr}</span>
              {session.dauer && <span>· {session.dauer} Min</span>}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-white/30" />
        ) : (
          <ChevronDown size={16} className="text-white/30" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-white/[0.04] px-4 py-3 space-y-3">
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-wide text-white/40">
              Notizen
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notizen zur Session eingeben oder einfügen..."
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/80 placeholder:text-white/25 focus:border-white/20 focus:outline-none"
              rows={4}
            />
          </div>

          {session.zusammenfassung && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                <Sparkles size={10} />
                Zusammenfassung
              </div>
              <p className="text-xs leading-relaxed text-white/70">{session.zusammenfassung}</p>
            </div>
          )}

          {session.naechsteSchritte && session.naechsteSchritte.length > 0 && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
              <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-blue-400">
                Nächste Schritte
              </div>
              <ul className="space-y-1">
                {session.naechsteSchritte.map((schritt, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400/60" />
                    {schritt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!session.zusammenfassung && notes.trim() && (
            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-300 transition hover:bg-purple-500/20 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Môra fasst zusammen...
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  Mit Môra zusammenfassen
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function KlientinDetailView({ begleitungId, onBack }: Props) {
  const [detail, setDetail] = useState<BegleitungDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sessions' | 'dateien' | 'notizen'>('sessions');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchBegleitungDetail(begleitungId);
        if (!data) {
          setError('Begleitung nicht gefunden.');
          return;
        }
        setDetail(data);
      } catch (err) {
        console.error('[Begleitungen] Detail load failed:', err);
        setError('Fehler beim Laden der Daten.');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [begleitungId]);

  const handleSummaryGenerated = useCallback((sessionId: string, zusammenfassung: string, schritte: string[]) => {
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === sessionId ? { ...s, zusammenfassung, naechsteSchritte: schritte } : s
        ),
      };
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={20} className="animate-spin text-white/30" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <AlertTriangle size={24} className="text-amber-100/30" />
        <p className="text-xs text-white/40">{error || 'Daten nicht verfügbar.'}</p>
      </div>
    );
  }

  const { klientin, begleitung, angebot, sessions, dateien } = detail;
  const status = STATUS_BADGE[begleitung.status];

  const progressLabel = begleitung.aktuelleWoche && begleitung.gesamtWochen
    ? `Woche ${begleitung.aktuelleWoche} von ${begleitung.gesamtWochen}`
    : null;

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-white/[0.05] px-5 pb-4 pt-3">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10">
            <User size={24} className="text-white/60" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-medium text-white/90">{klientin.name}</h2>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide ${status.className}`}>
                {status.label}
              </span>
            </div>

            <p className="mt-0.5 text-sm text-white/50">{angebot.name}</p>

            {progressLabel && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400/60"
                    style={{ width: `${((begleitung.aktuelleWoche || 0) / (begleitung.gesamtWochen || 1)) * 100}%` }}
                  />
                </div>
                <span className="shrink-0 text-[10px] text-white/40">{progressLabel}</span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/40">
              {klientin.email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={11} />
                  {klientin.email}
                </span>
              )}
              {klientin.telefon && (
                <span className="flex items-center gap-1.5">
                  <Phone size={11} />
                  {klientin.telefon}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={11} />
                Start: {new Date(begleitung.startDatum).toLocaleDateString('de-DE')}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex shrink-0 gap-1 border-b border-white/[0.04] px-5 py-2">
        {(['sessions', 'dateien', 'notizen'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
              activeTab === tab
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:bg-white/[0.04] hover:text-white/60'
            }`}
          >
            {tab === 'sessions' && <Clock size={12} />}
            {tab === 'dateien' && <FileText size={12} />}
            {tab === 'notizen' && <MessageCircle size={12} />}
            {tab === 'sessions' && `Sessions (${sessions.length})`}
            {tab === 'dateien' && `Dateien (${dateien.length})`}
            {tab === 'notizen' && 'Notizen'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'sessions' && (
          <div className="space-y-2">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-3 text-xs text-white/40 transition hover:border-white/25 hover:text-white/60"
            >
              <Plus size={14} />
              Neue Session planen
            </button>

            {sessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/30">
                Noch keine Sessions dokumentiert.
              </div>
            ) : (
              sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  klientinName={klientin.name}
                  angebotName={angebot.name}
                  woche={begleitung.aktuelleWoche}
                  onSummaryGenerated={handleSummaryGenerated}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'dateien' && (
          <div className="space-y-2">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-3 text-xs text-white/40 transition hover:border-white/25 hover:text-white/60"
            >
              <Plus size={14} />
              Datei hochladen
            </button>

            {dateien.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/30">
                Noch keine Dateien hochgeladen.
              </div>
            ) : (
              dateien.map((datei) => (
                <div
                  key={datei.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <FileText size={14} className="text-white/50" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-white/80">{datei.name}</div>
                    <div className="text-[10px] text-white/35">
                      {datei.groesse ? `${Math.round(datei.groesse / 1024)} KB · ` : ''}
                      {new Date(datei.hochgeladenAm).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'notizen' && (
          <div className="space-y-3">
            {klientin.notizen ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-white/40">
                  Allgemeine Notizen
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-white/70">
                  {klientin.notizen}
                </p>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-white/30">
                Noch keine allgemeinen Notizen hinterlegt.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
