/**
 * Development Token Manager
 * Automatically fetches and manages JWT tokens for local development
 */

const CORE_API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:8081';
const TOKEN_STORAGE_KEY = 'saimor_dev_token';
const TOKEN_EXPIRY_KEY = 'saimor_dev_token_expiry';

interface DevTokenResponse {
    token: string;
    tenant_id: string;
    role: string;
    expires_in: number; // seconds
}

/**
 * Fetch a new development token from the backend
 */
async function fetchDevToken(): Promise<string | null> {
    try {
        const response = await fetch(`${CORE_API_URL}/v1/auth/dev-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Failed to fetch dev token:', response.statusText);
            return null;
        }

        const data: DevTokenResponse = await response.json();

        // Store token and expiry time
        const expiryTime = Date.now() + (data.expires_in * 1000);

        if (typeof window !== 'undefined') {
            localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
            localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
        }

        console.log('✅ Dev token fetched successfully');
        return data.token;
    } catch (error) {
        console.error('Error fetching dev token:', error);
        return null;
    }
}

/**
 * Get the current token, fetching a new one if needed
 */
export async function getDevToken(): Promise<string | null> {
    if (typeof window === 'undefined') {
        // Server-side rendering - no token needed
        return null;
    }

    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    // Check if we have a valid token
    if (storedToken && storedExpiry) {
        const expiryTime = parseInt(storedExpiry, 10);
        const now = Date.now();

        // Token is still valid (with 5 minute buffer)
        if (now < expiryTime - (5 * 60 * 1000)) {
            return storedToken;
        }
    }

    // Token is missing or expired - fetch a new one
    console.log('🔄 Fetching new dev token...');
    return await fetchDevToken();
}

/**
 * Clear the stored token (for logout or testing)
 */
export function clearDevToken(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        console.log('🗑️ Dev token cleared');
    }
}

/**
 * Initialize token on app startup
 */
export async function initDevToken(): Promise<void> {
    await getDevToken();
}
