"use client";

import React from 'react';
import { OrganicBackground } from '@/components/organic/OrganicBackground';
import { ViewPort } from './ViewPort';

export const MoraShell: React.FC = () => {
    return (
        <div className="relative w-full h-screen overflow-hidden bg-mora-forest text-emerald-50 font-sans selection:bg-mora-gold/30">
            {/* Global Background Layer */}
            <div className="absolute inset-0 z-0">
                <OrganicBackground intensity={1} />
            </div>

            {/* Main ViewPort Layer */}
            <div className="relative z-10 w-full h-full">
                <ViewPort />
            </div>

            {/* Global UI Overlays (Chat, Nav, etc. - placeholders for now) */}
            <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none">
                {/* ChatDock placeholder */}
            </div>
        </div>
    );
};
