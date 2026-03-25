'use client';

import React from 'react';
import { Settings2, X } from 'lucide-react';
import { useContextStore } from '@/lib/store/contextStore';
import { AdminRosterView } from './AdminRosterView';

/**
 * AdminHome -- the admin OS surface (spec Section 2, Surface C).
 *
 * Renders when isAdminMode === true. Fully replaces the main content area.
 * Previous context (personal or company) is suspended, not destroyed.
 * The cosmic universe visually recedes -- this is the operational context.
 *
 * Phase 2 MVC: roster view + membership/visibility management.
 * AdminRosterView is wired in Chunk 3 Task 3.3 once it exists.
 */
export const AdminHome: React.FC = () => {
    const setAdminMode = useContextStore((s) => s.setAdminMode);

    return (
        <div className="flex flex-col h-full bg-[#07090f] text-white overflow-hidden">
            {/* Admin mode indicator -- always visible */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-amber-500/5">
                <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">Admin-Modus</span>
                    <span className="text-xs text-white/30">-- Du verwaltest das OS</span>
                </div>
                <button
                    onClick={() => setAdminMode(false)}
                    title="Admin verlassen"
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                    <X size={14} />
                    Verlassen
                </button>
            </div>

            {/* Main admin content */}
            <div className="flex-1 overflow-y-auto p-6">
                <AdminRosterView />
            </div>
        </div>
    );
};
