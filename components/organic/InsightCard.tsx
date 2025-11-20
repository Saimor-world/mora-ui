"use client";

import React from 'react';

interface InsightCardProps {
    title: string;
    body: string;
    type: 'success' | 'alert';
}

export const InsightCard: React.FC<InsightCardProps> = ({ title, body, type }) => (
    <div className="group p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-mora-gold/30 transition-all cursor-pointer">
        <div className="flex items-start gap-3">
            <div className={`mt-1 w-1.5 h-1.5 rounded-full ${type === 'alert' ? 'bg-orange-400 shadow-[0_0_8px_orange]' : 'bg-emerald-400 shadow-[0_0_8px_emerald]'}`}></div>
            <div>
                <h4 className="text-sm font-medium text-emerald-100 mb-1 group-hover:text-mora-gold transition-colors">{title}</h4>
                <p className="text-xs text-emerald-500/70 leading-relaxed">{body}</p>
            </div>
        </div>
    </div>
);
