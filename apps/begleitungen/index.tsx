'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  User,
  Users,
} from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import type { AppProps } from '@/lib/apps/types';
import type { BegleitungenOverview, KlientinMitAttention, BegleitungStatus } from './types';
import {
  fetchBegleitungenOverview,
  computeAttentionSignals,
  filterNeedsAttention,
} from './begleitungenClient';
import { KlientinDetailView } from './KlientinDetailView';

type ViewState = 'list' | 'detail';

const STATUS_BADGE: Record<BegleitungStatus, { label: string; className: string }> = {
  aktiv: { label: 'Aktiv', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  pausiert: { label: 'Pausiert', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  abgeschlossen: { label: 'Abgeschlossen', className: 'bg-white/10 text-white/50 border-white/20' },
};

function formatProgressLabel(k: KlientinMitAttention): string {
  if (k.begleitung.aktuelleWoche && k.begleitung.gesamtWochen) {
    return `${k.angebot.name}, Woche ${k.begleitung.aktuelleWoche} von ${k.begleitung.gesamtWochen}`;
  }
  return k.angebot.name;
}

function formatLastSession(k: KlientinMitAttention): string {
  if (!k.letzteSession?.datum) return 'Noch keine Session';
  const date = new Date(k.letzteSession.datum);
  return `Letzte Session: ${date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}`;
}

interface KlientinCardProps {
  data: KlientinMitAttention;
  onClick: () => void;
}

function KlientinCard({ data, onClick }: KlientinCardProps) {
  const status = STATUS_BADGE[data.begleitung.status];
  const hasAttention = data.attention !== undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.06]"
    >
      {hasAttention && (
        <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
          <User size={18} className="text-white/60" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-white/90">{data.klientin.name}</span>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide ${status.className}`}>
              {status.label}
            </span>
          </div>

          <p className="mt-1 text-xs text-white/50">{formatProgressLabel(data)}</p>

          <div className="mt-2 flex items-center gap-3 text-[10px] text-white/35">
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {formatLastSession(data)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {data.sessionCount} Sessions
            </span>
          </div>

          {hasAttention && data.attention && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-300/80">
              <AlertTriangle size={10} />
              {data.attention.nachricht}
            </div>
          )}
        </div>

        <ChevronRight size={16} className="shrink-0 text-white/20 transition-colors group-hover:text-white/40" />
      </div>
    </button>
  );
}

export default function BegleitungenApp({ paneId }: AppProps) {
  const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
  const pane = getPane(paneId);
  const isActive = usePaneStore((state) => state.activePaneId === paneId);

  const [overview, setOverview] = useState<BegleitungenOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedBegleitungId, setSelectedBegleitungId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<BegleitungStatus | 'alle' | 'attention'>('alle');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await fetchBegleitungenOverview();
      if (!data) {
        setError('Begleitungen konnten nicht geladen werden.');
        return;
      }

      const withAttention = computeAttentionSignals(data.klientinnen);
      const needsAttention = filterNeedsAttention(withAttention);

      setOverview({
        ...data,
        klientinnen: withAttention,
        needsAttention,
      });
    } catch (err) {
      console.error('[Begleitungen] Load failed:', err);
      setError('Ein Fehler ist aufgetreten.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredKlientinnen = useMemo(() => {
    if (!overview) return [];
    if (filterStatus === 'alle') return overview.klientinnen;
    if (filterStatus === 'attention') return overview.needsAttention;
    return overview.klientinnen.filter((k) => k.begleitung.status === filterStatus);
  }, [overview, filterStatus]);

  const handleSelectKlientin = useCallback((begleitungId: string) => {
    setSelectedBegleitungId(begleitungId);
    setViewState('detail');
  }, []);

  const handleBackToList = useCallback(() => {
    setViewState('list');
    setSelectedBegleitungId(null);
  }, []);

  if (!pane) return null;

  return (
    <GlassPanel
      title="Begleitungen"
      paneId={paneId}
      width={pane.size.width}
      height={pane.size.height}
      initialX={pane.position.x}
      initialY={pane.position.y}
      onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
      onResize={(w, h) => updatePaneSize(paneId, w, h)}
      onClose={() => removePane(paneId)}
      onMinimize={() => minimizePane(paneId)}
      onFocus={() => focusPane(paneId)}
      isActive={isActive}
      zIndex={pane.zIndex}
      showCloseButton
      showMinimizeButton
      showBackButton={viewState === 'detail'}
      onBack={handleBackToList}
      draggable
      resizable
    >
      <div className="flex h-full min-h-0 flex-col text-white">
        {viewState === 'list' && (
          <>
            <header className="shrink-0 border-b border-white/[0.05] px-5 pb-4 pt-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-white/40" />
                  <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                    Klient:innen
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {overview && (
                    <span className="text-[10px] text-white/30">
                      {overview.stats.aktiv} aktiv
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void load(true)}
                    disabled={isRefreshing}
                    className="rounded p-1.5 text-white/25 transition hover:bg-white/[0.06] hover:text-white/55 disabled:opacity-40"
                    title="Aktualisieren"
                  >
                    <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              <h2 className="mt-3 text-xl font-medium tracking-tight text-white/90">
                Deine Begleitungen
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                Alle laufenden und abgeschlossenen Zusammenarbeiten im Überblick.
              </p>

              {overview && overview.needsAttention.length > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2">
                  <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                  <span className="text-[11px] text-amber-200/80">
                    {overview.needsAttention.length === 1
                      ? '1 Begleitung braucht Aufmerksamkeit'
                      : `${overview.needsAttention.length} Begleitungen brauchen Aufmerksamkeit`}
                  </span>
                </div>
              )}
            </header>

            <div className="flex shrink-0 gap-1.5 border-b border-white/[0.04] px-5 py-2">
              {(['alle', 'aktiv', 'attention', 'abgeschlossen'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterStatus(f)}
                  className={`rounded-full px-3 py-1 text-[10px] font-medium transition ${
                    filterStatus === f
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:bg-white/[0.04] hover:text-white/60'
                  }`}
                >
                  {f === 'alle' && 'Alle'}
                  {f === 'aktiv' && 'Aktiv'}
                  {f === 'attention' && 'Braucht Aufmerksamkeit'}
                  {f === 'abgeschlossen' && 'Abgeschlossen'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-white/30" />
                </div>
              ) : error ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                  <AlertTriangle size={24} className="text-amber-100/30" />
                  <p className="text-xs text-white/40">{error}</p>
                </div>
              ) : filteredKlientinnen.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                  <Users size={24} className="text-white/20" />
                  <p className="text-xs text-white/40">
                    {filterStatus === 'alle'
                      ? 'Noch keine Begleitungen angelegt.'
                      : 'Keine Begleitungen in dieser Kategorie.'}
                  </p>
                  {filterStatus === 'alle' && (
                    <button
                      type="button"
                      className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/60 transition hover:bg-white/[0.08]"
                    >
                      <Plus size={12} />
                      Erste Begleitung anlegen
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredKlientinnen.map((k) => (
                    <KlientinCard
                      key={k.begleitung.id}
                      data={k}
                      onClick={() => handleSelectKlientin(k.begleitung.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {viewState === 'detail' && selectedBegleitungId && (
          <KlientinDetailView
            begleitungId={selectedBegleitungId}
            onBack={handleBackToList}
          />
        )}
      </div>
    </GlassPanel>
  );
}
