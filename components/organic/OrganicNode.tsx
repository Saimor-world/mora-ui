'use client';

import React from 'react';
import { Folder, Share2, Sparkles, Activity } from 'lucide-react';

interface OrganicNodeProps {
    x: string | number;
    y: string | number;
    size: number;
    label: string;
    active: boolean;
    onClick: () => void;
    delay?: number;
    breathingDelay?: number;
    type?: 'default' | 'project' | 'marketing' | 'insight';
}

const NODE_ICONS = {
    default: Folder,
    project: Folder,
    marketing: Share2,
    insight: Activity
};

export function OrganicNode({
    x,
    y,
    size,
    label,
    active,
    onClick,
    delay = 0,
    breathingDelay = 0,
    type = 'default'
}: OrganicNodeProps) {

    const Icon = NODE_ICONS[type];

    return (
        <div
            onClick={onClick}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-700 ease-out z-10"
            style={{
                left: typeof x === 'number' ? `${x}%` : x,
                top: typeof y === 'number' ? `${y}%` : y,
                transitionDelay: `${delay}ms`,
            }}
        >
            {/* Organic Breathing Animation Wrapper */}
            <div
                className="animate-[pulse_4s_ease-in-out_infinite]"
                style={{ animationDelay: `${breathingDelay}s` }}
            >

                {/* Orbit Rings - Expand on active/hover */}
                <div
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-mora-gold/10 transition-all duration-1000 pointer-events-none ${active
                            ? 'w-[300px] h-[300px] opacity-100'
                            : 'w-[100px] h-[100px] opacity-0 group-hover:opacity-20 group-hover:w-[180px] group-hover:h-[180px]'
                        }`}
                />
                <div
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-mora-gold/5 transition-all duration-1000 pointer-events-none ${active
                            ? 'w-[450px] h-[450px] opacity-100'
                            : 'w-[120px] h-[120px] opacity-0 group-hover:opacity-10 group-hover:w-[240px] group-hover:h-[240px]'
                        }`}
                />

                {/* Connection Lines - Only show when active */}
                {active && (
                    <svg className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 pointer-events-none overflow-visible opacity-30">
                        <path
                            d="M400,400 Q600,200 750,250"
                            fill="none"
                            stroke="#CEB676"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                            className="animate-[draw-root_2s_ease-out_forwards]"
                        />
                        <path
                            d="M400,400 Q200,600 50,650"
                            fill="none"
                            stroke="#CEB676"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                            className="animate-[draw-root_2s_ease-out_forwards]"
                            style={{ animationDelay: '0.3s' }}
                        />
                    </svg>
                )}

                {/* The Node Itself - Organic Shape */}
                <div
                    className={`relative rounded-full flex items-center justify-center transition-all duration-500 ${active
                            ? 'scale-110 shadow-[0_0_40px_rgba(206,182,118,0.3)]'
                            : 'group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(92,141,133,0.2)]'
                        }`}
                    style={{ width: size, height: size }}
                >
                    {/* Base Layer */}
                    <div className={`absolute inset-0 rounded-full bg-[#051a16] backdrop-blur-2xl border ${active ? 'border-mora-gold' : 'border-[#1F4D43]'
                        } transition-colors duration-300`} />

                    {/* Inner Gradient Glow */}
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#1F4D43]/20 to-transparent z-10" />

                    {/* Icon */}
                    <div className={`relative z-20 transition-colors ${active ? 'text-mora-gold' : 'text-[#5C8D85] group-hover:text-mora-gold'
                        }`}>
                        <Icon size={size / 3} />
                    </div>

                    {/* Status Dot - Pulsing when active */}
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full z-20 shadow-sm transition-colors ${active
                            ? 'bg-mora-gold animate-pulse shadow-[0_0_10px_#CEB676]'
                            : 'bg-[#1F4D43] group-hover:bg-[#5C8D85]'
                        }`} />
                </div>
            </div>

            {/* Label - Scales on active */}
            <div className={`absolute top-full mt-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-center transition-all duration-300 ${active
                    ? 'translate-y-2 scale-110'
                    : 'opacity-60 group-hover:opacity-100 group-hover:translate-y-1'
                }`}>
                <h3 className={`text-sm font-medium ${active ? 'text-mora-gold' : 'text-emerald-100'}`}>
                    {label}
                </h3>
                {active && (
                    <p className="text-[10px] text-emerald-500/70 mt-1 animate-in fade-in duration-300">
                        Active Workspace
                    </p>
                )}
            </div>
        </div>
    );
}
