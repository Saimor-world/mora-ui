"use client";

import React from 'react';
import { Activity, CalendarDays, Mail, Rss, ShieldCheck, Sparkles } from 'lucide-react';
import type { CalendarPreviewItem, FeedPreviewItem, MailPreviewItem } from '@/lib/hooks/useCommunicationLiveData';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';

interface Props {
    mail: MailPreviewItem[];
    calendar: CalendarPreviewItem[];
    feed: FeedPreviewItem[];
    incidents: NightwatchIncidentItem[];
    territoryCount: number;
    documentCount: number;
    selected: boolean;
    onOpenMail: () => void;
    onOpenCalendar: () => void;
    onOpenFeed: () => void;
    onOpenNightwatch: () => void;
}

function Instrument({ eyebrow, title, children, accent = 'cyan' }: {
    eyebrow: string;
    title: string;
    children: React.ReactNode;
    accent?: 'cyan' | 'amber';
}) {
    return (
        <section className="relative overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#071522]/68 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
            <div className={'absolute inset-y-5 left-0 w-px ' + (accent === 'amber' ? 'bg-amber-300/55' : 'bg-cyan-300/50')} />
            <p className="text-[8px] font-semibold uppercase tracking-[0.25em] text-white/30">{eyebrow}</p>
            <h2 className="mt-1 text-sm font-medium tracking-[-0.01em] text-white/82">{title}</h2>
            <div className="mt-3">{children}</div>
        </section>
    );
}

function SignalRow({ icon, label, value, onClick }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    onClick: () => void;
}) {
    return (
        <button type="button" onClick={onClick} className="group flex w-full items-start gap-3 border-t border-white/[0.055] py-2.5 text-left first:border-0 first:pt-0">
            <span className="mt-0.5 text-cyan-100/42 transition group-hover:text-cyan-100/80">{icon}</span>
            <span className="min-w-0">
                <span className="block text-[8px] uppercase tracking-[0.17em] text-white/27">{label}</span>
                <span className="mt-0.5 block truncate text-[11px] leading-relaxed text-white/62 transition group-hover:text-white/88">{value}</span>
            </span>
        </button>
    );
}

export function UniverseObservatory(props: Props) {
    const openIncidents = props.incidents.filter((item) => !['resolved', 'closed', 'dismissed'].includes(String(item.status || 'open').toLowerCase()));
    return (
        <div className={'pointer-events-none absolute inset-0 z-[32] hidden transition-opacity duration-500 xl:block ' + (props.selected ? 'opacity-20' : 'opacity-100')}>
            <div className="pointer-events-auto absolute bottom-28 left-7 w-[255px] space-y-3">
                <Instrument eyebrow="Dein Horizont" title="Was gerade hereinragt">
                    <SignalRow icon={<CalendarDays size={13} />} label="Kalender" value={props.calendar[0]?.title || 'Keine Termine im Horizont'} onClick={props.onOpenCalendar} />
                    <SignalRow icon={<Mail size={13} />} label="Mail" value={props.mail[0]?.subject || 'Posteingang ruhig'} onClick={props.onOpenMail} />
                    <SignalRow icon={<Rss size={13} />} label="Feed" value={props.feed[0]?.title || 'Keine neuen Feed-Signale'} onClick={props.onOpenFeed} />
                </Instrument>
                <div className="flex items-center gap-3 px-2 text-[9px] uppercase tracking-[0.16em] text-white/27">
                    <Sparkles size={11} className="text-cyan-200/44" />
                    <span>{props.territoryCount} Bereiche</span>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span>{props.documentCount} Dokumente</span>
                </div>
            </div>
            <div className="pointer-events-auto absolute bottom-28 right-7 w-[255px]">
                <Instrument eyebrow="Wache" title="Nightwatch" accent={openIncidents.length ? 'amber' : 'cyan'}>
                    <button type="button" onClick={props.onOpenNightwatch} className="group w-full text-left">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs text-white/70">
                                {openIncidents.length ? <Activity size={14} className="text-amber-300/75" /> : <ShieldCheck size={14} className="text-emerald-300/70" />}
                                {openIncidents.length ? `${openIncidents.length} offen` : 'Systeme ruhig'}
                            </span>
                            <span className="text-[8px] uppercase tracking-[0.16em] text-white/24 transition group-hover:text-white/55">Öffnen</span>
                        </div>
                        <div className="mt-3 h-[34px] overflow-hidden rounded-xl border border-white/[0.05] bg-black/15 px-3 py-2 text-[10px] leading-relaxed text-white/42">
                            {openIncidents[0]?.title || 'Keine belegten Vorfälle im aktuellen Lagebild.'}
                        </div>
                    </button>
                </Instrument>
            </div>
        </div>
    );
}