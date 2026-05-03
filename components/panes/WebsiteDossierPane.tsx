'use client';

import React from 'react';
import { ExternalLink, FileText, Mail, ShieldCheck, SquareCheckBig } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

type Props = {
    id: string;
    data?: {
        context?: WebsiteEntryContext;
    };
};

const priorityClass: Record<string, string> = {
    hoch: 'border-red-300/22 bg-red-400/[0.08] text-red-100',
    mittel: 'border-amber-300/20 bg-amber-400/[0.08] text-amber-100',
    niedrig: 'border-emerald-300/18 bg-emerald-400/[0.07] text-emerald-100',
};

export const WebsiteDossierPane: React.FC<Props> = ({ id, data }) => {
    const context = data?.context;
    const pane = usePaneStore((s) => s.panes.find((p) => p.id === id));
    const activePaneId = usePaneStore((s) => s.activePaneId);
    const updatePanePosition = usePaneStore((s) => s.updatePanePosition);
    const updatePaneSize = usePaneStore((s) => s.updatePaneSize);
    const removePane = usePaneStore((s) => s.removePane);
    const minimizePane = usePaneStore((s) => s.minimizePane);
    const focusPane = usePaneStore((s) => s.focusPane);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Website Dossier"
            paneId={id}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={activePaneId === id}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex h-full flex-col overflow-hidden bg-[#06110e] text-white">
                <div className="border-b border-white/8 px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-200/55">Website Dossier</div>
                            <h2 className="mt-2 text-3xl font-light tracking-[-0.03em] text-white/92">
                                {context?.companyName || 'Website-Check'}
                            </h2>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/45">
                                {context?.domain ? <span>{context.domain}</span> : null}
                                {context?.email ? (
                                    <span className="inline-flex items-center gap-1">
                                        <Mail size={12} />
                                        {context.email}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-emerald-300/14 bg-emerald-400/[0.07] px-5 py-4 text-right">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/45">Board-Signal</div>
                            <div className="mt-1 text-3xl font-light text-emerald-50">{context?.score ?? '--'}</div>
                            <div className="text-xs text-emerald-100/44">{context?.grade || context?.level || 'bereit'}</div>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                    {!context ? (
                        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-8 text-sm text-white/50">
                            Kein Website-Kontext geladen.
                        </div>
                    ) : (
                        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                            <section className="space-y-5">
                                <div className="rounded-3xl border border-white/8 bg-white/[0.035] p-6">
                                    <div className="flex items-center gap-2 text-emerald-100/70">
                                        <ShieldCheck size={17} />
                                        <span className="text-[10px] uppercase tracking-[0.24em]">Scan-Ergebnis</span>
                                    </div>
                                    <p className="mt-4 text-sm leading-relaxed text-white/68">
                                        {context.summary || 'Das Dossier wurde aus dem Website-Einstieg vorbereitet. Detaildaten kommen aus dem Security-Check und werden hier als Arbeitsobjekt sichtbar.'}
                                    </p>
                                </div>

                                <div className="grid gap-3">
                                    {context.rooms.map((room) => (
                                        <div key={room.name} className="rounded-2xl border border-white/7 bg-black/18 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 className="text-sm font-medium text-white/86">{room.name}</h3>
                                                <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/38">
                                                    {room.tone}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs leading-relaxed text-white/48">{room.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <aside className="space-y-5">
                                <section className="rounded-3xl border border-white/8 bg-white/[0.032] p-5">
                                    <div className="mb-4 flex items-center gap-2 text-white/54">
                                        <FileText size={15} />
                                        <span className="text-[10px] uppercase tracking-[0.22em]">Dokumente</span>
                                    </div>
                                    <div className="space-y-3">
                                        {context.documents.map((doc) => (
                                            <div key={doc.title} className="rounded-2xl border border-white/[0.055] bg-black/18 p-3">
                                                <div className="text-sm text-white/78">{doc.title}</div>
                                                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-white/42">{doc.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-white/8 bg-white/[0.032] p-5">
                                    <div className="mb-4 flex items-center gap-2 text-white/54">
                                        <SquareCheckBig size={15} />
                                        <span className="text-[10px] uppercase tracking-[0.22em]">Nächste Aufgaben</span>
                                    </div>
                                    <div className="space-y-2">
                                        {context.tasks.map((task) => (
                                            <div key={task.title} className="rounded-2xl border border-white/[0.055] bg-black/18 p-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <span className="text-sm text-white/76">{task.title}</span>
                                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${priorityClass[task.priority] || priorityClass.mittel}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <a
                                    href={context.id ? `/?surface=${context.surface || 'website'}&entity=${context.entity || 'security-audit'}&id=${context.id}` : '/'}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.10] px-4 py-3 text-sm font-medium text-emerald-50 transition-colors hover:bg-emerald-400/[0.15]"
                                >
                                    Kontext behalten
                                    <ExternalLink size={14} />
                                </a>
                            </aside>
                        </div>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
};
