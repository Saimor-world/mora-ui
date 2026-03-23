'use client';

import React from 'react';
import { Home, Building2 } from 'lucide-react';
import { useContextStore } from '@/lib/store/contextStore';

/**
 * ContextSwitcher -- Personal <-> Company navigation axis.
 *
 * Renders in the Dock. One button, one gesture.
 * Company is the default (Universe primary). Personal is always accessible.
 *
 * Visual form is intentionally minimal (Phase 1 MVC).
 * The exact visual design is an open decision per the spec (Section 10, item 3).
 */
export const ContextSwitcher: React.FC = () => {
    const { osContext, toggleContext } = useContextStore();
    const isPersonal = osContext === 'personal';

    return (
        <button
            onClick={toggleContext}
            title={isPersonal ? 'Unternehmen' : 'Mein Bereich'}
            aria-label={isPersonal ? 'Zum Unternehmens-Universum wechseln' : 'Zum persönlichen Bereich wechseln'}
            className={[
                'w-[42px] h-[42px] flex items-center justify-center rounded-xl transition-all duration-200',
                isPersonal
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70',
            ].join(' ')}
        >
            {isPersonal ? <Building2 size={18} /> : <Home size={18} />}
        </button>
    );
};
