'use client';

import { useEffect, useState } from 'react';

/** Phone layout below 768 px (stylebook: page margin 24 px, display 28 px). SSR-safe, starts as desktop. */
export function useIsPhone(): boolean {
    const [phone, setPhone] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia('(max-width: 767px)');
        const update = () => setPhone(mq.matches);
        update();
        mq.addEventListener?.('change', update);
        return () => mq.removeEventListener?.('change', update);
    }, []);
    return phone;
}
