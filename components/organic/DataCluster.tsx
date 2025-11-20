"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DataClusterProps {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
    label: string;
    delay: number;
    icon?: LucideIcon;
}

export const DataCluster: React.FC<DataClusterProps> = ({ top, left, right, bottom, label, delay, icon: Icon }) => (
    <div
        className="absolute flex items-center gap-3 animate-float"
        style={{ top, left, right, bottom, animationDelay: `${delay}s` }}
    >
        <div className="relative">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-full border border-emerald-500/30 backdrop-blur-sm flex items-center justify-center">
                {Icon ? <Icon className="w-3 h-3 text-mora-gold" /> : <div className="w-2 h-2 bg-mora-gold rounded-full"></div>}
            </div>
            <div className="absolute inset-0 bg-emerald-500/10 blur-md rounded-full animate-pulse"></div>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-emerald-500/80 bg-mora-forest/80 px-2 py-1 rounded border border-white/5 backdrop-blur-sm">
            {label}
        </span>
    </div>
);
