'use client';

import React, { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';

interface BootSequenceProps {
    onComplete: () => void;
}

const BOOT_STEPS = [
    "INITIALIZING KERNEL...",
    "LOADING MYCELIUM DRIVERS...",
    "CONNECTING TO MORA NEURAL NET...",
    "ESTABLISHING SECURE HANDSHAKE...",
    "MOUNTING DATA SOURCES...",
    "SYSTEM ONLINE"
];

export function BootSequence({ onComplete }: BootSequenceProps) {
    const [step, setStep] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (step < BOOT_STEPS.length) {
            const timeout = setTimeout(() => {
                setStep(s => s + 1);
                setProgress((step + 1) / BOOT_STEPS.length * 100);
            }, 600);
            return () => clearTimeout(timeout);
        } else {
            const timeout = setTimeout(onComplete, 800);
            return () => clearTimeout(timeout);
        }
    }, [step, onComplete]);

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center font-mono animate-in fade-in duration-500">
            <div className="w-96 max-w-[90%]">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8 animate-in slide-in-from-top duration-700">
                    <div className="relative">
                        <div className="w-3 h-3 bg-mora-gold rounded-full animate-pulse shadow-[0_0_10px_#CEB676]" />
                        <div className="absolute inset-0 w-3 h-3 bg-mora-gold rounded-full animate-ping opacity-30" />
                    </div>
                    <span className="text-mora-gold tracking-[0.3em] text-xs font-bold">
                        SAIMOR BIOS v1.0
                    </span>
                </div>

                {/* Boot Steps */}
                <div className="space-y-2 mb-8">
                    {BOOT_STEPS.map((stepText, i) => (
                        <div
                            key={i}
                            className={`text-xs transition-all duration-300 ${i <= step
                                    ? 'opacity-100 translate-x-0'
                                    : 'opacity-0 -translate-x-4'
                                } ${i === step
                                    ? 'text-emerald-200'
                                    : i < step
                                        ? 'text-emerald-800'
                                        : 'text-transparent'
                                }`}
                            style={{ transitionDelay: `${i * 100}ms` }}
                        >
                            {i <= step && (
                                <span className="mr-2 text-mora-gold">
                                    {i === step ? '>' : '✓'}
                                </span>
                            )}
                            {stepText}
                        </div>
                    ))}
                </div>

                {/* Progress Bar */}
                <div className="relative h-1 w-full bg-emerald-900/30 rounded-full overflow-hidden">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-mora-gold via-emerald-400 to-mora-gold transition-all duration-500 ease-out shadow-[0_0_10px_#CEB676]"
                        style={{ width: `${progress}%` }}
                    />
                    {/* Scanning effect */}
                    <div
                        className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_ease-in-out_infinite]"
                        style={{ left: `${Math.max(0, progress - 20)}%` }}
                    />
                </div>

                {/* Progress Percentage */}
                <div className="mt-4 text-right text-[10px] text-emerald-500/70 tracking-widest">
                    {Math.round(progress)}% COMPLETE
                </div>
            </div>

            {/* Background Grid */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `
            linear-gradient(#1F4D43 1px, transparent 1px),
            linear-gradient(90deg, #1F4D43 1px, transparent 1px)
          `,
                    backgroundSize: '50px 50px'
                }} />
            </div>
        </div>
    );
}
