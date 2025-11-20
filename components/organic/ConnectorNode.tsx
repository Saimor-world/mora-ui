"use client";

import React, { useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

interface ConnectorNodeProps {
    icon: LucideIcon;
    label: string;
    isSelected: boolean;
    onSelect: () => void;
    delay: number;
    status?: 'idle' | 'connected';
}

const MyceliumRoot = ({ active }: { active: boolean }) => {
    if (!active) return null;
    return (
        <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-32 pointer-events-none z-0 overflow-visible">
            <defs>
                <linearGradient id="rootGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#CEB676" stopOpacity="0" />
                    <stop offset="50%" stopColor="#CEB676" stopOpacity="1" />
                    <stop offset="100%" stopColor="#CEB676" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d="M48,-20 C48,10 20,30 48,100"
                fill="none"
                stroke="url(#rootGrad)"
                strokeWidth="2"
                strokeDasharray="150"
                strokeDashoffset="150"
                className="animate-draw-root"
            />
            <path
                d="M48,-20 C48,10 70,40 48,90"
                fill="none"
                stroke="url(#rootGrad)"
                strokeWidth="1"
                strokeDasharray="150"
                strokeDashoffset="150"
                className="animate-draw-root-delayed"
                opacity="0.5"
            />
        </svg>
    );
};

export const ConnectorNode: React.FC<ConnectorNodeProps> = ({ icon: Icon, label, isSelected, onSelect, delay, status = 'idle' }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            className={`
        relative flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-700 group
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
      `}
            onClick={onSelect}
        >
            {/* Connection Root Animation */}
            <div className="absolute -top-28 w-full h-32 flex justify-center">
                <MyceliumRoot active={isSelected} />
            </div>

            <div className={`
        relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center border backdrop-blur-md transition-all duration-500
        ${isSelected
                    ? 'bg-mora-gold/10 border-mora-gold shadow-[0_0_20px_rgba(206,182,118,0.2)] scale-105'
                    : 'bg-white/5 border-white/10 group-hover:border-emerald-500/50 group-hover:bg-white/10'}
      `}>
                <Icon className={`w-6 h-6 transition-colors ${isSelected ? 'text-mora-gold' : 'text-emerald-100 group-hover:text-emerald-300'}`} />

                {/* Status Indicator */}
                {status === 'connected' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-[#0E1F18]"></div>
                )}
            </div>
            <span className={`relative z-10 text-xs tracking-widest uppercase transition-colors duration-300 ${isSelected ? 'text-mora-gold' : 'text-emerald-200/50'}`}>
                {label}
            </span>
        </div>
    );
};
