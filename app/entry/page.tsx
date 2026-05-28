import Link from 'next/link';
import { ArrowRight, Bot, Home, ShieldCheck } from 'lucide-react';
import { buildWebsiteEntryContext, firstQueryValue, type WebsiteEntryContext } from '@/lib/websiteEntryContext';
import { WebsiteEntryPersistence } from '@/components/entry/WebsiteEntryPersistence';
import { WebsiteEntryTokenLogin } from '@/components/entry/WebsiteEntryTokenLogin';
import { DemoWelcomeCardClient } from '@/components/entry/DemoWelcomeCardClient';
import { DemoDirectEntry } from '@/components/entry/DemoDirectEntry';

type EntryPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const labelForContext = (entity?: string, id?: string) => {
    if (!entity || !id) return null;
    if (entity === 'security-audit') return 'Security Check aus der Website';
    if (entity === 'digital-blueprint') return 'Digital AI Self Blueprint aus der Website';
    return 'Website-Kontext';
};

export default async function EntryPage({ searchParams }: EntryPageProps) {
    // SURFACE_MODE guard removed: /entry is always reachable for demo + HQ flows.
    // Previously gated on NEXT_PUBLIC_SURFACE_MODE === 'hq', which blocked all demo links.

    const resolved = (await searchParams) ?? {};
    const surface = firstQueryValue(resolved.surface);
    const entity = firstQueryValue(resolved.entity);
    const id = firstQueryValue(resolved.id);
    const mode = firstQueryValue(resolved.mode);
    const token = firstQueryValue(resolved.token) || firstQueryValue(resolved.entry_token);
    const websiteContext = buildWebsiteEntryContext(resolved);
    const contextLabel = surface === 'website' ? labelForContext(entity, id) : null;

    // Pure product demo (no dossier context): marketing landing + silent auth → /home
    if (mode === 'demo' && token && !websiteContext) {
        return <DemoDirectEntry token={token} />;
    }

    // Demo-Flow: if we have a website context, show the guided welcome card first
    if (websiteContext) {
        return (
            <main className="min-h-screen bg-[#05040d] text-white">
                {token ? <WebsiteEntryTokenLogin token={token} /> : null}
                <WebsiteEntryPersistence context={websiteContext} />
                <div className="flex min-h-screen items-center justify-center px-6 py-10">
                    <DemoWelcomeCardClient context={websiteContext} />
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#0d0921] text-white">
            {token ? <WebsiteEntryTokenLogin token={token} /> : null}
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
                            Website-Ergebnis ansehen, dann bewusst ins OS wechseln.
                        </h2>
                        <p className="max-w-lg text-sm leading-7 text-white/58">
                            Diese Flaeche verbindet Website-Workflows mit dem OS. Sie zeigt Kontext aus Security Check oder Digital Self, ohne echte Team-, Cloud- oder Firmendaten vorzutaeuschen.
                        </p>
                        {contextLabel ? (
                            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] p-4">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/65">Website-Kontext</p>
                                <p className="mt-2 text-sm font-medium text-cyan-50">{contextLabel}</p>
                                <p className="mt-1 font-mono text-xs text-cyan-100/45">{id}</p>
                            </div>
                        ) : null}
                    </div>

                    <DefaultEntryOptions />
                </section>
            </div>
        </main>
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
