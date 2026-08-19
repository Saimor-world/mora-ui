"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Sparkles, Sliders, ArrowUpRight } from 'lucide-react';

export function EstateMorphDeck() {
    return (
        <div className="fixed top-4 right-6 z-40 flex items-center gap-1.5 p-1 rounded-full border border-white/12 bg-black/60 backdrop-blur-2xl shadow-2xl">
            <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold shadow-inner border border-white/20"
                title="Saimôr OS – Organisations-Zentrale"
            >
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <span>OS</span>
            </button>

            <a
                href="https://yori.saimor.world"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 text-xs transition-colors"
                title="YORI – Creator Studio öffnen"
            >
                <span>YORI</span>
                <ArrowUpRight size={11} className="opacity-60" />
            </a>

            <a
                href="https://dash.saimor.world"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 text-xs transition-colors"
                title="Saimôr Desk – Operator Command Desk öffnen"
            >
                <span>Desk</span>
                <ArrowUpRight size={11} className="opacity-60" />
            </a>
        </div>
    );
}
