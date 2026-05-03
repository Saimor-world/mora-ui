'use client';

import React, { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet } from '@/lib/api/coreClient';
import { ExternalLink, Globe, Loader2, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DossierData {
    url: string;
    domain?: string;
    title?: string;
    ssl?: { valid: boolean; issuer?: string; expires?: string };
    performance?: { lcp_ms?: number; fcp_ms?: number; score?: number };
    seo?: { meta_title?: string; meta_description?: string; h1?: string };
    security?: { headers?: Record<string, string>; csp?: boolean; hsts?: boolean };
    checked_at?: string;
}

// ─── WebsiteDossierApp ────────────────────────────────────────────────────────

export default function WebsiteDossierApp({ paneId, initialData }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore(s => s.activePaneId === paneId);

    const targetUrl: string = (initialData as Record<string, string>)?.url ?? '';

    const [dossier, setDossier] = useState<DossierData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!targetUrl) return;
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        coreGet(`/v3/dossier?url=${encodeURIComponent(targetUrl)}`, { isOptional: true })
            .then(data => {
                if (cancelled) return;
                if (data && typeof data === 'object') {
                    setDossier(data as DossierData);
                } else {
                    // API not yet live — show placeholder with URL
                    setDossier({ url: targetUrl });
                }
            })
            .catch(() => {
                if (!cancelled) setDossier({ url: targetUrl });
            })
            .finally(() => { if (!cancelled) setIsLoading(false); });

        return () => { cancelled = true; };
    }, [targetUrl]);

    if (!pane) return null;

    const domain = dossier?.domain ?? (targetUrl ? new URL(targetUrl).hostname : '—');
    const sslOk = dossier?.ssl?.valid;

    return (
        <GlassPanel
            title="Website Dossier"
            paneId={paneId}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
            onResize={(w, h) => updatePaneSize(paneId, w, h)}
            onClose={() => removePane(paneId)}
            onMinimize={() => minimizePane(paneId)}
            onFocus={() => focusPane(paneId)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex flex-col h-full overflow-y-auto p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-500/10">
                        <Globe size={18} className="text-teal-300/80" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-white/90 truncate">{domain}</div>
                        {targetUrl && (
                            <a
                                href={targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-teal-400/60 hover:text-teal-400 transition-colors mt-0.5"
                            >
                                <span className="truncate max-w-[280px]">{targetUrl}</span>
                                <ExternalLink size={10} className="shrink-0" />
                            </a>
                        )}
                    </div>
                </div>

                {isLoading && (
                    <div className="flex flex-1 items-center justify-center gap-2 text-white/30 text-sm">
                        <Loader2 size={16} className="animate-spin" />
                        <span>Analysiere Website…</span>
                    </div>
                )}

                {!isLoading && !targetUrl && (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="text-center space-y-2">
                            <ShieldQuestion size={32} className="mx-auto text-white/20" />
                            <p className="text-sm text-white/30">Keine URL angegeben.</p>
                            <p className="text-xs text-white/20">Öffne das Dossier über den Security-Check auf saimor.world.</p>
                        </div>
                    </div>
                )}

                {!isLoading && dossier && (
                    <>
                        {/* SSL status */}
                        <Section title="SSL / Sicherheit" icon={sslOk === false ? <ShieldAlert size={14} className="text-red-400" /> : <ShieldCheck size={14} className="text-emerald-400" />}>
                            {sslOk !== undefined ? (
                                <Row label="Zertifikat" value={sslOk ? 'Gültig' : 'Fehlt / ungültig'} ok={sslOk} />
                            ) : (
                                <p className="text-xs text-white/30">Daten werden nach dem nächsten Scan verfügbar.</p>
                            )}
                            {dossier.ssl?.issuer && <Row label="Aussteller" value={dossier.ssl.issuer} />}
                            {dossier.ssl?.expires && <Row label="Läuft ab" value={dossier.ssl.expires} />}
                            {dossier.security?.hsts !== undefined && <Row label="HSTS" value={dossier.security.hsts ? 'Aktiv' : 'Nicht gesetzt'} ok={dossier.security.hsts} />}
                            {dossier.security?.csp !== undefined && <Row label="CSP-Header" value={dossier.security.csp ? 'Vorhanden' : 'Fehlt'} ok={dossier.security.csp} />}
                        </Section>

                        {/* Performance */}
                        {dossier.performance && (
                            <Section title="Performance">
                                {dossier.performance.score !== undefined && (
                                    <Row label="Score" value={`${Math.round(dossier.performance.score * 100)} / 100`} ok={dossier.performance.score >= 0.7} />
                                )}
                                {dossier.performance.lcp_ms !== undefined && <Row label="LCP" value={`${dossier.performance.lcp_ms} ms`} />}
                                {dossier.performance.fcp_ms !== undefined && <Row label="FCP" value={`${dossier.performance.fcp_ms} ms`} />}
                            </Section>
                        )}

                        {/* SEO */}
                        {dossier.seo && (
                            <Section title="SEO">
                                {dossier.seo.meta_title && <Row label="Title" value={dossier.seo.meta_title} />}
                                {dossier.seo.h1 && <Row label="H1" value={dossier.seo.h1} />}
                                {dossier.seo.meta_description && <Row label="Description" value={dossier.seo.meta_description} />}
                            </Section>
                        )}

                        {dossier.checked_at && (
                            <p className="text-[10px] text-white/20 text-right">
                                Analysiert: {new Date(dossier.checked_at).toLocaleString('de-DE')}
                            </p>
                        )}

                        {/* Coming soon note when minimal dossier */}
                        {!dossier.ssl && !dossier.performance && !dossier.seo && (
                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                                <ShieldQuestion size={24} className="mx-auto mb-2 text-white/20" />
                                <p className="text-xs text-white/40">Vollständige Analyse verfügbar nach dem ersten Security-Check auf saimor.world.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </GlassPanel>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-white/60 mb-1">
                {icon}
                {title}
            </div>
            {children}
        </div>
    );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-white/40 shrink-0">{label}</span>
            <span className={`text-[11px] font-mono text-right truncate ${ok === true ? 'text-emerald-400' : ok === false ? 'text-red-400/80' : 'text-white/60'}`}>
                {value}
            </span>
        </div>
    );
}
