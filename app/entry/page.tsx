import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Bot, Building2, ClipboardList, FileText, Gauge, Home, ShieldCheck } from 'lucide-react';
import { buildWebsiteEntryContext, firstQueryValue, type WebsiteEntryContext } from '@/lib/websiteEntryContext';
import { WebsiteEntryPersistence } from '@/components/entry/WebsiteEntryPersistence';

type EntryPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const labelForContext = (entity?: string, id?: string) => {
    if (!entity || !id) return null;
    if (entity === 'security-audit') return 'Security Check aus der Website';
    if (entity === 'digital-blueprint') return 'Digital AI Self Blueprint aus der Website';
    return 'Website-Kontext';
};

const roomToneClasses: Record<WebsiteEntryContext['rooms'][number]['tone'], string> = {
    risk: 'border-rose-300/20 bg-rose-400/[0.08] text-rose-50',
    setup: 'border-cyan-300/18 bg-cyan-400/[0.07] text-cyan-50',
    growth: 'border-emerald-300/18 bg-emerald-400/[0.07] text-emerald-50',
};

const priorityClasses: Record<WebsiteEntryContext['tasks'][number]['priority'], string> = {
    hoch: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
    mittel: 'border-amber-200/25 bg-amber-300/10 text-amber-100',
    niedrig: 'border-white/12 bg-white/[0.05] text-white/62',
};

export default async function EntryPage({ searchParams }: EntryPageProps) {
    if (process.env.NEXT_PUBLIC_SURFACE_MODE !== 'hq') {
        redirect('/home');
    }

    const resolved = (await searchParams) ?? {};
    const surface = firstQueryValue(resolved.surface);
    const entity = firstQueryValue(resolved.entity);
    const id = firstQueryValue(resolved.id);
    const websiteContext = buildWebsiteEntryContext(resolved);
    const contextLabel = surface === 'website' ? labelForContext(entity, id) : null;

    return (
        <main className="min-h-screen bg-[#040908] text-white">
            <WebsiteEntryPersistence context={websiteContext} />
            <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
                <header className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/70">SAIMOR HQ</p>
                        <h1 className="mt-3 text-3xl font-medium text-white">Einstieg waehlen</h1>
                    </div>
                    <Link
                        href="/home"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/72 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                        <Home size={16} />
                        OS Home
                    </Link>
                </header>

                <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-5">
                        <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100/75">
                            Gefuehrter HQ-Workspace
                        </div>
                        <h2 className="max-w-xl break-words text-4xl font-light leading-tight text-white sm:text-5xl">
                            {websiteContext
                                ? `${websiteContext.companyName} als HQ-Workspace oeffnen.`
                                : 'Website-Ergebnis ansehen, dann bewusst ins OS wechseln.'}
                        </h2>
                        <p className="max-w-lg text-sm leading-7 text-white/58">
                            {websiteContext
                                ? 'Dieser Einstieg uebersetzt den Website-Check in einen isolierten Arbeitsraum mit Dossier, Raeumen, Dokumenten und Aufgaben. Echte Team- und Cloud-Daten werden erst nach expliziter Verbindung genutzt.'
                                : 'Diese Flaeche verbindet Website-Workflows mit dem OS. Sie zeigt Kontext aus Security Check oder Digital Self, ohne echte Team-, Cloud- oder Firmendaten vorzutaeuschen.'}
                        </p>
                        {contextLabel ? (
                            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] p-4">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/65">Website-Kontext</p>
                                <p className="mt-2 text-sm font-medium text-cyan-50">{contextLabel}</p>
                                <p className="mt-1 font-mono text-xs text-cyan-100/45">{id}</p>
                            </div>
                        ) : null}
                        {websiteContext?.score !== undefined ? (
                            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                                <Gauge size={18} className="text-emerald-200" />
                                <span className="text-sm text-white/62">Risk Score</span>
                                <strong className="text-lg font-medium text-white">{websiteContext.score}</strong>
                                {websiteContext.level ? (
                                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                                        {websiteContext.level}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                    </div>

                    {websiteContext ? <WebsiteHqPreview context={websiteContext} /> : <DefaultEntryOptions />}
                </section>
            </div>
        </main>
    );
}

function WebsiteHqPreview({ context }: { context: WebsiteEntryContext }) {
    return (
        <div className="grid gap-4">
            <div className="rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.07] p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                            <Building2 size={21} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/55">{context.title}</p>
                            <h3 className="mt-2 text-2xl font-medium text-white">{context.companyName}</h3>
                            <p className="mt-2 text-sm leading-6 text-white/55">
                                {context.domain
                                    ? `Isolierter HQ-Workspace fuer ${context.domain}.`
                                    : 'Isolierter HQ-Workspace aus dem Website-Einstieg.'}
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/home"
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-200/20 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-50 transition-colors hover:bg-emerald-300/15"
                    >
                        Oeffnen
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {context.rooms.map((room) => (
                    <div key={room.name} className={`rounded-2xl border p-4 ${roomToneClasses[room.tone]}`}>
                        <p className="text-sm font-medium text-white">{room.name}</p>
                        <p className="mt-2 text-xs leading-5 text-white/55">{room.description}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <FileText size={17} className="text-cyan-200" />
                        Dossier-Dokumente
                    </div>
                    <div className="mt-4 grid gap-3">
                        {context.documents.map((document) => (
                            <div key={document.title} className="border-l border-cyan-200/25 pl-3">
                                <p className="text-sm text-white/86">{document.title}</p>
                                <p className="mt-1 text-xs leading-5 text-white/45">{document.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <ClipboardList size={17} className="text-amber-100" />
                        Naechste Aufgaben
                    </div>
                    <div className="mt-4 grid gap-3">
                        {context.tasks.map((task) => (
                            <div key={task.title} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/15 p-3">
                                <p className="text-sm leading-5 text-white/80">{task.title}</p>
                                <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${priorityClasses[task.priority]}`}>
                                    {task.priority}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Link
                href="/home"
                className="group rounded-2xl border border-amber-200/15 bg-amber-300/[0.08] p-5 transition-colors hover:border-amber-200/30 hover:bg-amber-300/[0.12]"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200/20 bg-amber-300/10 text-amber-100">
                            <Home size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-white">Weiter ins OS</h3>
                            <p className="mt-1 max-w-lg text-sm leading-6 text-white/52">
                                Kundendossier ansehen und echte Anbindungen spaeter bewusst einrichten.
                            </p>
                        </div>
                    </div>
                    <ArrowRight size={18} className="mt-1 text-white/35 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                </div>
            </Link>
        </div>
    );
}

function DefaultEntryOptions() {
    return (
        <div className="grid gap-3">
            <a
                href="https://saimor.world/de/einstieg/security-check"
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors hover:border-emerald-300/30 hover:bg-emerald-400/[0.08]"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-white">Security Check</h3>
                            <p className="mt-1 max-w-lg text-sm leading-6 text-white/52">
                                Kostenloser Einstieg auf der Website, Ergebnis speichern und spaeter im Account wiederfinden.
                            </p>
                        </div>
                    </div>
                    <ArrowRight size={18} className="mt-1 text-white/35 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                </div>
            </a>

            <a
                href="https://saimor.world/de/einstieg/digital-self"
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors hover:border-cyan-300/30 hover:bg-cyan-400/[0.08]"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-white">Digital AI Self</h3>
                            <p className="mt-1 max-w-lg text-sm leading-6 text-white/52">
                                Einfacher Blueprint fuer Unternehmens-Workflows, ohne OS-Pflicht.
                            </p>
                        </div>
                    </div>
                    <ArrowRight size={18} className="mt-1 text-white/35 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                </div>
            </a>

            <Link
                href="/home"
                className="group rounded-2xl border border-amber-200/15 bg-amber-300/[0.08] p-5 transition-colors hover:border-amber-200/30 hover:bg-amber-300/[0.12]"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200/20 bg-amber-300/10 text-amber-100">
                            <Home size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-white">Weiter ins OS</h3>
                            <p className="mt-1 max-w-lg text-sm leading-6 text-white/52">
                                Arbeitsumgebung oeffnen. Echte Cloud-, Team- und Datenanbindungen werden dort separat eingerichtet.
                            </p>
                        </div>
                    </div>
                    <ArrowRight size={18} className="mt-1 text-white/35 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                </div>
            </Link>
        </div>
    );
}
