'use client';

import { useSessionStore } from '@/lib/store/sessionStore';
import { isSaimorInternal } from '@/lib/auth/organization';

/** Session-bound version of isSaimorInternal (see lib/auth/organization). */
export function useIsSaimorInternal(): boolean {
    return useSessionStore((state) => isSaimorInternal(state.user));
}
