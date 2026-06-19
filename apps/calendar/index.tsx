'use client';

import React, { useState } from 'react';
import { CalendarDays, Sparkles, Wrench } from 'lucide-react';
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
  const { events, addEvent } = useCalendarEvents();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { openPane, removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
  const isActive = usePaneStore((state) => state.activePaneId === paneId);
  const pane = getPane(paneId);
  const { summary, overview } = useCommunicationSurface();
  const calendarMissingEnv = Array.isArray(overview?.setup?.calendar?.missing_env) ? overview.setup.calendar.missing_env : [];
  const showSetupState = !summary.calendarConfigured;

  const openIntegrations = () => {
    openPane({
      id: 'integrations-main',
      type: 'integrations',
      title: 'Integrationen',
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
      onResize={(w, h) => updatePaneSize(paneId, w, h)}
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
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300">
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">Kalenderstatus</div>
                    <h2 className="mt-1 text-lg font-medium text-white">{summary.calendarStatusLabel}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
                      {summary.calendarStatusDetail}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openIntegrations}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/75 transition-colors hover:bg-white/[0.08]"
                >
                  <Wrench size={14} />
                  Integrationen
                </button>
              </div>

              {calendarMissingEnv.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {calendarMissingEnv.map((field) => (
                    <span
                      key={field}
                      className="rounded-full border border-amber-400/15 bg-amber-500/[0.10] px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-amber-100/80"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {summary.ownerManageable && summary.calendarOauthEnabled ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <CalendarIntegration />
              </div>
            ) : null}
          </div>
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
              onAddEvent={(title) => addEvent(title, selectedDate.toISOString().split('T')[0])}
            />
          )}
        </>
      )}

      <div className="flex items-center gap-2 border-t border-white/5 px-4 pb-3 pt-2 text-[10px] text-white/20">
        <Sparkles size={10} className="text-amber-500/40" />
        <span>{summary.calendarConfigured ? 'Termine werden als Einträge im Mycelium gespeichert' : 'Kalender bleibt im OS, bis die echte Verbindung aktiv ist.'}</span>
      </div>
    </div>
    </GlassPanel>
  );
}
