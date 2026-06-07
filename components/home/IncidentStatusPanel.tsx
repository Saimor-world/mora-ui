'use client';

import React, { useState } from 'react';
import { AlertCircle, ShieldCheck, ChevronDown, ChevronUp, Activity, ArrowRight } from 'lucide-react';
import type { ContextualPanel } from '@/lib/panel/panelTypes';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import type { PaneOpenRequest } from '@/lib/store/paneStore';

interface IncidentStatusPanelProps {
    panel: ContextualPanel<NightwatchIncidentItem>;
    onOpenPane?: (request: PaneOpenRequest) => void;
}

export function IncidentStatusPanel({ panel, onOpenPane }: IncidentStatusPanelProps) {
    const [expanded, setExpanded] = useState(false);
    const incident = panel.payload;

    if (panel.state === 'placeholder' || panel.state === 'permission_missing') {
        return null; // Never render placeholders or unauthorized panels
    }

    if (panel.state === 'unknown' || panel.state === 'missing') {
        return (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-white/40">
                Infrastruktur-Zustand momentan nicht belegbar. Keine offenen Meldungen.
            </div>
        );
    }

    const isCritical = incident.severity === 'critical';
    const borderStyle = isCritical 
        ? 'border-red-500/30 bg-red-950/20' 
        : 'border-amber-500/25 bg-amber-950/15';
    
    const iconColor = isCritical ? 'text-red-400' : 'text-amber-400';
    const badgeStyle = isCritical 
        ? 'bg-red-500/20 text-red-300 border-red-500/30' 
        : 'bg-amber-500/15 text-amber-300 border-amber-500/20';

    const handleAskMora = () => {
        if (!onOpenPane) return;
        onOpenPane({
            id: 'chat-main',
            type: 'chat',
            title: 'MORA',
            size: { width: 860, height: 680 },
            data: {
                initialMessage: `MÔRA, erklär mir den Infrastruktur-Vorfall auf Host "${incident.host || 'unbekannt'}". Welche Auswirkungen hat die Meldung "${incident.title || 'unbekannt'}" und was sind die belegten Nachweise?`,
                autoSend: false
            }
        });
    };

    return (
        <article className={`rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all ${borderStyle}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-white/40">
                        <Activity className="w-3 h-3 text-cyan-400/85" />
                        <span>SENSOR: {panel.source.toUpperCase()}</span>
                        <span className="h-1 w-1 rounded-full bg-white/20" />
                        <span>{panel.confidence.toUpperCase()} CONFIDENCE</span>
                    </div>
                    <h3 className="text-sm font-medium text-white/90">
                        {incident.title || `Infrastruktur-Vorfall auf ${incident.host || 'Host'}`}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-white/60">
                        {incident.summary || 'Ein Vorfall wurde im Netzwerk-Gateway registriert.'}
                    </p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${badgeStyle}`}>
                    {incident.severity || 'warning'}
                </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                <button
                    type="button"
                    onClick={handleAskMora}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-1.5 text-xs text-cyan-200/90 transition-colors hover:bg-cyan-400/[0.12]"
                >
                    <span>MORA fragen</span>
                    <ArrowRight className="w-3 h-3" />
                </button>

                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="inline-flex items-center gap-1 text-xs text-white/45 hover:text-white/75 transition-colors"
                >
                    <span>Nachweis</span>
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
            </div>

            {expanded && (
                <div className="mt-3 rounded-lg bg-black/30 p-2.5 text-[11px] font-mono leading-relaxed text-white/50 border border-white/[0.04]">
                    <div className="flex items-center gap-1 text-emerald-400/80 mb-1.5 font-sans font-medium text-[10px] uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Kryptografisch Belegt (CORE)</span>
                    </div>
                    <div className="grid gap-1">
                        <div><span className="text-white/30">Node-ID:</span> {incident.id}</div>
                        <div><span className="text-white/30">Host:</span> {incident.host || 'N/A'}</div>
                        <div><span className="text-white/30">Status:</span> {incident.status || 'open'}</div>
                        <div><span className="text-white/30">Erkannt:</span> {incident.detected_at || 'N/A'}</div>
                        <div><span className="text-white/30">Nachweis:</span> {panel.reason}</div>
                    </div>
                </div>
            )}
        </article>
    );
}
