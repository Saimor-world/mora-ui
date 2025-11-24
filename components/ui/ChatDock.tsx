"use client";

import React, { useState } from 'react';
import { OrganicInput } from '@/components/organic/OrganicInput';
import { MessageSquareText, X, Maximize2, Minimize2 } from 'lucide-react';

export const ChatDock: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Minimized Pill
    if (!isOpen) {
        return (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-3 px-4 py-2 rounded-full glass-panel border border-white/10 bg-mora-forest/80 backdrop-blur-md hover:border-mora-gold/50 transition-all shadow-lg group"
                >
                    <div className="w-2 h-2 rounded-full bg-mora-gold animate-pulse" />
                    <span className="text-xs text-emerald-100/80 tracking-widest uppercase group-hover:text-white">Môra AI</span>
                </button>
            </div>
        );
    }

    // Open Dock
    return (
        <div
            className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-500 ease-out
        ${isExpanded ? 'w-[800px] h-[600px]' : 'w-[500px] h-[300px]'}
      `}
        >
            <div className="w-full h-full rounded-3xl glass-panel border border-white/10 bg-[#050f0a]/90 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="h-12 flex items-center justify-between px-6 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-mora-gold" />
                        <span className="text-xs font-medium text-emerald-100 tracking-widest uppercase">Môra Assistant</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 rounded-full hover:bg-white/5 text-emerald-500/50 hover:text-emerald-300 transition-colors"
                        >
                            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-full hover:bg-white/5 text-emerald-500/50 hover:text-red-300 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
                    {/* Mock Messages */}
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-mora-gold/10 border border-mora-gold/20 flex items-center justify-center shrink-0">
                            <span className="text-xs text-mora-gold">M</span>
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Môra • Just now</div>
                            <p className="text-sm text-emerald-100/90 leading-relaxed">
                                I&apos;m connected to the Core. How can I help you navigate the system today?
                            </p>
                        </div>
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-black/20 border-t border-white/5">
                    <OrganicInput
                        placeholder="Ask Môra..."
                        onSend={(msg) => console.log('Chat sent:', msg)}
                    />
                </div>

            </div>
        </div>
    );
};
