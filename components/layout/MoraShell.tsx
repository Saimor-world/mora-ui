"use client";

import React from 'react';
import { OrganicBackground } from '@/components/organic/OrganicBackground';
import { ViewPort } from './ViewPort';
import { ChatDock } from '@/components/ui/ChatDock';
import { TreeSidebar } from '@/components/sidebar/TreeSidebar';

export const MoraShell: React.FC = () => {
    return (
        <div className="relative w-full h-screen overflow-hidden bg-mora-forest text-emerald-50 font-sans selection:bg-mora-gold/30">
            {/* Global Background Layer */}
            <div className="absolute inset-0 z-0">
                <OrganicBackground intensity={1} />
            </div>

            {/* Main Content Area with Sidebar */}
            <div className="relative z-10 w-full h-full flex">
                {/* Tree Sidebar */}
                <TreeSidebar />

                {/* Main ViewPort Layer */}
                <div className="flex-1 h-full">
                    <ViewPort />
                </div>
            </div>

            {/* Global UI Overlays */}
            <ChatDock />
        </div>
    );
};
