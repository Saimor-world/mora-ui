'use client';

import React from 'react';
import { Building2, X } from 'lucide-react';
import { useContextStore } from '@/lib/store/contextStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { useNavStore } from '@/lib/store/navStore';

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
    const user = useSessionStore((s) => s.user);
    const { isAdminMode, setAdminMode } = useContextStore();
    const surfaceProfile = useSurfaceProfile();
    const isStandardMode = useNavStore((state) => state.isStandardMode);

    // Role gate -- only owner/admin can enter admin mode
    if (!user || !['owner', 'system_owner', 'admin'].includes(user.role)) return null;
    if (surfaceProfile.isPublicDemoSurface) return null;

    return (
        <button
            onClick={() => setAdminMode(!isAdminMode)}
            title={isAdminMode ? 'Kunden & Administration verlassen' : 'Kunden-Vorschauen & Administration öffnen'}
            aria-label={isAdminMode ? 'Kunden & Administration verlassen' : 'Kunden-Vorschauen & Administration öffnen'}
            className={[
                'w-[42px] h-[42px] flex items-center justify-center rounded-xl transition-all duration-200',
                isAdminMode
                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                    : isStandardMode
                        ? 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70',
            ].join(' ')}
        >
            {isAdminMode ? <X size={18} /> : <Building2 size={18} />}
        </button>
    );
};
