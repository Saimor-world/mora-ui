import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { coreGet } from '@/lib/api/coreClient';

/**
 * useAuthBootstrapper
 * 
 * Ensures a valid session exists. If not authenticated, redirects to login.
 * NO MORE AUTO DEV-TOKENS - Real authentication required!
 */
export function useAuthBootstrapper() {
    const router = useRouter();
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
                try {
                    // Verify token validity
                    const result = await coreGet('/v1/auth/me');
                    if (result && result.user_id) {
                        setIsBootstrapped(true);
                        return;
                    }
                } catch (err) {
                    // Token validation failed - clear tokens
                    console.log('Token validation failed, clearing...');
                }

                // Token was invalid - clear it
                localStorage.removeItem('saimor_dev_token');
                document.cookie = 'saimor_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
            }

            // NO TOKEN OR INVALID TOKEN -> Redirect to login
            setAuthError('Authentication required');
            router.push('/login');
        };

        bootstrap();
    }, [router]);

    return { isBootstrapped, authError };
}
