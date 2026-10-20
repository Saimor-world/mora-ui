'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNavStore } from '@/lib/store/navStore';

/** Phone Companion breakpoint — matches UniverseControls / existing OS phone gate. */
export const PREVIEW_PHONE_MAX_WIDTH = 767;
export const BEGLEITER_DEMO_HREF = '/begleiter?demo=1';
export const PREVIEW_PHONE_MQ = `(max-width: ${PREVIEW_PHONE_MAX_WIDTH}px)`;

export function isPreviewOsMode(mode: string | null | undefined): boolean {
    return mode === 'visitor' || mode === 'private_preview';
}

function readIsPhone(): boolean | null {
    if (typeof window === 'undefined') return null;
    if (typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(PREVIEW_PHONE_MQ).matches;
}

/**
 * On the phone, preview / visitor Saimôr OS is only the Companion.
 * Desktop Home stays as-is; this hook never restyles Begleiter.
 */
export function usePreviewPhoneCompanion(): { handoff: boolean } {
    const router = useRouter();
    const activeMode = useNavStore((s) => s.activeMode);
    const preview = isPreviewOsMode(activeMode);
    const [isPhone, setIsPhone] = useState<boolean | null>(null);

    useEffect(() => {
        const current = readIsPhone();
        setIsPhone(current);
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
        const mq = window.matchMedia(PREVIEW_PHONE_MQ);
        const onChange = () => setIsPhone(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        if (!preview || !isPhone) return;
        router.replace(BEGLEITER_DEMO_HREF);
    }, [preview, isPhone, router]);

    return { handoff: preview && isPhone !== false };
}
