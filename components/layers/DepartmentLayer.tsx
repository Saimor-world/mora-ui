"use client";

import React from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { ArrowLeft, Box, Layers, Grid } from 'lucide-react';

// Mock Spaces Data
const SPACES = [
    { id: 'space_alpha', name: 'Alpha Protocol', description: 'Primary directive workspace', icon: Box },
    { id: 'space_beta', name: 'Beta Lab', description: 'Experimental features', icon: Layers },
    { id: 'space_gamma', name: 'Gamma Grid', description: 'Data visualization cluster', icon: Grid },
];

export const DepartmentLayer: React.FC = () => {
    const activeDepartmentId = useMoraStore((state) => state.activeDepartmentId);
    const navigateToCore = useMoraStore((state) => state.navigateToCore);
    const navigateToSpace = useMoraStore((state) => state.navigateToSpace);

    return (
        <div className="relative w-full h-full p-10 flex flex-col">

            {/* Header / Nav */}
            <header className="flex items-center gap-6 mb-12 z-20">
                <button
                    onClick={navigateToCore}
                    className="p-3 rounded-full glass-panel border border-white/10 hover:bg-white/5 transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 text-emerald-400 group-hover:text-mora-gold transition-colors" />
                </button>
                <div>
                    <h2 className="text-2xl font-light text-emerald-50 tracking-widest uppercase">
                        {activeDepartmentId?.replace('dept_', '') || 'Department'}
                    </h2>
                    <p className="text-xs text-emerald-400/50 tracking-[0.2em]">SECTOR VIEW</p>
                </div>
            </header>

            {/* Spaces Grid (Galaxy View Placeholder) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full z-20">
                {SPACES.map((space) => (
                    <button
                        key={space.id}
                        onClick={() => navigateToSpace(space.id)}
                        className="group relative p-8 rounded-3xl glass-panel border border-white/5 hover:border-mora-gold/30 transition-all duration-500 hover:bg-white/[0.02] text-left flex flex-col gap-4 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="w-12 h-12 rounded-2xl bg-emerald-900/30 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <space.icon className="w-6 h-6 text-emerald-300 group-hover:text-mora-gold transition-colors" />
                        </div>

                        <div>
                            <h3 className="text-lg font-medium text-emerald-100 group-hover:text-white transition-colors">
                                {space.name}
                            </h3>
                            <p className="text-sm text-emerald-400/60 mt-1 group-hover:text-emerald-300/70 transition-colors">
                                {space.description}
                            </p>
                        </div>

                        <div className="mt-auto flex items-center gap-2 text-xs text-emerald-500/50 uppercase tracking-widest group-hover:text-mora-gold/70 transition-colors">
                            <span>Enter Space</span>
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </button>
                ))}
            </div>

        </div>
    );
};
