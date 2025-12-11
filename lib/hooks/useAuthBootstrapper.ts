import { useEffect, useState } from 'react';
import { corePost } from '@/lib/api/coreClient';

/**
 * useAuthBootstrapper
 * 
 * Automatically ensures a valid Saimor Core session exists in Development Mode.
 * If no token is found, it calls the dev-token endpoint.
 */
export function useAuthBootstrapper() {
    const [isBootstrapped, setIsBootstrapped] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        // Only run in browser
        if (typeof window === 'undefined') return;

        const bootstrap = async () => {
            // Check if we already have a token in cookies or localStorage
            const hasCookie = document.cookie.includes('saimor_auth');
            const hasLocalToken = localStorage.getItem('saimor_dev_token');

            if (hasCookie || hasLocalToken) {
                console.log('[AuthBootstrapper] Token found, skipping bootstrap.');
                setIsBootstrapped(true);
                return;
            }

            // If strictly production, do not auto-login (security)
            // But for this project, "production" might still be a demo deployment.
            // We'll rely on the backend endpoint availability.

            console.log('[AuthBootstrapper] No token found. Attempting to fetch DEV token...');

            try {
                // Call basic request to get a dev token
                const res = await corePost('/v1/auth/dev-token', {}, { skipAuth: true });

                if (res && res.token) {
                    console.log('[AuthBootstrapper] Dev token received:', res.user_id);
                    localStorage.setItem('saimor_dev_token', res.token);
                    // Force a reload or just set state? 
                    // Setting state is better to avoid refresh loops.
                    setIsBootstrapped(true);

                    // Trigger a custom event so coreClient can update if needed (optional)
                    window.dispatchEvent(new Event('saimor-auth-updated'));
                } else {
                    throw new Error('No token in response');
                }
            } catch (err: any) {
                console.warn('[AuthBootstrapper] Failed to bootstrap auth:', err.message);
                setAuthError(err.message);
                // We mark as bootstrapped anyway so the app can try to render (maybe fallback to mocks)
                setIsBootstrapped(true);
            }
        };

        bootstrap();
    }, []);

    return { isBootstrapped, authError };
}
