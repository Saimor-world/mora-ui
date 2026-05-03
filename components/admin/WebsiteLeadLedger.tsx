'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Database, Mail, ShieldCheck } from 'lucide-react';
import { loadWebsiteEntryLeads, type StoredWebsiteEntryContext } from '@/lib/websiteEntryStorage';

type CorePreviewLead = {
    id: string;
    tenant_id: string;
    company_name: string;
    preview_email?: string;
    owner_email?: string;
    claim_email?: string;
    contact_email?: string;
    domain?: string;
    score?: number;
    dossier_node_id?: string;
    dossier_title?: string;
    created_at?: string;
    updated_at?: string;
    is_demo?: boolean;
    status?: 'preview' | 'claimed';
    claimed?: boolean;
};

export const WebsiteLeadLedger: React.FC = () => {
    const [leads, setLeads] = useState<StoredWebsiteEntryContext[]>([]);
    const [coreLeads, setCoreLeads] = useState<CorePreviewLead[]>([]);
    const [status, setStatus] = useState<'loading' | 'core' | 'local' | 'empty'>('loading');

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const localLeads = loadWebsiteEntryLeads();
            setLeads(localLeads);
            try {
                const response = await fetch('/api/core/v3/entry/website-previews?raw=true&limit=50', {
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) throw new Error(`Core ledger returned ${response.status}`);
                const payload = await response.json();
                if (cancelled) return;
                const previews = Array.isArray(payload?.previews) ? payload.previews : [];
                setCoreLeads(previews);
                setStatus(previews.length > 0 ? 'core' : localLeads.length > 0 ? 'local' : 'empty');
            } catch {
                if (cancelled) return;
                setStatus(localLeads.length > 0 ? 'local' : 'empty');
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const total = coreLeads.length || leads.length;
    const sourceLabel = status === 'core'
        ? 'CORE Tenant Ledger'
        : status === 'local'
            ? 'Lokaler Fallback'
            : status === 'loading'
                ? 'Laedt'
                : 'Noch leer';

    return (
        <section className="mb-8 rounded-2xl border border-cyan-300/14 bg-cyan-400/[0.045] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-100/54">Website Pipeline</div>
                    <h2 className="mt-1 text-lg font-medium text-white/90">Website-Checks als HQ-Firmen</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/45">
                        Firmen, die aus WORLD ins HQ uebernommen wurden. Offene Previews sind noch nicht verbunden; Kundenaccount bedeutet, dass der Check bereits an den angegebenen Account gebunden ist.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-cyan-50/70">
                        <Database size={13} />
                        {sourceLabel}
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-cyan-50/70">
                        {total} Firma{total === 1 ? '' : 'en'}
                    </div>
                </div>
            </div>

            <div className="mt-5 grid gap-3">
                {status === 'loading' ? (
                    <div className="rounded-xl border border-white/[0.06] bg-black/16 px-4 py-3 text-sm text-white/42">
                        Website-Pipeline wird aus CORE geladen...
                    </div>
                ) : coreLeads.length > 0 ? (
                    coreLeads.map((lead) => {
                        const isClaimed = Boolean(lead.claimed || lead.status === 'claimed');
                        const accountEmail = lead.claim_email || lead.owner_email || lead.preview_email;
                        return (
                        <article key={lead.id || lead.tenant_id} className="rounded-xl border border-white/[0.065] bg-black/18 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 text-white/86">
                                        <Building2 size={15} className="text-cyan-200/70" />
                                        <span className="truncate text-sm font-medium">{lead.company_name}</span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/42">
                                        {lead.domain ? <span>{lead.domain}</span> : null}
                                        {lead.contact_email ? (
                                            <span className="inline-flex items-center gap-1">
                                                <Mail size={12} />
                                                {lead.contact_email}
                                            </span>
                                        ) : null}
                                        <span>{lead.tenant_id}</span>
                                        {lead.created_at ? <span>{new Date(lead.created_at).toLocaleString('de-DE')}</span> : null}
                                    </div>
                                </div>
                                <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                                    isClaimed
                                        ? 'border-cyan-300/18 bg-cyan-400/[0.09] text-cyan-50/82'
                                        : 'border-emerald-300/14 bg-emerald-400/[0.08] text-emerald-50/78'
                                }`}>
                                    <ShieldCheck size={13} />
                                    {lead.score ?? '--'}
                                    {lead.is_demo ? ' Demo' : isClaimed ? ' Kundenaccount' : ' Preview'}
                                </div>
                            </div>
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                                <div className="rounded-lg border border-white/[0.045] bg-white/[0.025] px-3 py-2">
                                    <div className="text-xs text-white/72">{lead.dossier_title || `${lead.company_name} Dossier`}</div>
                                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/28">Dossier</div>
                                </div>
                                <div className="rounded-lg border border-white/[0.045] bg-white/[0.025] px-3 py-2">
                                    <div className="truncate text-xs text-white/72">{accountEmail || 'Preview-Konto intern'}</div>
                                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/28">
                                        {isClaimed ? 'Verbundenes Konto' : 'Preview-Zugang'}
                                    </div>
                                </div>
                            </div>
                        </article>
                    );
                    })
                ) : leads.length === 0 ? (
                    <div className="rounded-xl border border-white/[0.06] bg-black/16 px-4 py-3 text-sm text-white/42">
                        Noch kein Website-Dossier im OS angenommen.
                    </div>
                ) : leads.map((lead) => (
                    <article key={lead.id || `${lead.companyName}-${lead.storedAt}`} className="rounded-xl border border-white/[0.065] bg-black/18 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-white/86">
                                    <Building2 size={15} className="text-cyan-200/70" />
                                    <span className="truncate text-sm font-medium">{lead.companyName}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/42">
                                    {lead.domain ? <span>{lead.domain}</span> : null}
                                    {lead.email ? (
                                        <span className="inline-flex items-center gap-1">
                                            <Mail size={12} />
                                            {lead.email}
                                        </span>
                                    ) : null}
                                    {lead.storedAt ? <span>{new Date(lead.storedAt).toLocaleString('de-DE')}</span> : null}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 rounded-full border border-emerald-300/14 bg-emerald-400/[0.08] px-3 py-1.5 text-xs text-emerald-50/78">
                                <ShieldCheck size={13} />
                                {lead.score ?? '--'} {lead.grade || lead.level || ''}
                            </div>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {lead.tasks.slice(0, 2).map((task) => (
                                <div key={task.title} className="rounded-lg border border-white/[0.045] bg-white/[0.025] px-3 py-2">
                                    <div className="text-xs text-white/72">{task.title}</div>
                                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/28">{task.priority}</div>
                                </div>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
};
