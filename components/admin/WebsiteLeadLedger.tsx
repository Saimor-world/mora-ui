'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Database, ExternalLink, Mail, RefreshCcw, ShieldCheck } from 'lucide-react';
import { loadWebsiteEntryLeads, type StoredWebsiteEntryContext } from '@/lib/websiteEntryStorage';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet, corePost } from '@/lib/api/coreClient';
import { toast } from 'sonner';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';
import { useSessionStore } from '@/lib/store/sessionStore';

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
    wall_approved?: boolean;
    created_at?: string;
    updated_at?: string;
    is_demo?: boolean;
    status?: 'preview' | 'claimed';
    claimed?: boolean;
    entry_token?: string;
};

export const WebsiteLeadLedger: React.FC = () => {
    const userRole = useSessionStore((state) => state.user?.role);
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

    const addPane = usePaneStore((s) => s.addPane);

    const handleOpenDossier = async (lead: CorePreviewLead) => {
        try {
            const res = await coreGet(`/v3/entry/website-previews/${lead.tenant_id}?raw=true`);
            const data = res as { dossier: any; company: any };
            if (!data?.dossier) {
                toast.error('Kein Dossier-Inhalt gefunden.');
                return;
            }

            const metadata = typeof data.dossier.metadata === 'string'
                ? JSON.parse(data.dossier.metadata)
                : data.dossier.metadata;

            const context: WebsiteEntryContext = {
                id: lead.tenant_id,
                companyName: lead.company_name,
                domain: lead.domain,
                email: lead.contact_email || lead.claim_email || lead.preview_email,
                score: lead.score,
                summary: data.dossier.content,
                title: data.dossier.title || `${lead.company_name} Dossier`,
                rooms: [],
                documents: [],
                tasks: []
            };

            addPane({
                id: `dossier-${lead.tenant_id}`,
                type: 'website-dossier',
                title: `${lead.company_name} Dossier`,
                position: { x: 100, y: 100 },
                size: { width: 560, height: 720 },
                minimized: false,
                data: { context }
            });
        } catch (err) {
            toast.error('Dossier konnte nicht geöffnet werden.');
        }
    };

    const handleResendLink = async (lead: CorePreviewLead) => {
        const promise = corePost(`/v3/entry/website-previews/${lead.tenant_id}/resend-link?raw=true`, {});
        toast.promise(promise, {
            loading: 'Link wird generiert...',
            success: 'HQ-Link wurde erneut versandt.',
            error: 'Fehler beim Versenden des Links.'
        });
    };

    const handleApproveWall = async (lead: CorePreviewLead) => {
        try {
            await corePost(`/v3/entry/website-previews/${lead.tenant_id}/approve-wall?raw=true`, {});
            toast.success('Wall-Eintrag genehmigt.');
            // Refresh list
            window.location.reload(); // Simple refresh for now
        } catch {
            toast.error('Fehler bei der Wall-Genehmigung.');
        }
    };

    const handleEnterPreview = async (lead: CorePreviewLead) => {
        const toastId = toast.loading('Isolierte Kunden-Vorschau wird vorbereitet...');
        try {
            const res = await coreGet(`/v3/entry/website-previews/${lead.tenant_id}?raw=true`) as { dossier: any; company: any; entry_token?: string };
            const entryToken = res?.entry_token;
            if (!entryToken) {
                toast.error('Kein Preview-Token vom Server erhalten (Bist du System-Owner?).', { id: toastId });
                return;
            }

            const loginRes = await fetch('/api/auth/website-entry-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entryToken }),
            });

            if (!loginRes.ok) {
                const errPayload = await loginRes.json().catch(() => ({}));
                throw new Error(errPayload?.detail || 'Login fehlgeschlagen');
            }

            toast.success('Kunden-Vorschau geöffnet. Der Rückweg zu Saimôr HQ ist gesichert.', { id: toastId });
            window.location.href = '/home';
        } catch (err: any) {
            console.error('[handleEnterPreview] Failed:', err);
            toast.error(`Fehler beim Betreten: ${err.message || err}`, { id: toastId });
        }
    };

    const total = coreLeads.length || leads.length;
    const sourceLabel = status === 'core'
        ? 'CORE Tenant Ledger'
        : status === 'local'
            ? 'Lokaler Fallback'
            : status === 'loading'
                ? 'Lädt'
                : 'Noch leer';

    return (
        <section className="mb-8 rounded-2xl border border-cyan-300/14 bg-cyan-400/[0.045] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-100/54">Kunden-Vorschauen</div>
                    <h2 className="mt-1 text-lg font-medium text-white/90">WORLD-Leads in ihrem eigenen HQ ansehen</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/45">
                        Jede Vorschau bleibt in ihrem eigenen Tenant. Du kannst sie als System-Owner betreten und anschließend mit einem Klick sicher zu Saimôr HQ zurückkehren.
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
                                <button
                                    onClick={() => handleOpenDossier(lead)}
                                    className="flex flex-col items-start rounded-lg border border-white/[0.045] bg-white/[0.025] px-3 py-2 text-left transition-colors hover:bg-white/[0.05]"
                                >
                                    <div className="flex items-center gap-2 text-xs text-white/72">
                                        {lead.dossier_title || `${lead.company_name} Dossier`}
                                        <ExternalLink size={10} className="text-white/30" />
                                    </div>
                                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/28">Dossier öffnen</div>
                                </button>
                                <button
                                    onClick={() => handleResendLink(lead)}
                                    className="flex flex-col items-start rounded-lg border border-white/[0.045] bg-white/[0.025] px-3 py-2 text-left transition-colors hover:bg-white/[0.05]"
                                >
                                    <div className="flex items-center gap-2 text-xs text-white/72">
                                        <RefreshCcw size={10} className="text-white/30" />
                                        {accountEmail || 'Preview-Konto intern'}
                                    </div>
                                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/28">
                                        {isClaimed ? 'Link erneut senden' : 'Zugang senden'}
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleApproveWall(lead)}
                                    disabled={lead.wall_approved}
                                    className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                                        lead.wall_approved
                                            ? 'border-emerald-500/20 bg-emerald-500/5 cursor-default'
                                            : 'border-white/[0.045] bg-white/[0.025] hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 text-xs text-white/72">
                                        <ShieldCheck size={10} className={lead.wall_approved ? 'text-emerald-400' : 'text-white/30'} />
                                        {lead.wall_approved ? 'Wall genehmigt' : 'Wall-Eintrag offen'}
                                    </div>
                                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/28">
                                        {lead.wall_approved ? 'Live auf Website' : 'Jetzt freischalten'}
                                    </div>
                                </button>
                                {userRole === 'system_owner' && (
                                    <button
                                        onClick={() => handleEnterPreview(lead)}
                                        className="flex flex-col items-start rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-left transition-colors hover:bg-cyan-500/10"
                                    >
                                        <div className="flex items-center gap-2 text-xs text-cyan-200/90">
                                            <ExternalLink size={10} className="text-cyan-400" />
                                            Kunden-Vorschau betreten
                                        </div>
                                        <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-cyan-200/40">Isoliert öffnen · Rückkehr zu HQ gesichert</div>
                                    </button>
                                )}
                                <a
                                    href="https://www.saimor.world/owner"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex flex-col items-start rounded-lg border border-white/[0.045] bg-white/[0.025] px-3 py-2 text-left transition-colors hover:bg-white/[0.05] col-span-full"
                                >
                                    <div className="flex items-center gap-2 text-xs text-white/72">
                                        <ExternalLink size={10} className="text-white/30" />
                                        Website Admin Console
                                    </div>
                                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/28">Wall & Lead Management (WORLD)</div>
                                </a>
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
