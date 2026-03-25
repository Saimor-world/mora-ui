'use client';

import React from 'react';
import { Settings2, X } from 'lucide-react';
import { useContextStore } from '@/lib/store/contextStore';
import { useMoraStore } from '@/lib/store/moraState';

/**
 * AdminModeSwitcher -- Dock control for entering/exiting Admin mode.
 *
 * Spec (Section 2, Surface C):
 * - Renders only for owner/admin roles
 * - Admin mode is an OS state switch, not a navigation
 * - Exiting restores normal Universe view
 * - Always-visible exit while in admin mode
 */
export const AdminModeSwitcher: React.FC = () => {
    const user = useMoraStore((s) => s.user);
    const { isAdminMode, setAdminMode } = useContextStore();

    // Role gate -- only owner/admin can enter admin mode
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) return null;

    return (
        <button
            onClick={() => setAdminMode(!isAdminMode)}
            title={isAdminMode ? 'Admin verlassen' : 'Admin'}
            aria-label={isAdminMode ? 'Admin-Modus verlassen' : 'Admin-Modus öffnen'}
            className={[
                'w-[42px] h-[42px] flex items-center justify-center rounded-xl transition-all duration-200',
                isAdminMode
                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70',
            ].join(' ')}
        >
            {isAdminMode ? <X size={18} /> : <Settings2 size={18} />}
        </button>
    );
};
