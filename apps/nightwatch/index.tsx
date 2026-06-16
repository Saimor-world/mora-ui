'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ShieldCheck, ArrowRight } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { usePaneStore } from '@/lib/store/paneStore';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { TONES, priorityFromSeverityLabel, toneForPriority } from '@/lib/ui/status';
import {
    fetchNightwatchIncidents,
    fetchNightwatchMonitors,
    type NightwatchMonitorItem,
} from '@/lib/api/nightwatchClient';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';

export default function NightwatchApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, openPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const isActive = usePaneStore((s) => s.activePaneId === paneId);
    const pane = getPane(paneId);

    const [incidents, setIncidents] = useState<NightwatchIncidentItem[]>([]);
    const [monitors, setMonitors] = useState<NightwatchMonitorItem[]>([]);
    const [loading, setLoading] = useState(true);

    const close = useCallback(() => removePane(paneId), [removePane, paneId]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [close]);

    useEffect(() => {
        let cancelled = false;
        Promise.all([fetchNightwatchIncidents(), fetchNightwatchMonitors()])
            .then(([inc, mon]) => { if (!cancelled) { setIncidents(inc); setMonitors(mon); } })
            .catch(() => { if (!cancelled) { setIncidents([]); setMonitors([]); } })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const downHosts = useMemo(
        () => new Set(incidents.map((i) => i.host).filter(Boolean) as string[]),
        [incidents],
    );

    const openIncident = (id: string, title?: string) =>
        openPane({
            id: `document-${id}`,
            type: 'document',
            title: title || 'Vorfall',
            size: { width: 900, height: 700 },
            data: { nodeId: id },
        });

    if (!pane) return null;

    return (
        <GlassPanel
            title="Nightwatch"
            paneId={paneId}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
            onResize={(w, h) => updatePaneSize(paneId, w, h)}
            onClose={close}
            onMinimize={() => minimizePane(paneId)}
            onFocus={() => focusPane(paneId)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
            minWidth={640}
            minHeight={480}
        >
            <div data-testid="nightwatch-app" className="flex h-full flex-col gap-5 overflow-y-auto">
                <header>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/14 bg-cyan-400/[0.07] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-cyan-50/60">
                        <Activity size={12} />
                        Nightwatch
                    </div>
                    <h1 className="text-2xl font-light text-white">MÔRA beobachtet deine Infrastruktur</h1>
                    <p className="mt-1 text-sm text-white/45">Was läuft, was braucht Aufmerksamkeit — nur Lesen.</p>
                </header>

                {/* Monitors */}
                <section>
                    <h2 className="mb-2 text-sm font-medium text-white/82">Überwacht</h2>
                    {monitors.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {monitors.map((m) => {
                                const down = m.host ? downHosts.has(m.host) : false;
                                const tone = down ? TONES.critical : TONES.success;
                                return (
                                    <div key={m.id} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                                        <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                                        <span className="min-w-0 truncate text-xs text-white/78">{m.name || m.host}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-sm text-white/40">
                            {loading ? 'Lade Monitore…' : 'Noch keine Monitore.'}
                        </p>
                    )}
                </section>

                {/* Open incidents */}
                <section>
                    <h2 className="mb-2 text-sm font-medium text-white/82">Offene Vorfälle</h2>
                    {incidents.length > 0 ? (
                        <div className="grid gap-2">
                            {incidents.map((i) => {
                                const tone = TONES[toneForPriority(priorityFromSeverityLabel(i.severity))];
                                const Icon = tone.icon;
                                return (
                                    <article key={i.id} className={`rounded-2xl border ${tone.border} ${tone.bg} p-3`}>
                                        <div className="flex items-start gap-2.5">
                                            <Icon size={15} className={`mt-0.5 shrink-0 ${tone.text}`} />
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-sm font-medium text-white/88">{i.title || `Vorfall: ${i.host || 'Infrastruktur'}`}</h3>
                                                {i.summary && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/52">{i.summary}</p>}
                                                <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/35">
                                                    {i.host && <span>{i.host}</span>}
                                                    {i.detected_at && <span>{new Date(i.detected_at).toLocaleString('de-DE')}</span>}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => openIncident(i.id, i.title)}
                                                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11px] text-white/65 transition-colors hover:bg-white/[0.1]"
                                            >
                                                Vorfall öffnen <ArrowRight size={12} />
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] px-3 py-3 text-sm text-emerald-100/65">
                            <ShieldCheck size={15} className="text-emerald-300/70" />
                            {loading ? 'Lade Vorfälle…' : 'Keine offenen Vorfälle — alles ruhig.'}
                        </div>
                    )}
                </section>
            </div>
        </GlassPanel>
    );
}
