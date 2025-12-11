"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Activity, Users, FolderOpen, Zap, Clock, TrendingUp, AlertCircle, CheckCircle, RefreshCw, FileText, ExternalLink, BarChart3, Filter, ArrowUpDown } from 'lucide-react';
import { fetchCompaniesHealth, type CompanyHealth } from '@/lib/api/coreClient';
import { MoraOrb } from '@/components/mora/MoraOrb';

/**
 * CLIENT HEALTH DASHBOARD — PREMIUM GLASSMORPHISM EDITION
 * 
 * MASTERBIBEL + Premium Design:
 * - Fully glassmorphic cards with blur effects
 * - Animated health bars with smooth transitions
 * - Pulse animations for warning/inactive states
 * - Hover quick actions
 * - Sort/filter capabilities
 * - Summary stats header
 * 
 * Privacy Protected: Owner sees ONLY metrics, NO client data access
 */

export const ClientHealthDashboard: React.FC = () => {
    const [healthData, setHealthData] = useState<CompanyHealth[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [sortBy, setSortBy] = useState<'health' | 'activity' | 'name'>('health');
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    const loadHealthData = async () => {
        setIsLoading(true);
        try {
            const response = await fetchCompaniesHealth();
            setHealthData(response.companies);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Failed to load health data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHealthData();
        const interval = setInterval(loadHealthData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Sort companies based on selected criteria
    const sortedHealthData = [...healthData].sort((a, b) => {
        switch (sortBy) {
            case 'health': return b.health_score - a.health_score;
            case 'name': return a.name.localeCompare(b.name);
            case 'activity': return new Date(b.last_activity || 0).getTime() - new Date(a.last_activity || 0).getTime();
            default: return 0;
        }
    });

    const getStatusFromScore = (score: number): 'healthy' | 'warning' | 'inactive' => {
        if (score >= 0.7) return 'healthy';
        if (score >= 0.3) return 'warning';
        return 'inactive';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' };
            case 'warning': return { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' };
            case 'inactive': return { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', glow: 'shadow-red-500/20' };
            default: return { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' };
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy': return <CheckCircle size={14} />;
            case 'warning': return <AlertCircle size={14} />;
            case 'inactive': return <AlertCircle size={14} />;
            default: return <CheckCircle size={14} />;
        }
    };

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

    const healthyCount = healthData.filter(c => getStatusFromScore(c.health_score) === 'healthy').length;
    const warningCount = healthData.filter(c => getStatusFromScore(c.health_score) === 'warning').length;
    const inactiveCount = healthData.filter(c => getStatusFromScore(c.health_score) === 'inactive').length;
    const totalNodes = healthData.reduce((sum, c) => sum + c.node_count, 0);
    const avgHealth = healthData.length > 0 ? healthData.reduce((sum, c) => sum + c.health_score, 0) / healthData.length : 0;

    return (
        <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#030806] via-[#040a08] to-[#030806]">
            {/* Premium Background with parallax stars */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                    <radialGradient id="ownerGlow" cx="50%" cy="30%" r="60%">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#ownerGlow)" />
                {Array.from({ length: 60 }).map((_, i) => {
                    // Deterministic positioning based on index to prevent hydration mismatch
                    const seededRandom = (seed: number) => {
                        const x = Math.sin(seed + i * 7.3) * 10000;
                        return x - Math.floor(x);
                    };
                    const cx = seededRandom(i) * 100;
                    const cy = seededRandom(i + 100) * 100;
                    const r = seededRandom(i + 200) * 1.5 + 0.3;
                    return (
                        <motion.circle
                            key={i}
                            cx={`${cx}%`}
                            cy={`${cy}%`}
                            r={r}
                            fill={i % 3 === 0 ? "#D4AF37" : "#10B981"}
                            animate={{ opacity: [0.1, 0.5, 0.1] }}
                            transition={{ duration: 3 + (i % 5), repeat: Infinity, delay: (i % 20) * 0.1 }}
                        />
                    );
                })}
            </svg>

            {/* Premium Header with glassmorphism */}
            <motion.div
                className="absolute top-8 left-1/2 -translate-x-1/2 text-center z-20"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl px-8 py-4 shadow-2xl">
                    <div className="flex items-center gap-3 mb-2 justify-center">
                        <Building2 className="text-mora-gold" size={28} />
                        <h1 className="text-2xl font-light tracking-[0.3em] text-white/90">
                            CLIENT HEALTH
                        </h1>
                        <button
                            onClick={loadHealthData}
                            disabled={isLoading}
                            className="p-2 rounded-lg hover:bg-white/10 transition-all ml-2 disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={`text-emerald-400 transition-transform ${isLoading ? 'animate-spin' : 'hover:rotate-180'}`} />
                        </button>
                    </div>
                    <p className="text-xs text-white/40 tracking-widest uppercase">
                        {healthData.length} Workspaces • Updated {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
            </motion.div>

            {/* Summary Stats Row with Glassmorphism */}
            <div className="absolute top-32 left-1/2 -translate-x-1/2 flex gap-4 z-20">
                {/* Overall Health */}
                <motion.div
                    className="backdrop-blur-xl bg-black/40 border border-mora-gold/30 rounded-xl px-6 py-3 flex items-center gap-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <BarChart3 size={18} className="text-mora-gold" />
                    <div>
                        <div className="text-2xl font-light text-mora-gold font-mono">{Math.round(avgHealth * 100)}%</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Avg Health</div>
                    </div>
                </motion.div>

                <motion.div
                    className="backdrop-blur-xl bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span className="text-sm text-emerald-400 font-mono">{healthyCount}</span>
                </motion.div>
                <motion.div
                    className="backdrop-blur-xl bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <AlertCircle size={14} className="text-amber-400" />
                    <span className="text-sm text-amber-400 font-mono">{warningCount}</span>
                </motion.div>
                <motion.div
                    className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <AlertCircle size={14} className="text-red-400" />
                    <span className="text-sm text-red-400 font-mono">{inactiveCount}</span>
                </motion.div>

                {/* Total Nodes */}
                <motion.div
                    className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Zap size={14} className="text-emerald-400" />
                    <span className="text-sm text-white/60 font-mono">{totalNodes} nodes</span>
                </motion.div>
            </div>

            {/* Sort Controls */}
            <div className="absolute top-[180px] left-1/2 -translate-x-1/2 flex gap-2 z-20">
                <div className="flex items-center gap-1 backdrop-blur-sm bg-black/30 rounded-lg p-1">
                    <ArrowUpDown size={12} className="text-white/40 ml-2" />
                    {(['health', 'name', 'activity'] as const).map((option) => (
                        <button
                            key={option}
                            onClick={() => setSortBy(option)}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${sortBy === option
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'text-white/40 hover:text-white/70'
                                }`}
                        >
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="absolute inset-0 pt-52 pb-24 px-8 overflow-auto">
                {isLoading && healthData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <motion.div
                            className="text-emerald-500/50 font-mono text-sm flex items-center gap-3"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <RefreshCw size={16} className="animate-spin" />
                            Connecting to Client Workspaces...
                        </motion.div>
                    </div>
                ) : healthData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <Building2 className="text-emerald-500/30" size={64} />
                        <p className="text-emerald-500/50 font-mono text-sm">No client companies yet</p>
                        <p className="text-emerald-500/30 text-xs">Create your first client to start monitoring</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-7xl mx-auto">
                        {sortedHealthData.map((company, index) => {
                            const status = getStatusFromScore(company.health_score);
                            const colors = getStatusColor(status);
                            const isHovered = hoveredCard === company.company_id;
                            const needsAttention = status === 'warning' || status === 'inactive';

                            return (
                                <motion.div
                                    key={company.company_id}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
                                    className={`relative group cursor-pointer transition-all duration-300`}
                                    onMouseEnter={() => setHoveredCard(company.company_id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    onClick={() => setSelectedCompany(selectedCompany === company.company_id ? null : company.company_id)}
                                >
                                    {/* Pulse animation for warnings */}
                                    {needsAttention && (
                                        <motion.div
                                            className={`absolute -inset-0.5 rounded-2xl ${colors.bg} opacity-50`}
                                            animate={{ scale: [1, 1.02, 1], opacity: [0.3, 0.5, 0.3] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    )}

                                    {/* Card with glassmorphism */}
                                    <div className={`relative p-5 rounded-2xl backdrop-blur-xl border transition-all duration-300 ${selectedCompany === company.company_id
                                        ? `bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10`
                                        : `bg-black/40 ${colors.border} hover:border-white/30 hover:bg-black/50`
                                        } ${isHovered ? 'transform scale-[1.02] shadow-xl' : ''}`}>

                                        {/* Company Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-11 h-11 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center shadow-lg ${colors.glow}`}>
                                                    <Building2 size={20} className={colors.text} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-medium text-white/90">{company.name}</h3>
                                                    <p className="text-[10px] text-white/40 font-mono">{company.slug}</p>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${colors.bg} ${colors.border} ${colors.text} text-[10px] font-mono`}>
                                                {getStatusIcon(status)}
                                                <span>{status.toUpperCase()}</span>
                                            </div>
                                        </div>

                                        {/* Health Score Bar */}
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between text-xs mb-1.5">
                                                <span className="text-white/50">Health Score</span>
                                                <span className={`${colors.text} font-mono font-medium`}>{Math.round(company.health_score * 100)}%</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden">
                                                <motion.div
                                                    className={`h-full rounded-full ${company.health_score >= 0.7 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                                        company.health_score >= 0.3 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                                                            'bg-gradient-to-r from-red-500 to-red-400'
                                                        }`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${company.health_score * 100}%` }}
                                                    transition={{ duration: 1, delay: index * 0.05, ease: 'easeOut' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Metrics Grid */}
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { icon: Building2, label: 'DEPTS', value: company.department_count },
                                                { icon: Activity, label: 'SPACES', value: company.space_count },
                                                { icon: FolderOpen, label: 'FOLDERS', value: company.folder_count },
                                                { icon: Zap, label: 'NODES', value: company.node_count },
                                            ].map((metric) => (
                                                <div key={metric.label} className="p-2 rounded-lg bg-black/30 text-center">
                                                    <metric.icon size={10} className="text-white/30 mx-auto mb-1" />
                                                    <div className="text-sm font-mono text-emerald-400">{metric.value}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Bottom Row */}
                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-2 text-[10px] text-white/40">
                                                <Users size={11} />
                                                <span>{company.active_users} active</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-white/40">
                                                <Clock size={11} />
                                                <span>{formatTimeAgo(company.last_activity)}</span>
                                            </div>
                                        </div>

                                        {/* Hover Quick Actions */}
                                        <AnimatePresence>
                                            {isHovered && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2"
                                                >
                                                    <button className="px-3 py-1 text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-full text-emerald-400 transition-all flex items-center gap-1">
                                                        <FileText size={10} />
                                                        Report
                                                    </button>
                                                    <button className="px-3 py-1 text-[10px] bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white/60 transition-all flex items-center gap-1">
                                                        <ExternalLink size={10} />
                                                        View
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Orb (Bottom Right - MASTERBIBEL) */}
            <div className="absolute bottom-12 right-12 z-30">
                <MoraOrb state="idle" />
            </div>

            {/* Premium Status Bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                <div className="backdrop-blur-sm bg-black/30 rounded-full px-6 py-2 border border-white/5">
                    <div className="flex items-center gap-4 text-[10px] text-white/30 font-mono tracking-widest">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-mora-gold animate-pulse" />
                            OWNER VIEW
                        </span>
                        <span className="text-white/10">|</span>
                        <span>{healthData.length} CLIENTS</span>
                        <span className="text-white/10">|</span>
                        <span>{healthyCount} HEALTHY</span>
                        <span className="text-white/10">|</span>
                        <span className="flex items-center gap-1">
                            🔒 PRIVACY MODE
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
