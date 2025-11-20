"use client";

import React from 'react';
import { MoraOrb } from '@/components/organic/MoraOrb';
import { useMoraStore } from '@/lib/store/moraState';
import { Users, Shield, Zap, Database } from 'lucide-react';

// Mock Departments
const DEPARTMENTS = [
    { id: 'dept_engineering', name: 'Engineering', icon: Database, color: '#34D399', position: 'top-0 left-1/2 -translate-x-1/2 -translate-y-24' },
    { id: 'dept_design', name: 'Design', icon: Zap, color: '#F472B6', position: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-24' },
    { id: 'dept_ops', name: 'Operations', icon: Shield, color: '#60A5FA', position: 'left-0 top-1/2 -translate-y-1/2 -translate-x-24' },
    { id: 'dept_product', name: 'Product', icon: Users, color: '#FBBF24', position: 'right-0 top-1/2 -translate-y-1/2 translate-x-24' },
];

export const CoreLayer: React.FC = () => {
    const navigateToDepartment = useMoraStore((state) => state.navigateToDepartment);

    return (
        <div className="relative w-full h-full flex items-center justify-center">

            {/* Central Mora Orb */}
            <div className="relative z-20 scale-125">
                <MoraOrb state="idle" />
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center">
                    <h1 className="text-3xl font-light tracking-[0.2em] text-emerald-50">MÔRA</h1>
                    <p className="text-xs text-emerald-400/50 tracking-widest mt-2">CORE SYSTEM ONLINE</p>
                </div>
            </div>

            {/* Department Satellites */}
            <div className="absolute inset-0 max-w-4xl max-h-4xl mx-auto my-auto pointer-events-none">
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Orbit Ring */}
                    <div className="absolute w-[600px] h-[600px] rounded-full border border-emerald-500/10 animate-spin-slower" />

                    {DEPARTMENTS.map((dept) => (
                        <button
                            key={dept.id}
                            onClick={() => navigateToDepartment(dept.id)}
                            className={`absolute pointer-events-auto group flex flex-col items-center gap-3 transition-all duration-500 hover:scale-110 ${dept.position}`}
                            style={{ transformOrigin: 'center' }} // Simplified positioning for demo
                        >
                            {/* Position hack for the demo to distribute them around the center without complex math in CSS classes for now */}
                            {/* Actually, let's use absolute positioning relative to the center container */}
                            <div
                                className="w-16 h-16 rounded-full glass-panel border border-white/10 flex items-center justify-center group-hover:border-mora-gold/50 transition-colors shadow-[0_0_30px_rgba(0,0,0,0.3)]"
                                style={{ backgroundColor: `${dept.color}10` }}
                            >
                                <dept.icon className="w-6 h-6 text-emerald-100/80 group-hover:text-white transition-colors" />
                            </div>
                            <span className="text-xs uppercase tracking-widest text-emerald-300/70 group-hover:text-mora-gold transition-colors">
                                {dept.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
