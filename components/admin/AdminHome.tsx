'use client';

import React, { useCallback } from 'react';
import { Plug, Settings2, X } from 'lucide-react';
import { useContextStore } from '@/lib/store/contextStore';
import { useIntegrationsOverview } from '@/lib/hooks/useIntegrationsOverview';
import { usePaneStore } from '@/lib/store/paneStore';
import { AdminRosterView } from './AdminRosterView';
import { DemoWorkspacesPanel } from './DemoWorkspacesPanel';
import { DepartmentVisibilityEditor } from './DepartmentVisibilityEditor';
import { WebsiteLeadLedger } from './WebsiteLeadLedger';

function SourceStatus({ label, connected }: { label: string; connected?: boolean }) {
    return (
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/[0.06] py-2.5 last:border-b-0">
            <span className="truncate text-sm text-white/68">{label}</span>
            <span className={connected ? 'text-xs text-emerald-300/80' : 'text-xs text-white/38'}>
                {connected ? 'Verbunden' : 'Offen'}
            </span>
        </div>
    );
}

/**
 * AdminHome -- the admin OS surface (spec Section 2, Surface C).
 *
 * Renders when isAdminMode === true. Fully replaces the main content area.
 * Previous context (personal or company) is suspended, not destroyed.
 * The cosmic universe visually recedes -- this is the operational context.
 *
 * Phase 2 MVC: roster view + membership/visibility management.
 */
export const AdminHome: React.FC = () => {
    const setAdminMode = useContextStore((s) => s.setAdminMode);
    const openPane = usePaneStore((s) => s.openPane);
    const { overview, isLoading, error } = useIntegrationsOverview();
    const ownerConsoleUrl = 'https://owner.saimor.world/owner';
    const operationsConsoleUrl = 'https://www.saimor.world/systems/control';
    const googleDriveConnected = Boolean(
        overview?.cloud_storage?.connectors?.some((connector) =>
            connector.provider === 'google_drive' && connector.enabled !== false
        )
    );

    const openIntegrations = useCallback(() => {
        openPane({
            id: 'integrations-main',
            type: 'integrations',
            title: 'Integrationen',
            size: { width: 980, height: 720 },
        });
    }, [openPane]);

    return (
        <div className="flex flex-col h-full bg-[#07090f] text-white overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-amber-500/5">
                <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">Kunden & Administration</span>
                    <span className="text-xs text-white/30">-- Vorschauen, Bereiche, Sichtbarkeit und Organisationsstruktur</span>
                </div>
                <button
                    onClick={() => setAdminMode(false)}
                    title="Administration verlassen"
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                    <X size={14} />
                    Verlassen
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <WebsiteLeadLedger />

                <DemoWorkspacesPanel />

                <section className="mb-6 border-y border-white/[0.07] py-5" aria-labelledby="owner-sources-title">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                        <div>
                            <div className="flex items-center gap-2 text-emerald-300/75">
                                <Plug size={15} />
                                <span className="text-[10px] uppercase tracking-[0.22em]">Quellen & Konten</span>
                            </div>
                            <h2 id="owner-sources-title" className="mt-2 text-lg font-medium text-white/90">
                                Google und Arbeitsquellen im OS verwalten
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/48">
                                CORE liefert den belegten Verbindungsstatus. Mail, Kalender und Drive werden über die interne
                                Verbindungszentrale eingerichtet; externe Betriebs-Dashboards erzeugen keine zweite Setup-Wahrheit.
                            </p>
                            <button
                                type="button"
                                onClick={openIntegrations}
                                className="mt-4 inline-flex items-center gap-2 border border-emerald-300/20 bg-emerald-400/[0.08] px-3 py-2 text-sm text-emerald-100 transition-colors hover:bg-emerald-400/[0.14]"
                            >
                                <Plug size={14} />
                                Google & Quellen verwalten
                            </button>
                        </div>

                        <div className="border-l border-white/[0.07] pl-5">
                            <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/30">
                                {isLoading ? 'Status wird geladen' : error ? 'Status nicht belegbar' : 'CORE Status'}
                            </div>
                            <SourceStatus label="Mail" connected={overview?.mail?.configured} />
                            <SourceStatus label="Kalender" connected={overview?.calendar?.configured} />
                            <SourceStatus label="Google Drive" connected={googleDriveConnected} />
                        </div>
                    </div>
                </section>

                <div className="mb-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">In dieser Instanz</div>
                        <div className="mt-2 text-sm text-white/85">Organisationsverwaltung</div>
                        <p className="mt-2 text-sm leading-relaxed text-white/48">
                            Dieser Bereich ist für Team-Mitglieder, Sichtbarkeit und die aktuelle Arbeitsstruktur gedacht.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-amber-400/18 bg-amber-500/[0.06] p-4">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/70">Systembetrieb</div>
                        <div className="mt-2 text-sm text-white/88">Owner- und Operations-Konsole</div>
                        <p className="mt-2 text-sm leading-relaxed text-white/50">
                            Instanzweite Benutzer-, Token-, Website-Lead- und Betriebsdiagnosen bleiben getrennt. Konten und Datenquellen werden dagegen direkt im OS verwaltet.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <a
                                href={ownerConsoleUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-amber-100 transition-colors hover:bg-amber-500/18"
                            >
                                Owner Command öffnen
                            </a>
                            <a
                                href={operationsConsoleUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:bg-cyan-500/18"
                            >
                                Operations öffnen
                            </a>
                        </div>
                    </div>
                </div>

                <AdminRosterView />
                <div className="mt-8 pt-6 border-t border-white/5">
                    <DepartmentVisibilityEditor />
                </div>
            </div>
        </div>
    );
};
