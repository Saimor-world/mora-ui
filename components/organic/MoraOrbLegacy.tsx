"use client";

import React from 'react';

interface MoraOrbProps {
    state: 'idle' | 'speaking' | 'processing' | 'listening';
    scale?: number;
}

export const MoraOrb: React.FC<MoraOrbProps> = ({ state, scale = 1 }) => {
    return (
        <div
            className="relative flex items-center justify-center transition-all duration-1000 ease-out"
            style={{ transform: `scale(${scale})` }}
        >
            {/* Outer Halo - Breathing */}
            <div className={`
        absolute w-64 h-64 rounded-full blur-3xl transition-all duration-1000 
        ${state === 'processing' ? 'opacity-40 bg-emerald-400 scale-110' :
                    state === 'speaking' ? 'opacity-50 bg-[#CEB676] scale-105' :
                        'opacity-20 bg-emerald-900 scale-100'}
      `}></div>

            {/* Middle Aura - Spinning */}
            <div className={`
        absolute w-48 h-48 rounded-full border border-emerald-500/10 
        bg-gradient-to-b from-emerald-900/20 to-transparent backdrop-blur-sm
        transition-all duration-1000
        ${state === 'processing' ? 'animate-spin-slow border-emerald-500/30' : 'animate-pulse-slow'}
      `}></div>

            {/* Core Orb */}
            <div className={`
        relative w-32 h-32 rounded-full 
        bg-gradient-to-br from-[#1a3329] to-[#0E1F18] 
        border 
        shadow-[0_0_30px_rgba(206,182,118,0.15)]
        flex items-center justify-center
        overflow-hidden
        transition-all duration-700
        ${state === 'speaking' ? 'border-[#CEB676]/60 shadow-[0_0_50px_rgba(206,182,118,0.4)]' : 'border-[#CEB676]/30'}
        ${state === 'processing' ? 'scale-95' : 'scale-100'}
      `}>
                {/* Liquid Texture inside Orb */}
                <div className="absolute inset-0 opacity-50 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

                {/* Inner Flow */}
                <div className={`
          absolute w-full h-full bg-gradient-to-t from-emerald-500/20 to-transparent 
          transition-transform duration-3000 
          ${state === 'processing' ? 'animate-spin-fast' : 'animate-spin-slow'}
        `}></div>

                {/* Core Light (The "Eye") */}
                <div className={`
          w-8 h-8 bg-[#CEB676] rounded-full blur-md transition-all duration-500 
          ${state === 'speaking' ? 'opacity-90 scale-150' :
                        state === 'processing' ? 'opacity-60 scale-75 animate-pulse' :
                            'opacity-40 scale-100'}
        `}></div>
            </div>

            {/* Orbiting Particles - The "Electrons" */}
            <div className="absolute w-40 h-40 border border-white/5 rounded-full animate-spin-reverse-slow"></div>
            <div className="absolute w-56 h-56 border border-white/5 rounded-full animate-spin-slower"></div>
        </div>
    );
};
