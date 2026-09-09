'use client';

import React, { useState } from 'react';
import { AlertTriangle, CalendarDays, Link2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { usePaneStore } from '@/lib/store/paneStore';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { GLASS_SHEET_PRESENTATION } from '@/lib/os/glassSheet';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { CalendarIntegration } from '@/components/integrations/CalendarIntegration';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { CalendarGrid } from './components/CalendarGrid';
import { CalendarEventPanel } from './components/CalendarEventPanel';

export default function CalendarApp({ paneId }: AppProps) {
  const {
    events,
    addEvent,
    isLoading,
    isRefreshing,
    available,
    error,
    refresh,
  } = useCalendarEvents();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { openPane, removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
  const isActive = usePaneStore((state) => state.activePaneId === paneId);
  const pane = getPane(paneId);
  const { summary } = useCommunicationSurface();
  const showSetupState = !summary.calendarConfigured;

  const openIntegrations = () => {
    openPane({
      id: 'integrations-main',
      type: 'integrations',
      title: 'Verbindungen',
      size: { width: 980, height: 740 },
      position: { x: 180, y: 110 },
    });
  };

  if (!pane) return null;

  return (
    <GlassPanel
      title="Kalender"
      paneId={paneId}
      width={pane.size.width}
      height={pane.size.height}
      initialX={pane.position.x}
      initialY={pane.position.y}
      padding={0}
      onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
      onResize={(width, height) => updatePaneSize(paneId, width, height)}
      onClose={() => removePane(paneId)}
      onMinimize={() => minimizePane(paneId)}
      onFocus={() => focusPane(paneId)}
      isActive={isActive}
      zIndex={pane.zIndex}
      showCloseButton
      showMinimizeButton
      draggable
      resizable
      {...GLASS_SHEET_PRESENTATION}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {showSetupState ? (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/10 bg-emerald-500/[0.07] text-emerald-200/70">
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.22em] text-white/28">Kalender</div>
                      <h2 className="mt-1 text-xl font-medium tracking-[-0.03em] text-white/86">Deinen Kalender verbinden</h2>
                      <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-white/45">
                        Sobald die Verbindung steht, erscheinen Termine hier und fließen automatisch in Heute und Arbeit ein.
                      </p>
                      {summary.calendarStatusDetail && (
                        <p className="mt-3 text-[10px] leading-relaxed text-white/28">{summary.calendarStatusDetail}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openIntegrations}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white/90"
                  >
                    <Link2 size={14} /> Verbindungen
                  </button>
                </div>
              </div>

              {summary.ownerManageable && summary.calendarOauthEnabled ? (
                <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5">
                  <CalendarIntegration />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${available === true ? 'bg-emerald-300/70' : available === false ? 'bg-amber-300/70' : 'bg-white/20'}`} />
                <span className="truncate text-[9px] uppercase tracking-[0.18em] text-white/28">
                  {available === true ? 'Aktuell' : available === false ? 'Aktueller Stand nicht erreichbar' : 'Wird geladen'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openIntegrations}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-[9px] text-white/28 transition hover:text-white/58"
                >
                  <Link2 size={10} /> Verbindungen
                </button>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={isRefreshing}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-1.5 text-white/30 transition hover:text-white/60 disabled:opacity-40"
                  aria-label="Kalender aktualisieren"
                >
                  <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {(error || (available === false && events.length > 0)) && (
              <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] px-3 py-2.5 text-[10px] leading-relaxed text-amber-100/55">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>{error || 'Der letzte bestätigte Kalenderstand bleibt sichtbar.'}</span>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 size={20} className="animate-spin text-white/28" />
              </div>
            ) : available === false && events.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                <AlertTriangle size={24} className="text-amber-100/30" />
                <p className="text-[12px] text-white/40">Der Kalender ist gerade nicht erreichbar.</p>
                <p className="max-w-[320px] text-[10px] leading-relaxed text-white/22">
                  Saimôr zeigt keinen leeren Kalender an, solange der aktuelle Stand nicht sicher gelesen werden kann.
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-hidden p-4">
                  <CalendarGrid
                    currentDate={currentDate}
                    selectedDate={selectedDate}
                    events={events}
                    onNavigate={setCurrentDate}
                    onSelectDate={setSelectedDate}
                  />
                </div>

                {selectedDate && (
                  <CalendarEventPanel
                    selectedDate={selectedDate}
                    events={events}
                    onAddEvent={(title) => {
                      void addEvent(title, selectedDate.toISOString().split('T')[0]).catch(() => undefined);
                    }}
                  />
                )}
              </>
            )}
          </>
        )}

        <div className="flex items-center gap-2 border-t border-white/5 px-4 pb-3 pt-2 text-[10px] text-white/20">
          <Sparkles size={10} className="text-emerald-300/35" />
          <span>{summary.calendarConfigured ? 'Termine verbinden sich automatisch mit Heute und Arbeit.' : 'Verbinde deinen Kalender, damit Termine in Saimôr Teil deines Tages werden.'}</span>
        </div>
      </div>
    </GlassPanel>
  );
}
