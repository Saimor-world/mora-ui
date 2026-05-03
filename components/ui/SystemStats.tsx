"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Database, Zap } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { useCompanies } from '@/lib/queries/useCompanies';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useNodes } from '@/lib/queries/useNodes';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { useWebsiteEntryContext } from '@/lib/hooks/useWebsiteEntryContext';

/**
 * V12: System Stats
 *
 * Shows live system statistics in a minimal footer bar.
 * - Document count
 * - Department count
 * - Connection status
 * - Memory usage (simulated)
 */
export const SystemStats: React.FC = () => {
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const activeFolderId = useNavStore((s) => s.activeFolderId);
    const orbState = useOrbStore((s) => s.orbState);
    const { data: companies = [] } = useCompanies();
    const { data: departments = [] } = useDepartments(activeCompanyId);
    // Use active folder's nodes for the count (best approximation without full cache scan)
    const { data: nodes = [] } = useNodes(activeFolderId);
    const surfaceProfile = useSurfaceProfile();
    const websiteEntryContext = useWebsiteEntryContext();

    const [uptime, setUptime] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    // Count nodes in the active folder
    const totalNodes = nodes.length;
    const activeCompany = companies.find((company) => company.id === activeCompanyId);

    // Simulated uptime counter
    useEffect(() => {
        const interval = setInterval(() => {
            setUptime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const forced = new URLSearchParams(window.location.search).get('stats') === '1';
        setIsVisible(process.env.NODE_ENV !== 'production' || forced);
    }, []);

    const formatUptime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusColor = () => {
        switch (orbState) {
            case 'alert': return 'text-red-400';
            case 'thinking': return 'text-blue-400';
            case 'focus': return 'text-emerald-400';
            default: return 'text-emerald-400/60';
        }
    };

    const statusLabel = (() => {
        switch (orbState) {
            case 'alert':
                return 'ACHTUNG';
            case 'thinking':
                return 'DENKT';
            case 'focus':
                return 'FOKUS';
            case 'insight':
                return 'INSIGHT';
            default:
                return String(orbState || 'standby').toUpperCase();
        }
    })();

    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-0 right-0 z-[50] pointer-events-none"
        >
            <div className="flex items-center justify-center gap-6 py-1.5 text-[9px] font-mono text-white/20">
                {/* Context */}
                <div className="flex items-center gap-1.5">
                    <Database size={10} className="opacity-50" />
                    <span>
                        {websiteEntryContext?.companyName
                            ? websiteEntryContext.companyName
                            : surfaceProfile.isPublicDemoSurface
                            ? 'Beispielsystem'
                            : surfaceProfile.isLocalTruthSurface
                                ? (activeCompany?.name || 'Aktive Instanz')
                                : companies.length === 1
                                    ? '1 Organisation'
                                    : `${companies.length} Organisationen`}
                    </span>
                </div>

                {/* Departments */}
                <div className="flex items-center gap-1.5">
                    <Cpu size={10} className="opacity-50" />
                    <span>{departments.length} Abteilungen</span>
                </div>

                {/* Nodes */}
                <div className="flex items-center gap-1.5">
                    <Zap size={10} className="opacity-50" />
                    <span>{totalNodes} Inhalte</span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5">
                    <Activity size={10} className={getStatusColor()} />
                    <span className={getStatusColor()}>
                        {statusLabel}
                    </span>
                </div>

                {/* Uptime */}
                <div className="flex items-center gap-1.5 opacity-50">
                    <span>Session: {formatUptime(uptime)}</span>
                </div>
            </div>
        </motion.div>
    );
};

export default SystemStats;
