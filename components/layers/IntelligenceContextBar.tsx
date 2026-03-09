"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';

export interface BreadcrumbItem {
    label: string;
    onClick?: () => void;
}

export type RiskLevel = 'none' | 'low' | 'moderate' | 'high';

interface IntelligenceContextBarProps {
    /** Breadcrumb navigation path */
    breadcrumb: BreadcrumbItem[];
    /** Current risk level */
    riskLevel?: RiskLevel;
    /** Number of active items at current level */
    activeCount?: number;
    /** Custom status message */
    statusMessage?: string;
    /** Auto-hide after inactivity (ms) */
    autoHideDelay?: number;
    /** Always visible (disable auto-hide) */
    alwaysVisible?: boolean;
}

/**
 * INTELLIGENCE CONTEXT BAR
 * 
 * Top-edge context strip showing current location, risk, and system status.
 * Auto-hides after inactivity, reveals on mouse-to-top hover.
 * 
 * Features:
 * - Breadcrumb navigation (clickable)
 * - Risk indicator (color-coded)
 * - Active item count
 * - Auto-hide/reveal behavior
 * 
 * Design:
 * - 40px height
 * - Translucent black background
 * - Emerald/gold accents
 * - Smooth slide animation
 */
export const IntelligenceContextBar: React.FC<IntelligenceContextBarProps> = ({
    breadcrumb,
    riskLevel = 'none',
    activeCount,
    statusMessage,
    autoHideDelay = 2000,
    alwaysVisible = false
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [forceVisible, setForceVisible] = useState(false);

    // Auto-hide logic
    useEffect(() => {
        if (alwaysVisible || forceVisible) return;

        const timer = setTimeout(() => {
            setIsVisible(false);
        }, autoHideDelay);

        return () => clearTimeout(timer);
    }, [autoHideDelay, alwaysVisible, forceVisible, breadcrumb]);

    // Mouse-to-top detection
    useEffect(() => {
        if (alwaysVisible) return;

        const handleMouseMove = (e: MouseEvent) => {
            const mouseY = e.clientY;
            const windowHeight = window.innerHeight;

            // Reveal if mouse is in top 60px
            if (mouseY < 60) {
                setForceVisible(true);
                setIsVisible(true);
            } else if (mouseY > 100) {
                setForceVisible(false);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [alwaysVisible]);

    // Risk level config
    const riskConfig = {
        none: {
            color: '#10B981',
            icon: CheckCircle,
            label: 'No Risk'
        },
        low: {
            color: '#10B981',
            icon: CheckCircle,
            label: 'Low Risk'
        },
        moderate: {
            color: '#F59E0B',
            icon: AlertTriangle,
            label: 'Moderate Risk'
        },
        high: {
            color: '#EF4444',
            icon: AlertCircle,
            label: 'High Risk'
        }
    };

    const currentRisk = riskConfig[riskLevel];
    const RiskIcon = currentRisk.icon;

    // Scope signal: prefer real API scope (from v3/chat SSE preamble) over store-derived
    const { activeCompanyId, activeDepartmentId, activeSpaceId, companies, departments, spacesByDepartment, lastChatScope } = useMoraStore();
    const safeCompanies = Array.isArray(companies) ? companies : [];
    const safeDepartments = Array.isArray(departments) ? departments : [];
    const safeSpacesByDepartment = spacesByDepartment && typeof spacesByDepartment === 'object' ? spacesByDepartment : {};
    const allSpaces = Object.values(safeSpacesByDepartment)
        .filter((value): value is any[] => Array.isArray(value))
        .flat();
    const company = safeCompanies.find(c => c.id === activeCompanyId);
    const dept = safeDepartments.find(d => d.id === activeDepartmentId);
    const space = allSpaces.find(s => s.id === activeSpaceId);
    // Use API-resolved names if available (e.g. company_name, department_name from v3/chat)
    const apiScope = lastChatScope?.resolved_scope;
    const scopeParts = apiScope
        ? [apiScope.company_name, apiScope.department_name, apiScope.space_name].filter(Boolean)
        : [company?.name, dept?.name, space?.name].filter(Boolean);
    const scopeLabel = scopeParts.join(' › ');
    const hasScopeContext = !!activeDepartmentId;
    const scopeEnforced = lastChatScope?.scope_enforced ?? false;
    const scopeBoundaryLevel = lastChatScope?.scope_contract?.boundary_level;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{
                        duration: 0.3,
                        ease: [0.4, 0, 0.2, 1]
                    }}
                    className="fixed top-0 left-[72px] right-0 z-50 pointer-events-none"
                    onMouseEnter={() => setForceVisible(true)}
                    onMouseLeave={() => setForceVisible(false)}
                >
                    <div
                        className="w-full h-10 flex items-center justify-between px-6 pointer-events-auto backdrop-blur-md border-b"
                        style={{
                            backgroundColor: 'rgba(3, 8, 6, 0.85)',
                            borderColor: 'rgba(16, 185, 129, 0.15)'
                        }}
                    >
                        {/* Left: Breadcrumb */}
                        <div className="flex items-center gap-2">
                            {breadcrumb.map((item, index) => (
                                <React.Fragment key={index}>
                                    {index > 0 && (
                                        <ChevronRight className="w-3 h-3 text-emerald-500/30" />
                                    )}
                                    {item.onClick ? (
                                        <button
                                            onClick={item.onClick}
                                            className="text-xs text-emerald-100/70 hover:text-emerald-100 transition-colors font-medium tracking-wide"
                                        >
                                            {item.label}
                                        </button>
                                    ) : (
                                        <span className="text-xs text-emerald-100 font-medium tracking-wide">
                                            {item.label}
                                        </span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Right: Status Indicators */}
                        <div className="flex items-center gap-4">
                            {/* Active Count */}
                            {activeCount !== undefined && (
                                <div className="flex items-center gap-1.5">
                                    <Info className="w-3 h-3 text-emerald-500/50" />
                                    <span className="text-xs text-emerald-100/60 font-mono">
                                        {activeCount} {activeCount === 1 ? 'Item' : 'Items'}
                                    </span>
                                </div>
                            )}

                            {/* Status Message */}
                            {statusMessage && (
                                <span className="text-xs text-emerald-100/50 font-mono tracking-wide">
                                    {statusMessage}
                                </span>
                            )}

                            {/* Risk Indicator */}
                            {riskLevel !== 'none' && (
                                <div className="flex items-center gap-1.5">
                                    <RiskIcon
                                        className="w-3 h-3"
                                        style={{ color: currentRisk.color }}
                                    />
                                    <span
                                        className="text-xs font-medium tracking-wide"
                                        style={{ color: currentRisk.color }}
                                    >
                                        {currentRisk.label}
                                    </span>
                                </div>
                            )}

                            {/* Active Indicator Dot (always visible) */}
                            <div
                                className="w-2 h-2 rounded-full animate-pulse"
                                style={{ backgroundColor: currentRisk.color }}
                            />
                        </div>
                    </div>

                    {/* Scope context signal — shown below main bar when in a dept/space context */}
                    {hasScopeContext && (
                        <div className="w-full flex items-center gap-1.5 px-6 py-0.5 text-[10px] border-b" style={{ backgroundColor: 'rgba(3, 8, 6, 0.75)', borderColor: 'rgba(255,255,255,0.04)' }}>
                            <span className="text-white/20">Kontext:</span>
                            <span className="text-white/50 font-medium tracking-wide">{scopeLabel}</span>
                            {scopeBoundaryLevel && (
                                <span className="text-white/35">· {scopeBoundaryLevel}</span>
                            )}
                            {scopeEnforced && (
                                <span className="ml-auto flex items-center gap-1 text-amber-400/60 text-[9px]">
                                    <span className="w-1 h-1 rounded-full bg-amber-400 inline-block" />
                                    eingeschränkt
                                </span>
                            )}
                        </div>
                    )}

                    {/* Subtle bottom glow */}
                    <div
                        className="w-full h-px"
                        style={{
                            background: `linear-gradient(90deg, transparent 0%, ${currentRisk.color}20 50%, transparent 100%)`
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Export types
export type { IntelligenceContextBarProps };
