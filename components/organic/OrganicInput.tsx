"use client";

import React, { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';

interface OrganicInputProps {
    onSend?: (msg: string) => void;
    placeholder?: string;
}

export const OrganicInput: React.FC<OrganicInputProps> = ({ onSend, placeholder = "Frag Môra..." }) => {
    const [input, setInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInput(val);
        if (val.endsWith('@')) {
            setShowSuggestions(true);
        } else if (val.includes(' ')) {
            setShowSuggestions(false);
        }
    };

    const addMention = (mention: string) => {
        setInput(prev => prev.slice(0, -1) + mention + ' ');
        setShowSuggestions(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && onSend) {
            onSend(input);
            setInput('');
        }
    };

    return (
        <div className="relative w-[600px]">
            {/* Suggestion Spores */}
            {showSuggestions && (
                <div className="absolute bottom-16 left-10 mb-2 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-mora-forest/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl min-w-[200px]">
                        <div className="text-[10px] uppercase text-emerald-500/50 px-3 py-1">Global Intelligence</div>
                        <button onClick={() => addMention('@Môra')} className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-mora-gold/10 transition-colors group">
                            <div className="w-4 h-4 rounded-full bg-mora-gold shadow-[0_0_10px_#CEB676] animate-pulse"></div>
                            <span className="text-mora-gold text-sm group-hover:translate-x-1 transition-transform">Môra</span>
                        </button>

                    </div>
                </div>
            )}

            {/* Main Capsule */}
            <form onSubmit={handleSubmit} className="relative h-14 glass-panel rounded-full flex items-center px-6 gap-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transform hover:-translate-y-1 transition-transform duration-300 group focus-within:border-mora-gold/30 border border-white/5 bg-mora-forest/40 backdrop-blur-xl">
                <div className={`w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center transition-all duration-500 ${input.length > 0 ? 'scale-90' : 'scale-100'}`}>
                    <Sparkles className="w-4 h-4 text-mora-gold" />
                </div>

                <input
                    type="text"
                    value={input}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-emerald-100 placeholder-emerald-500/40 font-light z-10"
                />

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        title={input.length > 0 ? "Send Message" : "Type a message first"}
                        className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                            input.length > 0
                                ? 'bg-mora-gold/30 hover:bg-mora-gold/50 scale-100'
                                : 'bg-emerald-500/10 scale-90 opacity-50'
                        }`}
                    >
                        <Send className={`w-4 h-4 ${input.length > 0 ? 'text-mora-gold' : 'text-emerald-500/30'}`} />
                    </button>
                </div>
            </form>
        </div>
    );
};
