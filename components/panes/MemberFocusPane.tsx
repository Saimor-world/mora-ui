"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ArrowRight, Search, Users, Info, Sparkles, FolderOpen } from 'lucide-react';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';

/**
 * MemberFocusPane - Kontextuelle Info-Sidebar
 *
 * Zeigt aktive Company/Department Infos und Quick Actions.
 * MASTERBIBEL: Minimalistisch, funktional, immer sichtbar bei core view.
 */
export const MemberFocusPane = () => {
    const { openPane } = usePaneStore();
    const { activeCompanyId, companies, nodesByCompany, departments, activeDepartmentId } = useMoraStore();
    const [isOpen, setIsOpen] = React.useState(false);
    const safeCompanies = React.useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);
    const safeDepartments = React.useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);

    const activeCompany = safeCompanies.find(c => c.id === activeCompanyId);
    const activeDepartment = safeDepartments.find(d => d.id === activeDepartmentId);
    const companyNodes = activeCompanyId ? nodesByCompany[activeCompanyId] || [] : [];

    const docCount = companyNodes.length;
    const deptCount = safeDepartments.length;

    const stats = [
        { label: 'ELEMENTE', value: docCount, sub: 'im Workspace' },
        { label: 'BEREICHE', value: deptCount, sub: 'aktive Abteilungen' }
    ];

    const actions = [
        { label: 'Finder', sub: 'Dokumente', icon: FolderOpen, onClick: () => openPane({ id: 'finder-main', type: 'finder', title: 'Finder', size: { width: 1280, height: 820 } }) },
        { label: 'Suche', sub: 'Semantisch', icon: Search, onClick: () => openPane({ id: 'search-main', type: 'search', title: 'Suche', size: { width: 600, height: 400 } }) },
        { label: 'Team', sub: 'Overview', icon: Users, onClick: () => openPane({ id: 'team-main', type: 'team', title: 'Team', size: { width: 780, height: 620 } }) },
        { label: 'Mora', sub: 'KI-Support', icon: Sparkles, onClick: () => openPane({ id: 'chat-mora', type: 'chat', title: 'Mora', size: { width: 860, height: 680 } }) }
    ];

    return (
        <div className="flex flex-col items-end gap-3 pointer-events-none">
            {/* The Floating Hub Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                        className="w-[360px] pointer-events-auto bg-[#050A08]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden relative"
                    >
                        {/* Glow Aura */}
                        <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-none" />

                        {/* Header Fusion */}
                        <div className="relative mb-6">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-500/60 uppercase">System Focus</span>
                                {activeCompany?.is_demo && <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-bold tracking-widest border border-blue-500/30">DEMO</span>}
                            </div>
                            <h2 className="text-xl font-light text-white tracking-tight">{activeCompany?.name || 'Workspace'}</h2>
                            <p className="text-[11px] text-white/40 mt-1 italic font-light">
                                {activeDepartment ? `Zentriert auf ${activeDepartment.name}` : `Zentriert auf den ${activeCompany?.name}-Orb`}
                            </p>
                        </div>

                        {/* Stats Rail - Integrated */}
                        <div className="flex gap-2 mb-6">
                            {stats.map((stat, i) => (
                                <div key={i} className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-3 group hover:bg-emerald-500/5 transition-colors cursor-default">
                                    <div className="text-[18px] font-light text-white mb-0.5">{stat.value}</div>
                                    <div className="text-[8px] font-bold text-emerald-500/40 tracking-wider uppercase">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Actions - Floating Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            {actions.map((action, i) => (
                                <motion.button
                                    key={i}
                                    onClick={action.onClick}
                                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all text-left group"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center text-white/30 group-hover:text-emerald-400 group-hover:bg-black/60 transition-colors">
                                        <action.icon size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-white/80 group-hover:text-white">{action.label}</span>
                                        <span className="text-[9px] text-white/30 group-hover:text-emerald-500/40">{action.sub}</span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* Live Flux Integration (Notices) */}
                        <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                            <div className="flex items-center justify-center text-[10px] text-white/30 px-2 uppercase tracking-widest relative group cursor-help">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                    <span>Live Flux (Simulated Data)</span>
                                </div>
                                {/* Simple Tooltip */}
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded border border-white/10 text-[9px] whitespace-nowrap z-50 pointer-events-none">
                                    System Pulse Visualization
                                </div>
                            </div>

                            {/* Simulated Sparkline */}
                            <div className="h-12 w-full relative overflow-hidden rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                    <motion.path
                                        d="M0,45 C20,40 40,48 60,35 C80,22 100,40 120,30 C140,20 160,35 180,25 C200,15 220,30 240,20 C260,10 280,35 300,15 L300,50 L0,50 Z"
                                        fill="url(#fluxGradient)"
                                        className="opacity-40"
                                        initial={{ d: "M0,50 L300,50 L0,50 Z" }}
                                        animate={{ d: "M0,45 C20,40 40,48 60,35 C80,22 100,40 120,30 C140,20 160,35 180,25 C200,15 220,30 240,20 C260,10 280,35 300,15 L300,50 L0,50 Z" }}
                                        transition={{ duration: 2, ease: "easeOut" }}
                                    />
                                    <motion.path
                                        d="M0,45 C20,40 40,48 60,35 C80,22 100,40 120,30 C140,20 160,35 180,25 C200,15 220,30 240,20 C260,10 280,35 300,15"
                                        fill="none"
                                        stroke="#10B981"
                                        strokeWidth="1.5"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 2.5, ease: "easeInOut" }}
                                    />
                                    <defs>
                                        <linearGradient id="fluxGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Trigger - Anchored to the bottom shell feel */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full backdrop-blur-xl border transition-all pointer-events-auto
                    ${isOpen
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-black/40 border-white/10 text-white/40 hover:text-white hover:border-white/20'}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isOpen ? "Fokus minimieren" : "System Fokus öffnen"}
            >
                <Info size={24} />
            </motion.button>
        </div>
    );
};
