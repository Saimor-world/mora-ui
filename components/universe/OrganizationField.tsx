"use client";

import React, { useMemo } from 'react';
import { ArrowUpRight, Building2, FileText, Radio, Sparkles, X } from 'lucide-react';
import type { FabricSignal } from '@/components/canvas/SpatialMindfield';

export type UniverseLens = 'organization' | 'relations';

export interface OrganizationTerritory {
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
    x: number;
    y: number;
    spaces: number;
    folders: number;
    documents: number;
    metricSource: 'live' | 'derived' | 'missing';
}

interface Props {
    lens: UniverseLens;
    territories: OrganizationTerritory[];
    signals: FabricSignal[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onOpen: (id: string) => void;
    onAskMora: (territory: OrganizationTerritory) => void;
}

export function OrganizationField({ lens, territories, signals, selectedId, onSelect, onOpen, onAskMora }: Props) {
    const selected = useMemo(() => territories.find((item) => item.id === selectedId) ?? null, [selectedId, territories]);
    const selectedSignals = useMemo(() => selected ? signals.filter((signal) => signal.targetId === selected.id) : [], [selected, signals]);

    return (
        <section className="absolute inset-0 z-[18] overflow-hidden" aria-label={lens === 'organization' ? 'Organisation' : 'Zusammenhänge'}>
            <div className="pointer-events-none absolute inset-x-[12%] bottom-[12%] top-[16%] rounded-[48%] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.075),transparent_66%)]" />
            <header className="pointer-events-none absolute left-8 top-24 z-20 max-w-[390px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100/52">{lens === 'organization' ? 'Organisationsfeld' : 'Beziehungsfeld'}</p>
                <h1 className="mt-3 text-2xl font-medium tracking-[-0.03em] text-white/92">{lens === 'organization' ? 'Woraus Saimôr HQ besteht' : 'Was nachweislich zusammenhängt'}</h1>
                <p className="mt-2 text-sm leading-relaxed text-sky-50/48">
                    {lens === 'organization' ? 'Abteilungen, Umfang und aktuelle Aufmerksamkeit – ohne erfundene Gesundheit.' : 'Nur gespeicherte Struktur und zugeordnete Signale. Keine berechnete Schein-Semantik.'}
                </p>
            </header>

            {territories.map((territory) => {
                const isSelected = territory.id === selectedId;
                const isDimmed = Boolean(selectedId && !isSelected);
                const territorySignals = signals.filter((signal) => signal.targetId === territory.id);
                const accent = territory.color || '#67e8f9';
                const classes = [
                    'group absolute w-[238px] -translate-x-1/2 -translate-y-1/2 rounded-[30px] border p-5 text-left transition-all duration-500',
                    isSelected ? 'z-20 scale-[1.04] border-white/24 bg-slate-950/72 shadow-[0_26px_90px_rgba(0,0,0,0.48)]' : 'z-10 border-white/[0.08] bg-slate-950/34 hover:-translate-y-[53%] hover:border-white/18 hover:bg-slate-950/54',
                    isDimmed ? 'opacity-25 saturate-50' : 'opacity-100',
                ].join(' ');

                return (
                    <button key={territory.id} type="button" onClick={() => onSelect(isSelected ? null : territory.id)} className={classes} style={{ left: String(territory.x) + '%', top: String(territory.y) + '%' }} aria-pressed={isSelected}>
                        <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border" style={{ color: accent, borderColor: accent + '40', background: accent + '12' }}><Building2 size={20} /></span>
                        <span className="block text-[18px] font-medium tracking-[-0.02em] text-white/92">{territory.name}</span>
                        {territory.description && <span className="mt-1.5 line-clamp-2 block text-xs leading-relaxed text-white/42">{territory.description}</span>}
                        <span className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.08] pt-4 text-[10px] text-white/48">
                            <span>{territory.spaces} Bereiche</span><span>{territory.documents} Dokumente</span>
                            {territorySignals.length > 0 && <span className="text-amber-200/78">{territorySignals.length} Signale</span>}
                        </span>
                        <span className="mt-3 block text-[9px] uppercase tracking-[0.16em] text-white/26">{territory.metricSource === 'live' ? 'Live gemessen' : territory.metricSource === 'derived' ? 'Aus Struktur abgeleitet' : 'Quelle fehlt'}</span>
                    </button>
                );
            })}

            {lens === 'relations' && signals.map((signal, index) => {
                const target = territories.find((territory) => territory.id === signal.targetId);
                if (!target) return null;
                const x = target.x + ((index % 3) - 1) * 8;
                const y = target.y + 15 + (index % 2) * 6;
                return (
                    <button key={signal.kind + '-' + signal.id} type="button" onClick={() => onSelect(target.id)} className={'absolute z-[16] flex max-w-[210px] -translate-x-1/2 items-center gap-2 rounded-full border border-amber-200/18 bg-slate-950/72 px-3 py-2 text-left shadow-lg backdrop-blur-xl transition hover:border-amber-200/38 ' + (selectedId && selectedId !== target.id ? 'opacity-15' : 'opacity-100')} style={{ left: String(x) + '%', top: String(y) + '%' }}>
                        <Radio size={12} className="shrink-0 text-amber-200/78" /><span className="truncate text-[10px] text-white/68">{signal.title}</span>
                    </button>
                );
            })}

            {selected && (
                <aside className="absolute bottom-24 right-8 z-30 w-[360px] rounded-[30px] border border-white/12 bg-[#07131f]/92 p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
                    <button type="button" onClick={() => onSelect(null)} className="absolute right-4 top-4 rounded-full p-2 text-white/38 hover:bg-white/10 hover:text-white" aria-label="Auswahl schließen"><X size={16} /></button>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-cyan-100/48">Abteilung</div>
                    <h2 className="mt-3 text-xl font-medium text-white/94">{selected.name}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/46">{selected.description || 'Noch keine Beschreibung hinterlegt.'}</p>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                        <TruthValue icon={<Building2 size={13} />} value={selected.spaces} label="Bereiche" />
                        <TruthValue icon={<FileText size={13} />} value={selected.documents} label="Dokumente" />
                        <TruthValue icon={<Radio size={13} />} value={selectedSignals.length} label="Signale" />
                    </div>
                    {lens === 'relations' && selectedSignals.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-white/12 px-4 py-3 text-xs leading-relaxed text-white/38">Für diese Abteilung sind noch keine belegten Signale oder Beziehungen vorhanden.</div>}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button type="button" onClick={() => onOpen(selected.id)} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-100">Arbeitsraum <ArrowUpRight size={14} /></button>
                        <button type="button" onClick={() => onAskMora(selected)} className="inline-flex items-center gap-2 rounded-full border border-cyan-100/16 px-4 py-2.5 text-xs font-semibold text-cyan-100/72 hover:border-cyan-100/34 hover:text-cyan-50"><Sparkles size={13} /> Mit Môra klären</button>
                    </div>
                </aside>
            )}
        </section>
    );
}

function TruthValue({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
    return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-3"><span className="text-cyan-100/46">{icon}</span><span className="mt-2 block text-lg font-medium text-white/88">{value}</span><span className="block text-[9px] uppercase tracking-[0.14em] text-white/28">{label}</span></div>;
}