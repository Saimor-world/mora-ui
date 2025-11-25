"use client";

import React from 'react';

interface LoadingStateProps {
    message?: string;
    className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
    message = "Loading...",
    className = ""
}) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
            {/* Single unified pulse animation */}
            <div className="relative w-12 h-12 flex items-center justify-center">
                {/* Unified glow + core - single 3s pulse */}
                <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse"
                    style={{ animationDuration: '3s' }} />

                <div className="w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.4)] animate-pulse"
                    style={{ animationDuration: '3s' }} />
            </div>

            <p className="mt-6 text-xs text-emerald-400/60 tracking-[0.2em] uppercase font-light">
                {message}
            </p>
        </div>
    );
};
