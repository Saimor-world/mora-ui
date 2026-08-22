"use client";

import React from 'react';
import { Activity, CalendarDays, Mail, Rss, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import type { CalendarPreviewItem, FeedPreviewItem, MailPreviewItem } from '@/lib/hooks/useCommunicationLiveData';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import { encodeFallPayload, FALL_PAYLOAD_MIME, type FallSource } from '@/lib/universe/fall';
import type { BusinessSummary } from '@/lib/business/mrr';
import type { SubstanceBar } from '@/lib/universe/substanceChart';
import { SubstanceWidget } from '@/components/universe/SubstanceWidget';

interface Props {
    mail: MailPreviewItem[];
    calendar: CalendarPreviewItem[];
    feed: FeedPreviewItem[];
    incidents: NightwatchIncidentItem[];
    business: BusinessSummary;
    substanceBars: SubstanceBar[];
    onSelectTerritory: (id: string) => void;
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

/**
 * Nur eine echte Zeile ist eine ziehbare Quelle - der Platzhaltertext
 * ("Posteingang ruhig") darf nicht fallen, es gibt nichts, das faellt.
 */
function SignalRow({ icon, label, value, onClick, drag }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    onClick: () => void;
    drag?: { kind: FallSource['kind']; text: string } | null;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            draggable={Boolean(drag)}
            onDragStart={drag ? (event) => {
                event.dataTransfer.setData(
                    FALL_PAYLOAD_MIME,
                    encodeFallPayload({ kind: drag.kind, label: value, text: drag.text }),
                );
                event.dataTransfer.effectAllowed = 'move';
            } : undefined}
            className={'group flex w-full items-start gap-3 border-t border-white/[0.055] py-2.5 text-left first:border-0 first:pt-0 ' +
                (drag ? 'cursor-grab active:cursor-grabbing' : '')}
        >
            <span className="mt-0.5 text-cyan-100/42 transition group-hover:text-cyan-100/80">{icon}</span>
            <span className="min-w-0">
                <span className="block text-[8px] uppercase tracking-[0.17em] text-white/27">{label}</span>
                <span className="mt-0.5 block truncate text-[11px] leading-relaxed text-white/62 transition group-hover:text-white/88">{value}</span>
            </span>
        </button>
    );
}

/**
 * tenant_subscriptions hatte am 21.08.2026 null Zeilen - kein zahlender
 * Kunde. "Wir bereiten uns auf ersten Umsatz 2027 vor" waren Marius' eigene
 * Worte dazu; diese Kachel sagt das ehrlich, statt eine Zahl zu erfinden
 * oder das Feld einfach wegzulassen. Sobald tenant_subscriptions eine Zeile
 * traegt, zeigt genau dieselbe Kachel den echten Betrag - kein Umbau noetig.
 */
function BusinessInstrument({ business }: { business: BusinessSummary }) {
    if (business.activeCount === 0) {
        return (
            <Instrument eyebrow="Wirtschaft" title="Noch kein Umsatz">
                <p className="text-[11px] leading-relaxed text-white/48">
                    Vorbereitet auf den ersten zahlenden Kunden. Paddle ist angebunden – sobald ein Abo aktiv wird, erscheint es hier.
                </p>
            </Instrument>
        );
    }

    const amount = business.currency
        ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: business.currency }).format(business.monthlyRevenueMinor / 100)
        : `${business.monthlyRevenueMinor / 100} (gemischte Währungen)`;

    return (
        <Instrument eyebrow="Wirtschaft" title="Monatlicher Umsatz" accent="amber">
            <div className="flex items-baseline gap-2">
                <TrendingUp size={14} className="text-emerald-300/75" />
                <span className="text-lg font-medium text-white/90">{amount}</span>
            </div>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-white/32">
                {business.activeCount} aktive{business.activeCount === 1 ? 's Abo' : ' Abos'} · {business.providers.join(', ')}
            </p>
        </Instrument>
    );
}

export function UniverseObservatory(props: Props) {
    const openIncidents = props.incidents.filter((item) => !['resolved', 'closed', 'dismissed'].includes(String(item.status || 'open').toLowerCase()));
    // Zwei Fehler steckten in der Wurzelzeile darunter:
    //  1. `xl:block` liess die Kacheln zwischen 1024 und 1279px ersatzlos
    //     verschwinden - genau in der Breite, in der das Feld selbst seit dem
    //     lg-Umbruch schon laeuft. Auf einem normalen Laptop fehlten
    //     Horizont, Wirtschaft und Wache komplett.
    //  2. Bei ausgewaehltem Planeten sank die Deckkraft auf 20%, aber die
    //     Kacheln fingen weiterhin Klicks ab. Das Schliesskreuz des
    //     Detailfensters liegt an derselben Stelle wie die
    //     Wirtschafts-Kachel - es war mit der Maus nicht erreichbar, nur
    //     ueber Escape, und das sprang gleich ganz aus dem Universe heraus.
    //     Eine zurueckgetretene Kachel darf keine Klicks mehr fangen.
    return (
        <div className={'pointer-events-none absolute inset-0 z-[32] hidden transition-opacity duration-500 lg:block ' + (props.selected ? 'opacity-20' : 'opacity-100')}>
            <div className={'absolute bottom-28 left-7 w-[255px] space-y-3 ' + (props.selected ? 'pointer-events-none' : 'pointer-events-auto')}>
                <SubstanceWidget bars={props.substanceBars} onSelect={props.onSelectTerritory} />
                <Instrument eyebrow="Dein Horizont" title="Was gerade hereinragt">
                    <SignalRow
                        icon={<CalendarDays size={13} />} label="Kalender"
                        value={props.calendar[0]?.title || 'Keine Termine im Horizont'} onClick={props.onOpenCalendar}
                        drag={props.calendar[0] ? { kind: 'calendar', text: props.calendar[0].location || '' } : null}
                    />
                    <SignalRow
                        icon={<Mail size={13} />} label="Mail"
                        value={props.mail[0]?.subject || 'Posteingang ruhig'} onClick={props.onOpenMail}
                        drag={props.mail[0] ? { kind: 'mail', text: props.mail[0].snippet || '' } : null}
                    />
                    <SignalRow
                        icon={<Rss size={13} />} label="Feed"
                        value={props.feed[0]?.title || 'Keine neuen Feed-Signale'} onClick={props.onOpenFeed}
                        drag={props.feed[0] ? { kind: 'rss', text: props.feed[0].summary || '' } : null}
                    />
                </Instrument>
                <div className="flex items-center gap-3 px-2 text-[9px] uppercase tracking-[0.16em] text-white/27">
                    <Sparkles size={11} className="text-cyan-200/44" />
                    <span>{props.territoryCount} Bereiche</span>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span>{props.documentCount} Dokumente</span>
                </div>
            </div>
            <div className={'absolute bottom-28 right-7 w-[255px] space-y-3 ' + (props.selected ? 'pointer-events-none' : 'pointer-events-auto')}>
                <BusinessInstrument business={props.business} />
                <Instrument eyebrow="Wache" title="Nightwatch" accent={openIncidents.length ? 'amber' : 'cyan'}>
                    <button type="button" onClick={props.onOpenNightwatch} data-mora-label="Nightwatch" className="group w-full text-left">
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