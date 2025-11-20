"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface RoleCardProps {
    role: string;
    icon: LucideIcon;
    desc: string;
    onSelect: () => void;
    onHover: (role: string | null) => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({ role, icon: Icon, desc, onSelect, onHover }) => (
    <button
        onClick={onSelect}
        onMouseEnter={() => onHover(role)}
        onMouseLeave={() => onHover(null)}
        className="group relative w-48 h-64 rounded-2xl border border-white/5 bg-mora-forest/40 backdrop-blur-xl flex flex-col items-center justify-center gap-4 transition-all duration-500 hover:-translate-y-2 hover:border-mora-gold/30 hover:bg-mora-gold/5 shadow-lg"
    >
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-mora-gold/20 transition-colors">
            <Icon className="w-6 h-6 text-emerald-200 group-hover:text-mora-gold" />
        </div>
        <div className="text-center">
            <h3 className="text-emerald-100 font-medium tracking-wide uppercase text-sm mb-2">{role}</h3>
            <p className="text-xs text-emerald-500/60 px-4">{desc}</p>
        </div>
    </button>
);
