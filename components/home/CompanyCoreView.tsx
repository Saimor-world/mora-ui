"use client";

import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DepartmentCluster } from '@/components/home/DepartmentCluster';
import { CompanyOrbit } from '@/components/orbits/CompanyOrbit';
import { AmbientDust } from '@/components/organic/AmbientDust';
import { IntelligenceContextBar } from '@/components/layers/IntelligenceContextBar';
import { useMoraStore } from '@/lib/store/moraState';
import { calculateVisualCenter } from '@/lib/orbit/orbitMath';

/**
 * COMPANY CORE VIEW
 * 
 * Main home screen showing departments in orbital formation.
 * Key principles:
 * - Max 6 departments for cleanliness
 * - "Dive-in" effect when clicking department
 * - Orb breathing in center
 */
export const CompanyCoreView: React.FC = () => {
    const {
        departments,
        loadDepartments,
        navigateToDepartment,
        activeDepartmentId,
        activeCompanyId,
        viewLevel,
        setViewLevel,
        spacesByDepartment,
        foldersBySpace
    } = useMoraStore();

    useEffect(() => {
        if (departments.length === 0) {
            loadDepartments();
        }
    }, [departments.length, loadDepartments]);

    const breadcrumb = [
        { label: 'Home', onClick: () => setViewLevel('core') }
    ];

    // Show all departments (demo expects full set)
    const visibleDepartments = departments;

    // Grow orbit radius slightly with count to avoid overlap
    const orbitRadius = Math.min(420, 240 + visibleDepartments.length * 8);

    // Calculate visual center accounting for sidebars (72px left + 350px right)
    const visualCenter = useMemo(() => {
        if (typeof window !== 'undefined') {
            return calculateVisualCenter(window.innerWidth, window.innerHeight, 72, 350);
        }
        return { x: 0, y: 0 };
    }, []);

    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* ABSOLUTE CONTEXT BAR (doesn't affect layout) */}
            <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
                <div className="pointer-events-auto">
                    <IntelligenceContextBar
                        breadcrumb={breadcrumb}
                        riskLevel="none"
                        activeCount={visibleDepartments.length}
                        alwaysVisible={false}
                    />
                </div>
            </div>

            {/* Connected Star Network Background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {/* Generate star positions once */}
                {(() => {
                    const stars = Array.from({ length: 60 }, () => ({
                        x: Math.random() * 100,
                        y: Math.random() * 100,
                        size: Math.random() * 2 + 1
                    }));

                    return (
                        <>
                            {/* Connection lines between nearby stars */}
                            {stars.map((star, i) =>
                                stars.slice(i + 1).map((otherStar, j) => {
                                    const distance = Math.sqrt(
                                        Math.pow(star.x - otherStar.x, 2) +
                                        Math.pow(star.y - otherStar.y, 2)
                                    );
                                    // Only connect stars within 15% distance
                                    if (distance < 15) {
                                        return (
                                            <motion.line
                                                key={`line-${i}-${j}`}
                                                x1={`${star.x}%`}
                                                y1={`${star.y}%`}
                                                x2={`${otherStar.x}%`}
                                                y2={`${otherStar.y}%`}
                                                stroke="#10B981"
                                                strokeWidth="0.5"
                                                strokeOpacity={0.2 - (distance / 75)}
                                                initial={{ pathLength: 0 }}
                                                animate={{
                                                    pathLength: [0, 1, 0],
                                                    strokeOpacity: [0.1, 0.3, 0.1]
                                                }}
                                                transition={{
                                                    duration: 8 + Math.random() * 4,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                    delay: Math.random() * 3
                                                }}
                                            />
                                        );
                                    }
                                    return null;
                                })
                            )}

                            {/* Star nodes */}
                            {stars.map((star, i) => (
                                <motion.circle
                                    key={`star-${i}`}
                                    cx={`${star.x}%`}
                                    cy={`${star.y}%`}
                                    r={star.size}
                                    fill="#10B981"
                                    filter="url(#glow)"
                                    animate={{
                                        opacity: [0.3, 0.9, 0.3],
                                        scale: [0.8, 1.2, 0.8]
                                    }}
                                    transition={{
                                        duration: 3 + Math.random() * 2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: Math.random() * 2
                                    }}
                                />
                            ))}
                        </>
                    );
                })()}
            </svg>

            {/* Enhanced floating particles */}
            <AmbientDust count={50} opacity={0.4} />

            {/* Grid texture */}
            <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px'
                }}
            />

            {/* Radial glow behind Orb */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)'
                    }}
                />
            </div>

            {/* Main content - PERFECTLY CENTERED */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            >
                {/* LARGE CENTRAL ORB */}
                <motion.div
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                    style={{
                        top: '50%',
                        left: 'calc(50% - 139px)' // Visual center accounting for 72px left sidebar + 350px right panel
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                >
                    <div className="relative flex flex-col items-center">
                        {/* Outer breathing ring */}
                        <motion.div
                            className="absolute rounded-full"
                            style={{
                                width: 300,
                                height: 300,
                                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2), transparent 70%)',
                                filter: 'blur(30px)'
                            }}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 0.8, 0.5]
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: 'easeInOut'
                            }}
                        />

                        {/* Core orb - BIGGER */}
                        <div
                            className="relative rounded-full border-2 border-emerald-500/40"
                            style={{
                                width: 220,
                                height: 220,
                                background: 'radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.5), rgba(16, 185, 129, 0.1))',
                                boxShadow: `
                                    0 0 80px rgba(16, 185, 129, 0.5),
                                    inset 0 0 60px rgba(16, 185, 129, 0.3)
                                `
                            }}
                        >
                            {/* Inner light spot */}
                            <div
                                className="absolute top-10 left-10 w-16 h-16 rounded-full"
                                style={{
                                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.7), transparent)',
                                    filter: 'blur(12px)'
                                }}
                            />
                        </div>

                        {/* MÔRA Label - Bigger & Clearer */}
                        <motion.div
                            className="mt-8 text-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                        >
                            <h1 className="text-4xl font-light tracking-[0.3em] text-emerald-50/90 uppercase mb-1">
                                MÔRA
                            </h1>
                            <p className="text-sm text-emerald-500/60 tracking-[0.25em] uppercase font-mono">
                                SAIMÔR
                            </p>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Departments in circle around Orb - NEW ORBIT SYSTEM */}
                {visibleDepartments.length > 0 ? (
                    <CompanyOrbit
                        center={visualCenter}
                        radius={orbitRadius}
                        onDepartmentSelect={(deptId) => {
                            console.log('🎯 Department selected:', deptId);
                        }}
                    />
                ) : (
                    <motion.div
                        className="flex flex-col items-center gap-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        <span className="text-xs text-emerald-500/50 font-mono tracking-widest uppercase">
                            Loading Departments...
                        </span>
                    </motion.div>
                )}

                {/* Bottom status */}
                <motion.div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <div className="flex items-center gap-4 text-[10px] text-emerald-500/25 font-mono tracking-widest">
                        <span>CORE :: {visibleDepartments.length} DEPARTMENTS</span>
                        <span>•</span>
                        <span>SYSTEM ACTIVE</span>
                    </div>
                </motion.div>
            </motion.div>

            {/* Orb rendered by MoraOrbController globally */}
        </div>
    );
};

export default CompanyCoreView;
