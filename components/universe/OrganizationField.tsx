"use client";

import React, { useMemo, type CSSProperties } from 'react';
import { ArrowUpRight, Building2, FileText, Lock, Radio, Sparkles, X } from 'lucide-react';
import type { UniverseSignal } from '@/lib/universe/types';

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
    access: 'open' | 'locked';
}

interface Props {
    lens: UniverseLens;
    organizationName: string;
    territories: OrganizationTerritory[];
    signals: UniverseSignal[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onOpen: (id: string) => void;
    onAskMora: (territory: OrganizationTerritory) => void;
}

const metricLabel: Record<OrganizationTerritory['metricSource'], string> = {
    live: 'live erfasst',
    derived: 'aus Struktur',
    missing: 'noch ohne Quelle',
};

function territorySize(territory: OrganizationTerritory) {
    const substance = territory.spaces * 5 + territory.folders * 2 + territory.documents;
    return Math.max(132, Math.min(184, 132 + Math.log2(substance + 1) * 8));
}

export function OrganizationField({
    lens,
    organizationName,
    territories,
    signals,
    selectedId,
    onSelect,
    onOpen,
    onAskMora,
}: Props) {
    const selected = useMemo(
        () => territories.find((item) => item.id === selectedId) ?? null,
        [selectedId, territories],
    );
    const selectedSignals = useMemo(
        () => selected ? signals.filter((signal) => signal.targetId === selected.id) : [],
        [selected, signals],
    );

    return (
        <section
            className="absolute inset-0 z-[18] overflow-hidden"
            aria-label={lens === 'organization' ? 'Organisation' : 'Zusammenhänge'}
        >
            <header className="pointer-events-none absolute left-1/2 top-[118px] z-30 w-[min(620px,calc(100%-2rem))] -translate-x-1/2 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-cyan-100/48">
                    {lens === 'organization' ? 'Organisationsfeld' : 'Beziehungsfeld'}
                </p>
                <h1 className="mt-3 text-[clamp(1.45rem,2.2vw,2.25rem)] font-light tracking-[-0.035em] text-white/92">
                    {lens === 'organization'
                        ? 'Woraus ' + organizationName + ' besteht'
                        : 'Was nachweislich zusammenhängt'}
                </h1>
                <p className="mt-2 max-w-[38ch] text-xs leading-relaxed text-sky-50/46 md:text-sm">
                    {lens === 'organization'
                        ? 'Echte Bereiche, ihr Umfang und ihre Quellen. Größe zeigt Substanz – niemals erfundene Gesundheit.'
                        : 'Eingehende Signale landen bei dem Bereich, dem sie wirklich zugeordnet werden können.'}
                </p>
            </header>

            <div className="absolute bottom-24 left-[285px] right-[285px] top-[210px] hidden xl:block">
                {territories.map((territory) => (
                    <Territory
                        key={territory.id}
                        territory={territory}
                        signals={signals.filter((signal) => signal.targetId === territory.id)}
                        lens={lens}
                        selected={territory.id === selectedId}
                        dimmed={Boolean(selectedId && territory.id !== selectedId)}
                        onSelect={onSelect}
                    />
                ))}
            </div>

            <div className="absolute inset-x-0 bottom-24 top-[220px] z-20 overflow-y-auto px-5 pb-8 xl:hidden">
                <div className="grid grid-cols-2 gap-x-4 gap-y-9">
                    {territories.map((territory) => (
                        <MobileTerritory
                            key={territory.id}
                            territory={territory}
                            signals={signals.filter((signal) => signal.targetId === territory.id)}
                            selected={territory.id === selectedId}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            </div>

            {selected && (
                <aside className="absolute inset-x-4 bottom-20 z-50 rounded-[28px] border border-white/12 bg-[#07131f]/94 p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,0.58)] backdrop-blur-2xl xl:inset-x-auto xl:bottom-24 xl:right-8 xl:w-[370px] xl:p-6">
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="absolute right-4 top-4 rounded-full p-2 text-white/38 transition hover:bg-white/10 hover:text-white"
                        aria-label="Auswahl schließen"
                    >
                        <X size={16} />
                    </button>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-cyan-100/48">
                        {selected.metricSource === 'missing' ? 'Datenquelle fehlt' : metricLabel[selected.metricSource]}
                    </div>
                    <h2 className="mt-3 pr-8 text-xl font-medium text-white/94">{selected.name}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/48">
                        {selected.description || 'Noch keine Beschreibung hinterlegt.'}
                    </p>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                        <TruthValue icon={<Building2 size={13} />} value={selected.spaces} label="Bereiche" />
                        <TruthValue icon={<FileText size={13} />} value={selected.documents} label="Dokumente" />
                        <TruthValue icon={<Radio size={13} />} value={selectedSignals.length} label="Signale" />
                    </div>
                    {lens === 'relations' && (
                        <div className="mt-5 space-y-2">
                            {selectedSignals.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/12 px-4 py-3 text-xs leading-relaxed text-white/38">
                                    Keine belegte Beziehung. Saimôr zeichnet hier bewusst keine Verbindung.
                                </div>
                            ) : selectedSignals.slice(0, 3).map((signal) => (
                                <div key={signal.kind + '-' + signal.id} className="flex items-start gap-3 border-t border-white/[0.07] pt-3">
                                    <Radio size={12} className="mt-0.5 shrink-0 text-amber-200/72" />
                                    <div className="min-w-0">
                                        <div className="truncate text-xs text-white/74">{signal.title}</div>
                                        <div className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-white/28">{signal.subtitle}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            disabled={selected.access === 'locked'}
                            onClick={() => onOpen(selected.id)}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/38"
                        >
                            {selected.access === 'locked'
                                ? <>Mitgliedschaft erforderlich <Lock size={13} /></>
                                : <>Arbeitsraum <ArrowUpRight size={14} /></>}
                        </button>
                        <button
                            type="button"
                            onClick={() => onAskMora(selected)}
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-100/16 px-4 py-2.5 text-xs font-semibold text-cyan-100/72 transition hover:border-cyan-100/34 hover:text-cyan-50"
                        >
                            <Sparkles size={13} /> Mit Môra klären
                        </button>
                    </div>
                </aside>
            )}
        </section>
    );
}

function Territory({
    territory,
    signals,
    lens,
    selected,
    dimmed,
    onSelect,
}: {
    territory: OrganizationTerritory;
    signals: UniverseSignal[];
    lens: UniverseLens;
    selected: boolean;
    dimmed: boolean;
    onSelect: (id: string | null) => void;
}) {
    const accent = territory.color || '#67e8f9';
    const size = territorySize(territory);
    const style = {
        left: territory.x + '%',
        top: territory.y + '%',
        '--territory-accent': accent,
        '--territory-size': size + 'px',
    } as CSSProperties;

    return (
        <button
            type="button"
            onClick={() => onSelect(selected ? null : territory.id)}
            className={'group absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-700 focus:outline-none ' +
                (selected ? 'z-30 scale-110' : 'hover:z-20 hover:scale-105') +
                (dimmed ? ' opacity-20 saturate-50' : ' opacity-100')}
            style={style}
            aria-pressed={selected}
            aria-label={territory.name + ' auswählen'}
            data-testid={territory.access === 'locked' ? 'locked-territory-' + territory.id : 'territory-' + territory.id}
        >
            <span
                className="relative mx-auto flex items-center justify-center overflow-hidden border border-white/12 transition-all duration-700"
                style={{
                    width: 'var(--territory-size)',
                    height: 'var(--territory-size)',
                    color: accent,
                    background:
                        'radial-gradient(circle at 38% 32%, ' + accent + '2e, transparent 36%), radial-gradient(circle at 65% 72%, ' + accent + '18, transparent 45%), rgba(3,13,24,0.72)',
                    borderRadius: '42% 58% 48% 52% / 52% 43% 57% 48%',
                    boxShadow:
                        '0 24px 60px rgba(0,0,0,0.32), 0 0 0 1px ' + accent + '18, 0 0 72px ' + accent + (selected ? '48' : '28') + ', inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -28px 48px rgba(0,0,0,0.24)',
                }}
            >
                <span className="absolute inset-[9%] rounded-[inherit] border border-white/[0.055]" />
                <span className="absolute left-[16%] right-[16%] top-[28%] h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
                <span className="absolute inset-[20%] rounded-full bg-black/10 blur-sm" />
                {territory.access === 'locked' ? <Lock size={Math.round(size * 0.2)} strokeWidth={1.15} className="relative opacity-72" /> : <Building2 size={Math.round(size * 0.22)} strokeWidth={1.15} className="relative opacity-90" />}
                {lens === 'relations' && signals.slice(0, 3).map((signal, index) => (
                    <span
                        key={signal.kind + '-' + signal.id}
                        className="absolute flex h-6 w-6 items-center justify-center rounded-full border border-amber-100/24 bg-[#10131a]/90 text-amber-200 shadow-[0_0_22px_rgba(251,191,36,0.28)]"
                        style={{
                            left: 50 + Math.cos(index * 2.4 - 0.8) * 48 + '%',
                            top: 50 + Math.sin(index * 2.4 - 0.8) * 48 + '%',
                        }}
                        title={signal.title}
                    >
                        <Radio size={10} />
                    </span>
                ))}
            </span>
            <span className="mt-3 block text-sm font-medium tracking-[-0.01em] text-white/88">{territory.name}</span>
            <span className="mt-1 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.14em] text-white/34">
                <span>{territory.spaces} Bereiche</span>
                <span className="h-0.5 w-0.5 rounded-full bg-white/30" />
                <span>{territory.documents} Docs</span>
            </span>
            {territory.access === 'locked' ? (
                <span className="mt-1.5 block text-[9px] text-amber-200/62">Mitgliedschaft erforderlich</span>
            ) : territory.metricSource === 'missing' && (
                <span className="mt-1.5 block text-[9px] text-amber-200/52">Quelle fehlt</span>
            )}
        </button>
    );
}

function MobileTerritory({
    territory,
    signals,
    selected,
    onSelect,
}: {
    territory: OrganizationTerritory;
    signals: UniverseSignal[];
    selected: boolean;
    onSelect: (id: string | null) => void;
}) {
    const accent = territory.color || '#67e8f9';
    return (
        <button
            type="button"
            onClick={() => onSelect(selected ? null : territory.id)}
            className={'flex min-w-0 flex-col items-center rounded-[28px] px-2 py-4 text-center transition ' +
                (selected ? 'bg-white/[0.08]' : 'bg-transparent')}
        >
            <span
                className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/10"
                style={{
                    color: accent,
                    background: 'radial-gradient(circle at 38% 30%, ' + accent + '30, transparent 38%), rgba(3,13,24,0.75)',
                    boxShadow: '0 0 36px ' + accent + '22',
                }}
            >
                {territory.access === 'locked' ? <Lock size={22} strokeWidth={1.2} /> : <Building2 size={23} strokeWidth={1.2} />}
                {signals.length > 0 && (
                    <span className="absolute -right-1 top-2 flex h-6 min-w-6 items-center justify-center rounded-full border border-amber-100/25 bg-slate-950 px-1.5 text-[9px] text-amber-200">
                        {signals.length}
                    </span>
                )}
            </span>
            <span className="mt-3 max-w-full truncate text-sm font-medium text-white/84">{territory.name}</span>
            <span className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/30">
                {territory.spaces} Bereiche · {territory.documents} Docs
            </span>
        </button>
    );
}

function TruthValue({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
    return (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-3">
            <span className="text-cyan-100/46">{icon}</span>
            <span className="mt-2 block text-lg font-medium text-white/88">{value}</span>
            <span className="block text-[9px] uppercase tracking-[0.14em] text-white/28">{label}</span>
        </div>
    );
}