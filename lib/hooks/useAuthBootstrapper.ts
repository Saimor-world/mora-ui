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
                setIsBootstrapped(true);
                return;
            }

            try {
                // Call basic request to get a dev token
                const res = await corePost('/v1/auth/dev-token', {}, { skipAuth: true });

                if (res && res.token) {
                    localStorage.setItem('saimor_dev_token', res.token);
                    setIsBootstrapped(true);
                    window.dispatchEvent(new Event('saimor-auth-updated'));
                } else {
                    throw new Error('No token in response');
                }
            } catch (err: any) {
                setAuthError(err.message);
                // Mark as bootstrapped anyway so the app can try to render with mocks
                setIsBootstrapped(true);
            }
        };

        bootstrap();
    }, []);

    return { isBootstrapped, authError };
}
