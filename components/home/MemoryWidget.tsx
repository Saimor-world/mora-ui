"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useMemory } from '@/lib/hooks/useMemory';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';

/**
 * MEMORY DASHBOARD WIDGET
 *
 * Kompaktes Widget fuer die Home-Ansicht mit:
 * - Anzahl Erinnerungen
 * - Pending Reviews mit pulsierendem Indikator
 * - Letzte Aktivitaet
 * - Mini-Graph der letzten 7 Tage
 */

interface MemoryWidgetProps {
    className?: string;
}

export const MemoryWidget: React.FC<MemoryWidgetProps> = ({ className = '' }) => {
    const { metrics, pendingCount, isLoading } = useMemory();
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const { openPane } = usePaneStore();
    const isAccountScoped = !activeCompanyId;

    // Berechne Gesamtzahl der Erinnerungen
    const totalMemories = useMemo(() => {
        if (!metrics) return 0;
        const episodicSum = Object.values(metrics.episodic_memories || {}).reduce((a, b) => a + b, 0);
        return episodicSum + (metrics.structured_facts || 0);
    }, [metrics]);

    // Simuliere 7-Tage-Aktivitaet basierend auf recent_learns_7d
    const weeklyActivity = useMemo(() => {
        const base = metrics?.recent_learns_7d || 0;
        // Verteile die Aktivitaet auf 7 Tage mit etwas Variation
        return [
            Math.max(1, Math.floor(base * 0.08)),
            Math.max(1, Math.floor(base * 0.12)),
            Math.max(2, Math.floor(base * 0.18)),
            Math.max(1, Math.floor(base * 0.10)),
            Math.max(2, Math.floor(base * 0.22)),
            Math.max(1, Math.floor(base * 0.15)),
            Math.max(2, Math.floor(base * 0.15)),
        ];
    }, [metrics]);

    const maxActivity = Math.max(...weeklyActivity, 1);

    const handleClick = () => {
        openPane({
            id: "mora-hub",
            type: "mora-hub",
            title: "Mora Nexus",
            size: { width: 720, height: 640 },
            data: { activeSection: "memory" }
        });
    };

    const formatLastActivity = () => {
        if (!metrics?.memory_ttl_days) return 'Keine Daten';
        return `TTL: ${metrics.memory_ttl_days} Tage`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            onClick={handleClick}
            className={`
                relative overflow-hidden cursor-pointer
                bg-white/[0.02] hover:bg-white/[0.04]
                border border-white/5 hover:border-violet-500/20
                backdrop-blur-xl rounded-2xl p-5
                transition-all duration-300 group
                ${className}
            `}
        >
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${isAccountScoped ? 'bg-amber-500/10 border-amber-500/20' : 'bg-violet-500/10 border-violet-500/20'}`}>
                            <Brain className={`w-4.5 h-4.5 ${isAccountScoped ? 'text-amber-400' : 'text-violet-400'}`} />
                        </div>
                        {pendingCount > 0 && !isAccountScoped && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
                            </span>
                        )}
                    </div>
                    <div>
                        <h3 className="text-xs font-medium text-white/80 tracking-wide">
                            {isAccountScoped ? 'Konto-Gedächtnis' : 'Gedächtnis'}
                        </h3>
                        <p className="text-[9px] text-white/30 uppercase tracking-widest">
                            {isAccountScoped ? 'Firmenkontext fehlt' : 'Memory Hub'}
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-violet-400 rounded-full animate-spin" />
                ) : pendingCount > 0 ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        <span className="text-[9px] font-bold text-amber-400">{pendingCount}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                    </div>
                )}
            </div>

            {isAccountScoped && (
                <div className="mb-4 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3 text-xs text-white/45 leading-relaxed">
                    Keine aktive Company gewählt. Konto-Gedächtnis bleibt lokal; Firmenmetriken und Freigaben werden erst mit Workspace angezeigt.
                </div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.03]">
                    <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1">Erinnerungen</div>
                    <div className="text-lg font-mono text-white/90">{isLoading ? '-' : totalMemories}</div>
                </div>
                <div className={`rounded-xl p-3 border ${pendingCount > 0 ? 'bg-violet-500/5 border-violet-500/10' : 'bg-white/[0.03] border-white/[0.03]'}`}>
                    <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1">Ausstehend</div>
                    <div className={`text-lg font-mono ${pendingCount > 0 ? 'text-violet-400' : 'text-white/90'}`}>{isLoading ? '-' : pendingCount}</div>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.03]">
                    <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1">7-Tage</div>
                    <div className="text-lg font-mono text-white/90">{isLoading ? '-' : (metrics?.recent_learns_7d || 0)}</div>
                </div>
            </div>

            <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] text-white/30 uppercase tracking-widest">Aktivitaet</span>
                    <div className="flex items-center gap-1 text-[8px] text-white/20">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatLastActivity()}</span>
                    </div>
                </div>
                <div className="flex items-end gap-1 h-8">
                    {weeklyActivity.map((value, index) => {
                        const height = Math.max(15, (value / maxActivity) * 100);
                        const isToday = index === 6;
                        return (
                            <motion.div
                                key={index}
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
                                className={`flex-1 rounded-sm transition-colors ${isToday ? 'bg-violet-400 group-hover:bg-violet-300' : 'bg-white/10 group-hover:bg-white/15'}`}
                                title={`Tag ${index + 1}: ${value} Eintraege`}
                            />
                        );
                    })}
                </div>
                <div className="flex gap-1 mt-1">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, i) => (
                        <span key={day} className={`flex-1 text-center text-[7px] ${i === 6 ? 'text-violet-400/60' : 'text-white/20'}`}>{day}</span>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <span className="text-[9px] text-white/30 tracking-wide">Klicken zum Oeffnen</span>
                <motion.div className="text-[9px] text-violet-400/60 group-hover:text-violet-400 transition-colors flex items-center gap-1" whileHover={{ x: 2 }}>
                    Mora Nexus
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
                </motion.div>
            </div>

            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 via-transparent to-transparent" />
            </div>
        </motion.div>
    );
};

export default MemoryWidget;
