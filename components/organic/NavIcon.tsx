"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface NavIconProps {
    icon: LucideIcon;
    active?: boolean;
    activeColor?: string;
    label?: string;
    onClick?: () => void;
}

export const NavIcon: React.FC<NavIconProps> = ({
    icon: Icon,
    active,
    activeColor = 'text-mora-gold',
    label = 'View',
    onClick
}) => (
    <button
        onClick={onClick}
        className={`group relative flex items-center justify-center w-12 h-12 cursor-pointer transition-all duration-300 hover:scale-110 ${active ? 'scale-105' : ''}`}
    >
        {active && <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-mora-gold rounded-r-full shadow-[0_0_10px_#CEB676]`}></div>}
        <Icon className={`w-5 h-5 transition-colors ${active ? activeColor : 'text-emerald-500/50 group-hover:text-emerald-100'}`} />
        <div className="absolute left-full ml-4 px-3 py-1 bg-mora-forest border border-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 text-xs tracking-wider text-emerald-100">
            {label}
        </div>
    </button>
);
