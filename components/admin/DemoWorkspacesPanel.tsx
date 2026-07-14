'use client';

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { coreDelete, corePost } from '@/lib/api/http';
import { useCompanies } from '@/lib/queries/useCompanies';
import { queryKeys } from '@/lib/queries/queryKeys';

/**
 * DemoWorkspacesPanel — owner management for guided demo companies.
 *
 * One place that answers: which demo workspaces exist in THIS tenant,
 * what are they, and how do I create or refresh one. Demo companies are
 * `is_demo` rows seeded from named content packs; refreshing re-runs the
 * idempotent seed, which heals missing structure, documents and files
 * without touching anything else in the tenant.
 *
 * Removing a demo company uses DELETE /v3/companies/{id}: verified
 * company-scoped with a full cascade (departments, spaces, folders, nodes,
 * files incl. bytes) and a last-company guard on the backend. It is hard
 * deletion, so the button double-confirms and only ever offers is_demo rows.
 */

const KNOWN_PACKS: { pack: string; companyName: string; label: string; blurb: string }[] = [
    {
        pack: 'coffee',
        companyName: 'Simple Coffee Group',
        label: 'Simple Coffee Group',
        blurb: 'Kaffeekette mit Stores, HR, Marketing — die kanonische geführte Demo (auch im 20-Tage-Check).',
    },
    {
        pack: 'mittelstand',
        companyName: 'Brandt & Söhne Gebäudetechnik',
        label: 'Brandt & Söhne Gebäudetechnik',
        blurb: 'Deutscher Handwerksbetrieb: Wartungsverträge, Einsatzplanung, BWA — für Mittelstands-Gespräche.',
    },
];

const packForCompanyName = (name: string): string | null =>
    KNOWN_PACKS.find((entry) => entry.companyName === name)?.pack ?? null;

export const DemoWorkspacesPanel: React.FC = () => {
    const queryClient = useQueryClient();
    const { data: companies = [], isLoading } = useCompanies({ includeDemo: true });
    const [busyPack, setBusyPack] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const demoCompanies = useMemo(
        () => (Array.isArray(companies) ? companies.filter((company) => company.is_demo) : []),
        [companies]
    );

    const runGuidedDemoSeed = async (pack: string, intent: 'create' | 'refresh') => {
        setBusyPack(pack);
        try {
            const result = await corePost('/v3/companies/guided-demo', { pack });
            await queryClient.invalidateQueries({ queryKey: queryKeys.companies() });
            const name = result?.company_id ? KNOWN_PACKS.find((p) => p.pack === pack)?.label ?? pack : pack;
            toast.success(
                intent === 'create'
                    ? `Demo-Workspace „${name}" ist bereit.`
                    : `Demo-Workspace „${name}" wurde aufgefrischt — Struktur, Dokumente und Dateien sind vollständig.`
            );
        } catch (err: any) {
            toast.error(err?.message || 'Demo-Workspace konnte nicht erstellt werden.');
        } finally {
            setBusyPack(null);
        }
    };

    const removeDemoCompany = async (companyId: string, name: string, pack: string) => {
        setBusyPack(pack);
        try {
            await coreDelete(`/v3/companies/${companyId}`);
            await queryClient.invalidateQueries({ queryKey: queryKeys.companies() });
            toast.success(`Demo-Workspace „${name}" wurde vollständig entfernt.`);
        } catch (err: any) {
            toast.error(err?.message || 'Demo-Workspace konnte nicht entfernt werden.');
        } finally {
            setBusyPack(null);
            setConfirmDeleteId(null);
        }
    };

    return (
        <section className="mb-6 border-b border-white/[0.07] pb-6" aria-labelledby="demo-workspaces-title">
            <div className="flex items-center gap-2 text-amber-200/75">
                <FlaskConical size={15} />
                <span className="text-[10px] uppercase tracking-[0.22em]">Demo-Workspaces</span>
            </div>
            <h2 id="demo-workspaces-title" className="mt-2 text-lg font-medium text-white/90">
                Geführte Beispiel-Firmen dieser Instanz
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/48">
                Demo-Firmen leben neben deiner echten Organisation und tragen überall die DEMO-Markierung.
                Auffrischen ergänzt fehlende Auslieferungsinhalte (selbst Hinzugefügtes bleibt bestehen);
                Entfernen löscht die Demo-Firma samt aller Inhalte endgültig. Deine echten Daten bleiben
                in beiden Fällen unberührt.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
                {KNOWN_PACKS.map((entry) => {
                    const existing = demoCompanies.find((company) => company.name === entry.companyName);
                    const busy = busyPack === entry.pack;
                    return (
                        <div
                            key={entry.pack}
                            className="rounded-2xl border border-amber-400/[0.14] bg-amber-500/[0.04] p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-medium text-white/88">{entry.label}</span>
                                        <span className="shrink-0 rounded-full border border-amber-300/35 bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-amber-200/90">
                                            Demo
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-xs leading-relaxed text-white/45">{entry.blurb}</p>
                                </div>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${
                                        existing
                                            ? 'border border-emerald-300/25 bg-emerald-400/10 text-emerald-200/85'
                                            : 'border border-white/12 bg-white/[0.04] text-white/40'
                                    }`}
                                >
                                    {isLoading ? '…' : existing ? 'Vorhanden' : 'Nicht angelegt'}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => runGuidedDemoSeed(entry.pack, existing ? 'refresh' : 'create')}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/22 bg-amber-400/[0.09] px-3 py-1.5 text-xs text-amber-100/90 transition-colors hover:bg-amber-400/[0.16] disabled:opacity-50"
                                >
                                    {busy ? (
                                        <RefreshCw size={12} className="animate-spin" />
                                    ) : existing ? (
                                        <RefreshCw size={12} />
                                    ) : (
                                        <Plus size={12} />
                                    )}
                                    {existing ? 'Inhalte auffrischen' : 'Anlegen'}
                                </button>
                                {existing && confirmDeleteId !== existing.id && (
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => setConfirmDeleteId(existing.id)}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.10] bg-white/[0.03] px-3 py-1.5 text-xs text-white/55 transition-colors hover:border-rose-400/30 hover:text-rose-200/90 disabled:opacity-50"
                                    >
                                        <Trash2 size={12} />
                                        Entfernen
                                    </button>
                                )}
                                {existing && confirmDeleteId === existing.id && (
                                    <span className="inline-flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/[0.08] px-2.5 py-1 text-xs text-rose-100/85">
                                        Endgültig löschen?
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => removeDemoCompany(existing.id, entry.label, entry.pack)}
                                            className="rounded-lg bg-rose-500/80 px-2 py-0.5 text-[11px] font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
                                        >
                                            Ja, entfernen
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDeleteId(null)}
                                            className="rounded-lg px-1.5 py-0.5 text-[11px] text-white/55 transition-colors hover:text-white/85"
                                        >
                                            Abbrechen
                                        </button>
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {demoCompanies.some((company) => !packForCompanyName(company.name)) && (
                <p className="mt-3 text-xs text-white/35">
                    Weitere Demo-Firmen in dieser Instanz:{' '}
                    {demoCompanies
                        .filter((company) => !packForCompanyName(company.name))
                        .map((company) => company.name)
                        .join(', ')}
                </p>
            )}
        </section>
    );
};
