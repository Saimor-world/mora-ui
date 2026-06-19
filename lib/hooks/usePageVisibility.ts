'use client';

import { useEffect, useState } from 'react';

/** True when the document tab is visible — use to pause rAF loops and polling. */
export function usePageVisibility(): boolean {
    const [visible, setVisible] = useState(
        typeof document === 'undefined' ? true : !document.hidden,
    );

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const onChange = () => setVisible(!document.hidden);
        document.addEventListener('visibilitychange', onChange);
        return () => document.removeEventListener('visibilitychange', onChange);
    }, []);

    return visible;
}
