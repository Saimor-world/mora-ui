"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';

/**
 * V12: Mora Greeting
 *
 * Shows a contextual greeting from Mora based on time of day.
 * Appears briefly when entering the app.
 */

const getGreeting = (name?: string) => {
    const hour = new Date().getHours();
    const displayName = name?.split(' ')[0] || 'Mensch';

    if (hour < 6) {
        return {
            greeting: `Nachtschicht, ${displayName}?`,
            subtitle: "Ich bin auch noch wach. Lass uns arbeiten."
        };
    } else if (hour < 12) {
        return {
            greeting: `Guten Morgen, ${displayName}`,
            subtitle: "Ein neuer Tag voller Möglichkeiten."
        };
    } else if (hour < 17) {
        return {
            greeting: `Guten Tag, ${displayName}`,
            subtitle: "Wie kann ich dir heute helfen?"
        };
    } else if (hour < 21) {
        return {
            greeting: `Guten Abend, ${displayName}`,
            subtitle: "Noch ein paar Dinge zu erledigen?"
        };
    } else {
        return {
            greeting: `Späte Stunde, ${displayName}`,
            subtitle: "Ich bin für dich da, solange du brauchst."
        };
    }
};

export const MoraGreeting: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const user = useMoraStore((s) => s.user);
    const viewMode = useMoraStore((s) => s.viewMode);

    useEffect(() => {
        // Check if we should show greeting
        const lastGreeting = sessionStorage.getItem('saimor_last_greeting');
        const now = Date.now();

        // Show greeting once per session (or after 30 min)
        if (!lastGreeting || now - parseInt(lastGreeting) > 30 * 60 * 1000) {
            const timer = setTimeout(() => {
                setIsVisible(true);
                sessionStorage.setItem('saimor_last_greeting', now.toString());

                // Auto-hide after 4 seconds
                setTimeout(() => setIsVisible(false), 4000);
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, []);

    const { greeting, subtitle } = getGreeting(user?.name);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] pointer-events-none"
                >
                    <div className="relative bg-black/70 backdrop-blur-2xl border border-emerald-500/20 rounded-2xl px-8 py-5 shadow-2xl">
                        {/* Glow */}
                        <div className="absolute -inset-2 bg-emerald-500/10 rounded-3xl blur-2xl -z-10" />

                        {/* Mora Icon */}
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                                <Sparkles size={16} className="text-emerald-400" />
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-400/60 font-bold">
                                Mora
                            </span>
                            {viewMode === 'demo' && (
                                <span className="text-[9px] px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400">
                                    Demo
                                </span>
                            )}
                        </div>

                        {/* Greeting */}
                        <h2 className="text-xl font-light text-white mb-1">
                            {greeting}
                        </h2>
                        <p className="text-sm text-white/50">
                            {subtitle}
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MoraGreeting;
