'use client';

import React from 'react';
import { Settings2, X } from 'lucide-react';
import { useContextStore } from '@/lib/store/contextStore';
import { AdminRosterView } from './AdminRosterView';
import { DepartmentVisibilityEditor } from './DepartmentVisibilityEditor';

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
    const ownerConsoleUrl = 'https://owner.saimor.world/login';

    return (
        <div className="flex flex-col h-full bg-[#07090f] text-white overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-amber-500/5">
                <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">Administration</span>
                    <span className="text-xs text-white/30">-- Bereiche, Sichtbarkeit und Organisationsstruktur</span>
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
                <div className="mb-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">In dieser Instanz</div>
                        <div className="mt-2 text-sm text-white/85">Organisationsverwaltung</div>
                        <p className="mt-2 text-sm leading-relaxed text-white/48">
                            Dieser Bereich ist fuer Team-Mitglieder, Sichtbarkeit und die aktuelle Arbeitsstruktur gedacht.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-amber-400/18 bg-amber-500/[0.06] p-4">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/70">Separat</div>
                        <div className="mt-2 text-sm text-white/88">Owner-Bereich</div>
                        <p className="mt-2 text-sm leading-relaxed text-white/50">
                            Systemweite Organisations-, Benutzer-, Token- und Instanzverwaltung bleibt bewusst ausserhalb dieser Arbeitsoberflaeche.
                        </p>
                        <a
                            href={ownerConsoleUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-amber-100 transition-colors hover:bg-amber-500/18"
                        >
                            Owner-Bereich oeffnen
                        </a>
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
