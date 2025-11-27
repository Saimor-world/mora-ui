"use client";

import React, { useEffect, useState } from 'react';
import { MoraOrb } from '@/components/organic/MoraOrb';
import { useMoraStore } from '@/lib/store/moraState';
import { Users, Shield, Zap, Database, Globe, AlertTriangle, Network } from 'lucide-react';
import { Mycelium25D } from '@/components/organic/Mycelium25D';
import { mapDepartmentsToMycelium } from '@/lib/utils/myceliumDataMapper';

// Map icons based on name or some logic, fallback to Globe
const getIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('engineer')) return Database;
    if (lower.includes('design')) return Zap;
    if (lower.includes('ops')) return Shield;
    if (lower.includes('product')) return Users;
    return Globe;
};

// Helper to position satellites in a circle
const getPositionStyle = (index: number, total: number, radius: number = 240) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { transform: `translate(${x}px, ${y}px)` };
};

export const CoreLayer: React.FC = () => {
    const {
        departments,
        isLoadingDepartments,
        coreError,
        loadDepartments,
        navigateToDepartment,
        activeDepartmentId
    } = useMoraStore();

    const [view3D, setView3D] = useState(true); // Default to 3D

    useEffect(() => {
        // Load if empty
        if (departments.length === 0) {
            loadDepartments();
        }
    }, [departments.length, loadDepartments]);

    return (
        <div className="relative w-full h-full flex items-center justify-center">

            {/* View Toggle Button */}
            {!isLoadingDepartments && departments.length > 0 && (
                <button
                    onClick={() => setView3D(!view3D)}
                    className={`absolute top-8 right-8 z-30 p-3 rounded-full glass-panel border transition-all ${
                        view3D
                            ? 'border-mora-gold/50 bg-mora-gold/10 text-mora-gold'
                            : 'border-white/10 text-emerald-400 hover:border-emerald-400/50'
                    }`}
                    title={view3D ? '2D Classic View' : '2.5D Mycelium View'}
                >
                    <Network className="w-5 h-5" />
                </button>
            )}

            {/* 2.5D Mycelium View */}
            {view3D && !isLoadingDepartments && departments.length > 0 && (
                <div className="absolute inset-0">
                    <Mycelium25D
                        nodes={mapDepartmentsToMycelium(departments, activeDepartmentId)}
                        onNodeClick={(deptId) => navigateToDepartment(deptId)}
                        activeNodeId={activeDepartmentId}
                        variant="department"
                    />

                    {/* Central Mora Orb Overlay */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                        <div className="scale-75">
                            <MoraOrb state="idle" />
                        </div>
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center w-64">
                            <h1 className="text-2xl font-light tracking-[0.2em] text-emerald-50">MÔRA</h1>
                            <p className="text-[10px] text-emerald-400/50 tracking-widest mt-1 uppercase">
                                CORE SYSTEM ONLINE
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Classic 2D View */}
            {!view3D && (
                <>
                    {/* Central Mora Orb */}
                    <div className="relative z-20 scale-125">
                        <MoraOrb state={isLoadingDepartments ? 'processing' : 'idle'} />
                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center w-96">
                            <h1 className="text-3xl font-light tracking-[0.2em] text-emerald-50">MÔRA</h1>
                            <p className="text-xs text-emerald-400/50 tracking-widest mt-2 uppercase">
                                {isLoadingDepartments ? 'CONNECTING TO CORE...' : (coreError ? 'CONNECTION ERROR' : 'CORE SYSTEM ONLINE')}
                            </p>
                            {coreError && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-red-400/80 text-xs bg-red-900/20 p-2 rounded border border-red-500/20">
                                    <AlertTriangle size={12} />
                                    <span>{coreError}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Department Satellites */}
                    {!isLoadingDepartments && departments.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {/* Orbit Ring */}
                            <div className="absolute w-[600px] h-[600px] rounded-full border border-emerald-500/10 animate-spin-slower" />

                            {departments.map((dept, i) => {
                                const Icon = getIcon(dept.name);
                                const posStyle = getPositionStyle(i, departments.length, 280); // 280px radius

                                return (
                                    <button
                                        key={dept.id}
                                        onClick={() => navigateToDepartment(dept.id)}
                                        className="absolute pointer-events-auto group flex flex-col items-center gap-3 transition-all duration-500 hover:scale-110"
                                        style={posStyle}
                                    >
                                        <div
                                            className="w-16 h-16 rounded-full glass-panel border border-white/10 flex items-center justify-center group-hover:border-mora-gold/50 transition-colors shadow-[0_0_30px_rgba(0,0,0,0.3)]"
                                            style={{ backgroundColor: `${dept.color || '#10B981'}10` }}
                                        >
                                            <Icon className="w-6 h-6 text-emerald-100/80 group-hover:text-white transition-colors" />
                                        </div>
                                        <span className="text-xs uppercase tracking-widest text-emerald-300/70 group-hover:text-mora-gold transition-colors bg-mora-forest/80 px-2 py-1 rounded-full backdrop-blur-sm">
                                            {dept.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {!isLoadingDepartments && departments.length === 0 && !coreError && (
                <div className="absolute bottom-32 text-emerald-500/50 text-sm tracking-widest">
                    NO DEPARTMENTS FOUND
                </div>
            )}
        </div>
    );
};
