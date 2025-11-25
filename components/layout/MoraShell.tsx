"use client";

import React from 'react';
import { Toaster } from 'sonner';
import { MyceliumOverlay } from '@/components/organic/MyceliumOverlay';
import { ViewPort } from './ViewPort';
import { ChatDock } from '@/components/ui/ChatDock';
import { TreeSidebar } from '@/components/sidebar/TreeSidebar';
import { NodeDetailPanel } from '@/components/organic/NodeDetailPanel';

export const MoraShell: React.FC = () => {
    return (
        <div className="relative w-full h-screen overflow-hidden bg-mora-forest text-emerald-50 font-sans selection:bg-mora-gold/30">
            {/* Mycelium Neural Layer - Living Knowledge Network */}
            <MyceliumOverlay />

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

            {/* Node Detail Panel (slide-in from right) */}
            <NodeDetailPanel />

            {/* Toast Notifications */}
            <Toaster />
        </div>
    );
};
