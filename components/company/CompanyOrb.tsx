"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Sparkles } from 'lucide-react';
import { CoreCompany } from '@/lib/types/core';

interface CompanyOrbProps {
    company: CoreCompany;
    isActive?: boolean;
    onClick?: () => void;
}

export const CompanyOrb: React.FC<CompanyOrbProps> = ({ company, isActive, onClick }) => {
    return (
        <motion.div
            className="relative cursor-pointer group"
            onClick={onClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            {/* Outer Glow Ring */}
            <motion.div
                className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${isActive ? 'bg-mora-gold/30' : 'bg-emerald-500/10 group-hover:bg-emerald-500/20'
                    }`}
                animate={{
                    scale: isActive ? [1, 1.1, 1] : 1,
                    opacity: isActive ? [0.5, 0.8, 0.5] : 0.5
                }}
                transition={{ duration: 3, repeat: Infinity }}
            />

            {/* Main Orb Body */}
            <div className={`
                relative w-32 h-32 rounded-full backdrop-blur-md border transition-all duration-300
                flex flex-col items-center justify-center gap-2 p-4 text-center
                ${isActive
                    ? 'bg-mora-gold/10 border-mora-gold shadow-[0_0_30px_rgba(250,204,21,0.2)]'
                    : company.is_demo
                        ? 'bg-violet-950/40 border-violet-400/30 hover:border-violet-400/60 hover:bg-violet-900/40 shadow-[0_0_20px_rgba(167,139,250,0.15)]'
                        : 'bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-900/40 shadow-lg'
                }
            `}>
                {/* Icon / Logo */}
                <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-colors
                    ${isActive
                        ? 'bg-mora-gold/20 text-mora-gold'
                        : company.is_demo
                            ? 'bg-violet-500/10 text-violet-300 group-hover:text-violet-200'
                            : 'bg-emerald-500/10 text-emerald-400 group-hover:text-emerald-300'
                    }
                `}>
                    {company.is_demo ? <Sparkles size={20} /> : <Building2 size={20} />}
                </div>

                {/* Name */}
                <span className={`
                    text-xs font-medium tracking-wider uppercase transition-colors
                    ${isActive
                        ? 'text-mora-gold'
                        : company.is_demo
                            ? 'text-violet-100/80 group-hover:text-violet-50'
                            : 'text-emerald-100/80 group-hover:text-emerald-50'
                    }
                `}>
                    {company.name}
                </span>

                {/* Demo Badge */}
                {company.is_demo && (
                    <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-[9px] text-violet-300 uppercase tracking-widest shadow-[0_0_10px_rgba(167,139,250,0.2)]">
                        Demo
                    </span>
                )}
            </div>
        </motion.div>
    );
};
