'use client';

import { isUniverseV2Enabled } from '@/lib/universe/morgen';
import React, { useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Link2, List, Loader2, Plus, RefreshCw, Sparkles } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { usePaneStore } from '@/lib/store/paneStore';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { GLASS_SHEET_PRESENTATION } from '@/lib/os/glassSheet';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { CalendarIntegration } from '@/components/integrations/CalendarIntegration';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { CalendarGrid } from './components/CalendarGrid';
import { CalendarEventPanel } from './components/CalendarEventPanel';
import { AppHero, AppEmpty } from '@/components/universe/app/AppStage';
import { Segmented } from '@/components/universe/app/Tiles';

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
  const [uvView, setUvView] = useState<'week' | 'agenda'>('week');
  const uv2 = isUniverseV2Enabled();
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
        {showSetupState && uv2 ? (
          <div className="flex flex-1 items-center justify-center" data-uv2-app="calendar">
            <AppEmpty glyph={<CalendarDays size={22} strokeWidth={1.25} />} title="Dein Tag, an einem Ort."
              text="Verbinde deinen Kalender. Termine erscheinen dann hier und fließen in Heute, LAGE und die Planeten ein."
              action={{ label: 'Kalender verbinden', onClick: openIntegrations }} />
          </div>
        ) : showSetupState ? (
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
            {uv2 && !isLoading ? (
              <div className="uv2-ftool" data-uv2-keep="" data-testid="cal-v2-bar" style={{ margin: '10px 16px 0' }}>
                <button type="button" className="uv2-pill" aria-label="Woche zurück" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }}><ChevronLeft /></button>
                <button type="button" className="uv2-pill" onClick={() => { setCurrentDate(new Date()); setSelectedDate(null); }}>Heute</button>
                <button type="button" className="uv2-pill" aria-label="Woche vor" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }}><ChevronRight /></button>
                <span className="uv2-ftool__crumb" style={{ marginLeft: 8 }}>{currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</span>
                <span style={{ flex: 1 }} />
                <Segmented value={uvView} onChange={(v) => { setUvView(v); setSelectedDate(null); }} label="Ansicht" options={[
                  { id: 'week', label: 'Woche', icon: <CalendarDays /> },
                  { id: 'agenda', label: '14 Tage', icon: <List /> },
                ]} />
                <button type="button" className="uv2-pill" aria-label="Verbindungen" title="Verbindungen" onClick={openIntegrations}><Link2 /></button>
                <button type="button" className="uv2-pill" aria-label="Kalender aktualisieren" title={available === true ? 'Aktuell' : 'Aktualisieren'} onClick={() => void refresh()} disabled={isRefreshing}>
                  <span className="uv2-dot" data-on={available === true ? '' : undefined} data-warn={available === false ? '' : undefined} /><RefreshCw className={isRefreshing ? 'animate-spin' : ''} />
                </button>
                <button type="button" className="uv2-pill uv2-pill--gold" data-testid="cal-v2-add" onClick={() => setSelectedDate(new Date())}><Plus />Termin</button>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-2.5" data-uv2-cal-status hidden={uv2 || undefined} style={uv2 ? { display: 'none' } : undefined}>
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
              uv2 ? (
                <div className="flex min-h-0 flex-1 gap-8 overflow-hidden px-8 py-6" data-testid="uv2-calendar">
                  <div className={uvView === 'week' && !selectedDate ? "w-[250px] shrink-0" : "w-[320px] shrink-0"}>
                    <CalendarGrid
                      currentDate={currentDate}
                      selectedDate={selectedDate}
                      events={events}
                      onNavigate={setCurrentDate}
                      onSelectDate={setSelectedDate}
                    />
                  </div>
                  <div className="min-w-0 flex-1 overflow-y-auto border-l border-white/[0.07] pl-6">
                    {selectedDate ? (
                      <>
                        <button type="button" onClick={() => setSelectedDate(null)} className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45 transition-colors hover:text-[#D6A848]">← Nächste Termine</button>
                        <CalendarEventPanel selectedDate={selectedDate} events={events} onAddEvent={(title) => { void addEvent(title, selectedDate.toISOString().split('T')[0]).catch(() => undefined); }} />
                      </>
                    ) : uvView === 'week' ? (
                      <WeekBoard anchor={currentDate} events={events} onSelect={setSelectedDate} />
                    ) : (
                      <UpcomingAgenda events={events} onSelect={setSelectedDate} />
                    )}
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
                    onAddEvent={(title) => {
                      void addEvent(title, selectedDate.toISOString().split('T')[0]).catch(() => undefined);
                    }}
                  />
                )}
              </>
              )
            )}
          </>
        )}

        <div className="flex items-center gap-2 border-t border-white/5 px-4 pb-3 pt-2 text-[10px] text-white/20" hidden={uv2 || undefined} style={uv2 ? { display: 'none' } : undefined}>
          <Sparkles size={10} className="text-emerald-300/35" />
          <span>{summary.calendarConfigured ? 'Termine verbinden sich automatisch mit Heute und Arbeit.' : 'Verbinde deinen Kalender, damit Termine in Saimôr Teil deines Tages werden.'}</span>
        </div>
      </div>
    </GlassPanel>
  );
}

/** v2: Wochenbrett – sieben Tagessäulen, Termine als Kacheln. */
function WeekBoard({ anchor, events, onSelect }: { anchor: Date; events: { id: string; title: string; date: string; time?: string; duration?: number }[]; onSelect: (d: Date) => void }) {
  const monday = new Date(anchor); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const todayKey = new Date().toDateString();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return d; });
  return (
    <div className="uv2-week" data-testid="cal-v2-week">
      {days.map((d) => {
        const list = events.filter((e) => new Date(e.date).toDateString() === d.toDateString()).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
        return (
          <button type="button" key={d.toISOString()} className="uv2-week__day" data-today={d.toDateString() === todayKey ? '' : undefined} onClick={() => onSelect(d)}>
            <span className="uv2-week__head"><span>{d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '')}</span><b>{d.getDate()}</b></span>
            {list.map((e) => (
              <span key={e.id} className="uv2-week__ev" title={e.title} lang="de"><i>{e.time ?? '—'}</i><span className="uv2-week__t">{e.title}</span></span>
            ))}
          </button>
        );
      })}
    </div>
  );
}

/** v2: Agenda der nächsten 14 Tage – nach Tag gruppiert, ruhig, echte Termine. */
function UpcomingAgenda({ events, onSelect }: { events: { id: string; title: string; date: string; time?: string; duration?: number }[]; onSelect: (d: Date) => void }) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 14);
  const upcoming = events
    .filter((e) => { const d = new Date(e.date); return d >= start && d < end; })
    .sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')));
  const groups = new Map<string, typeof upcoming>();
  upcoming.forEach((e) => { const k = new Date(e.date).toDateString(); groups.set(k, [...(groups.get(k) ?? []), e]); });
  const label = (d: Date) => {
    const diff = Math.round((d.getTime() - start.getTime()) / 86400000);
    return diff === 0 ? 'Heute' : diff === 1 ? 'Morgen' : d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  if (upcoming.length === 0) {
    return (
      <AppEmpty compact glyph={<CalendarDays size={18} strokeWidth={1.25} />} title="Zwei freie Wochen."
        text="Raum für das, was zählt. Wähle links einen Tag, um etwas einzuplanen."
        action={{ label: 'Heute etwas einplanen', onClick: () => onSelect(new Date()) }} />
    );
  }
  return (
    <div className="space-y-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D6A848]">Nächste 14 Tage · {upcoming.length} Termine</p>
      {[...groups.entries()].map(([k, list]) => (
        <section key={k}>
          <button type="button" onClick={() => onSelect(new Date(k))} className="mb-2 text-xs text-white/55 transition-colors hover:text-[#F7F4E9]">{label(new Date(k))}</button>
          <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {list.map((e) => (
              <li key={e.id} className="flex items-baseline gap-4 py-2.5">
                <span className="w-12 shrink-0 font-mono text-[11px] tabular-nums text-white/55">{e.time ?? 'ganztags'}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-[#F7F4E9]/90">{e.title}</span>
                {e.duration ? <span className="shrink-0 font-mono text-[10px] text-white/40">{e.duration} min</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** v2-Hero: der heutige Tag als große Ziffer, ein Satz aus echten Terminen, eine Handlung. */
function CalendarHero({ events, onAdd }: { events: { id: string; title: string; date: string; time?: string }[]; onAdd: () => void }) {
  const now = new Date();
  const todayKey = now.toDateString();
  const today = events.filter((e) => new Date(e.date).toDateString() === todayKey)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  const hhmm = now.toTimeString().slice(0, 5);
  const next = today.find((e) => !e.time || e.time >= hhmm);
  const title = today.length === 0 ? 'Heute ist frei.'
    : today.length === 1 ? 'Heute ein Termin.' : `Heute ${today.length} Termine.`;
  const sub = next ? `Als Nächstes: ${next.title}${next.time ? ' um ' + next.time : ''}.`
    : today.length > 0 ? 'Alle Termine für heute liegen hinter dir.' : 'Kein Termin bis heute Abend.';
  return (
    <AppHero app="calendar"
      eyebrow={now.toLocaleDateString('de-DE', { weekday: 'long' }) + ' · ' + now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
      title={title} sub={sub}
      figure={now.getDate()} figureLabel={now.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '')}
      action={{ label: 'Termin anlegen', onClick: onAdd }} />
  );
}
