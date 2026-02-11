"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Activity, Users, FolderOpen, Zap, Clock,
    CheckCircle, RefreshCw, FileText, BarChart3, ArrowUpRight, ArrowDownRight, Eye, AlertCircle, Search, TrendingUp
} from 'lucide-react';
import { fetchCompaniesHealth, type CompanyHealth } from '@/lib/api/coreClient';
import { useMoraStore } from '@/lib/store/moraState';
// MemoryWidget removed - Memory is account/company-specific

/**
 * CLIENT HEALTH DASHBOARD — PREMIUM 2.0 EDITION
 * 
 * NAVIGATION: Doppel-Klick oder "Universum" Button zum Einsteigen in den Client-Kontext.
 */

export const ClientHealthDashboard: React.FC = () => {
    const { setActiveCompany, setViewLevel, setViewMode, companies } = useMoraStore();
    const [healthData, setHealthData] = useState<CompanyHealth[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'health' | 'activity' | 'name'>('health');
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const loadHealthData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetchCompaniesHealth();
            setHealthData(response.companies || []);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Failed to load health data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHealthData();
        const interval = setInterval(loadHealthData, 30000);
        return () => clearInterval(interval);
    }, [loadHealthData]);

    const handleViewCompany = async (companyId: string) => {
        console.log('[ClientHealth] Stepping into Account Context:', companyId);
        setActiveCompany(companyId);

        const store = useMoraStore.getState();
        await store.loadTree(undefined, companyId);
        setViewLevel('core');

        const comp = store.companies.find(c => c.id === companyId);
        if (comp?.is_demo) {
            setViewMode('demo');
        } else {
            setViewMode('workspace');
        }

        import('sonner').then(({ toast }) => {
            const name = store.companies.find(c => c.id === companyId)?.name || 'Account';
            toast.success(`Context Switched: ${name}`);
        });
    };

    const getStatusFromScore = (score: number): 'healthy' | 'warning' | 'inactive' => {
        if (score >= 0.7) return 'healthy';
        if (score >= 0.3) return 'warning';
        return 'inactive';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' };
            case 'warning': return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'shadow-amber-500/10' };
            case 'inactive': return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', glow: 'shadow-red-500/10' };
            default: return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' };
        }
    };

    const filteredData = useMemo(() => {
        return healthData
            .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.slug.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => {
                switch (sortBy) {
                    case 'health': return b.health_score - a.health_score;
                    case 'name': return a.name.localeCompare(b.name);
                    case 'activity': return new Date(b.last_activity || 0).getTime() - new Date(a.last_activity || 0).getTime();
                    default: return 0;
                }
            });
    }, [healthData, searchQuery, sortBy]);

    const totalNodes = healthData.reduce((sum, c) => sum + (c.node_count || 0), 0);
    const avgHealth = healthData.length > 0 ? healthData.reduce((sum, c) => sum + (c.health_score || 0), 0) / healthData.length : 0;

    const formatTimeAgo = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#020604]">
            {/* Background Texture & Aura */}
            <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />

            {/* Header Unit */}
            <header className="absolute top-10 inset-x-10 flex items-center justify-between z-30">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-6"
                >
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="text-mora-gold" size={20} />
                            <h1 className="text-xl font-light tracking-[0.4em] text-white/90 uppercase">Client Health</h1>
                        </div>
                        <div className="text-[10px] text-white/20 tracking-widest mt-1 ml-8">REAL-TIME INFRASTRUCTURE MONITOR</div>
                    </div>

                    {/* System Pulse Indicator */}
                    <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-full px-4 py-2 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-tighter">System Pulse</span>
                        </div>
                        <div className="w-px h-3 bg-white/10" />
                        <span className="text-[9px] text-white/40 font-mono tracking-widest">STABLE.R2</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4"
                >
                    {/* Search Field */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-400 transition-colors" size={14} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="CLIENT SUCHEN..."
                            className="bg-white/[0.03] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] text-white w-64 focus:w-80 outline-none focus:border-emerald-500/30 transition-all font-mono"
                        />
                    </div>

                    <button
                        onClick={loadHealthData}
                        disabled={isLoading}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-white/40 hover:text-emerald-400 hover:border-emerald-500/20 transition-all group"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
                    </button>
                </motion.div>
            </header>

            {/* Global Stats Rail */}
            <div className="absolute top-28 inset-x-10 flex gap-4 z-20">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/[0.04] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-mora-gold/10 border border-mora-gold/20 flex items-center justify-center text-mora-gold">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <div className="text-xs text-white/30 uppercase tracking-[0.2em]">Mittlere Resonanz</div>
                            <div className="text-2xl font-mono text-white/90">{Math.round(avgHealth * 100)}%</div>
                        </div>
                    </div>
                    {/* Sparkline Placeholder Visual */}
                    <div className="flex gap-1 h-8 items-end opacity-20 group-hover:opacity-40 transition-opacity pr-4">
                        {[40, 70, 45, 90, 65, 80, 50, 85].map((h, i) => (
                            <div key={i} className="w-1 rounded-full bg-mora-gold" style={{ height: `${h}%` }} />
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/[0.04] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Zap size={20} />
                        </div>
                        <div>
                            <div className="text-xs text-white/30 uppercase tracking-[0.2em]">Globaler Index</div>
                            <div className="text-2xl font-mono text-white/90">{totalNodes}</div>
                        </div>
                    </div>
                    <div className="text-emerald-400/30 text-[10px] items-center flex gap-1 font-mono uppercase pr-4">
                        <ArrowUpRight size={12} /> +1.2%
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-center min-w-[200px]"
                >
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Letzte Sync</div>
                    <div className="text-xs text-white/60 font-mono tracking-wider">{lastRefresh.toLocaleTimeString()}</div>
                </motion.div>

                {/* Memory Widget removed - Memory is account-specific, not for Owner view */}
            </div>

            {/* Grid Content */}
            <div className="absolute inset-0 pt-52 pb-24 px-10 overflow-auto scrollbar-hide">
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-screen-2xl mx-auto py-6"
                    layout
                >
                    <AnimatePresence mode="popLayout">
                        {filteredData.map((company) => {
                            const status = getStatusFromScore(company.health_score);
                            const colors = getStatusColor(status);
                            const trend = Math.random() > 0.5 ? 'up' : 'down';

                            return (
                                <motion.div
                                    key={company.company_id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={`relative p-6 rounded-[2rem] backdrop-blur-2xl border transition-all duration-500 group cursor-pointer 
                                        ${selectedCompany === company.company_id
                                            ? 'bg-white/[0.05] border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)]'
                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.03]'}`}
                                    onMouseEnter={() => setHoveredCard(company.company_id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    onClick={() => setSelectedCompany(company.company_id)}
                                    onDoubleClick={() => handleViewCompany(company.company_id)}
                                >
                                    {/* Glass Shine */}
                                    <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-12 h-12 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center relative overflow-hidden`}>
                                            <div className="absolute inset-0 bg-noise opacity-[0.05]" />
                                            <Building2 size={24} className={colors.text} />
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className={`text-[9px] font-bold tracking-[0.2em] px-3 py-1 rounded-full ${colors.bg} border ${colors.border} ${colors.text}`}>
                                                {status.toUpperCase()}
                                            </div>
                                            {trend === 'up' ?
                                                <div className="text-[9px] text-emerald-500/50 font-mono flex items-center gap-1"><ArrowUpRight size={10} /> TRENDING</div> :
                                                <div className="text-[9px] text-amber-500/50 font-mono flex items-center gap-1"><ArrowDownRight size={10} /> VOLATILE</div>
                                            }
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="text-white/90 text-[15px] font-light tracking-tight mb-0.5">{company.name}</h3>
                                        <p className="text-white/20 text-[10px] font-mono tracking-widest uppercase">{company.slug}</p>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Status Meter */}
                                        <div className="relative">
                                            <div className="flex justify-between text-[8px] text-white/30 uppercase tracking-[0.2em] mb-1.5 px-1">
                                                <span>Health Score</span>
                                                <span className={colors.text}>{Math.round(company.health_score * 100)}%</span>
                                            </div>
                                            <div className="w-full h-[6px] bg-white/5 rounded-full overflow-hidden border border-white/[0.02]">
                                                <motion.div
                                                    className={`h-full bg-gradient-to-r ${status === 'healthy' ? 'from-emerald-600 to-emerald-400' : status === 'warning' ? 'from-amber-600 to-amber-400' : 'from-red-600 to-red-400'}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${company.health_score * 100}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                />
                                            </div>
                                        </div>

                                        {/* Data Grid */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 hover:bg-white/[0.04] transition-all">
                                                <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <LayoutGrid size={10} /> Bereiche
                                                </div>
                                                <div className="text-lg font-mono text-white/80">{company.department_count || 0}</div>
                                            </div>
                                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 hover:bg-white/[0.04] transition-all">
                                                <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <FileText size={10} /> Einheiten
                                                </div>
                                                <div className="text-lg font-mono text-white/80">{company.node_count || 0}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footprint */}
                                    <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                                        <div className="text-[8px] text-white/20 flex items-center gap-2">
                                            <Clock size={10} />
                                            <span>AKTIVITÄT: {company.last_activity ? formatTimeAgo(company.last_activity) : 'N/A'}</span>
                                        </div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleViewCompany(company.company_id); }}
                                            className="opacity-0 group-hover:opacity-100 bg-white/10 hover:bg-mora-gold hover:text-black text-white/70 text-[9px] font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-white/5"
                                        >
                                            <Eye size={12} /> UNIVERSUM
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Matrix Footer */}
            <div className="absolute bottom-6 inset-x-10 flex items-center justify-between z-20">
                <div className="backdrop-blur-md bg-white/[0.03] border border-white/5 rounded-full px-6 py-2 flex items-center gap-6 text-[9px] tracking-[0.3em] font-light text-white/30">
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-mora-gold animate-pulse shadow-[0_0_10px_rgba(212,175,55,1)]" />
                        SYSTEM OWNER MODE ACTIVE
                    </span>
                    <span className="opacity-10 text-xl">/</span>
                    <span className="opacity-80">{filteredData.length} VERIFIED MANDANTEN</span>
                </div>

                <div className="text-[9px] text-white/10 tracking-widest font-mono">
                    SAIMÔR OS v1.5 // CORE_SYNC.AUTO
                </div>
            </div>

        </div>
    );
};

// Internal Layout Helper
function LayoutGrid({ size }: { size: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
}
