import { useState, useEffect } from 'react';

const CORE_API_URL = 'http://localhost:8081/v1'; // Or tunnel URL

export const useSaimorCore = <T>(endpoint: string, interval = 5000, token: string | null = null) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!endpoint) return;
        const fetchData = async () => {
            try {
                // In a real app, use the token. For prototype, we might mock if fetch fails.
                const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
                const res = await fetch(`${CORE_API_URL}${endpoint}`, { headers });
                if (!res.ok) throw new Error(res.statusText);
                const json = await res.json();
                setData(json);
                setError(null);
            } catch (err) {
                console.debug(`Saimor Core [${endpoint}] unavailable, using mock/cache.`);
                setError(err as Error);
                // Fallback/Mock data could be set here if needed for demo
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        const id = setInterval(fetchData, interval);
        return () => clearInterval(id);
    }, [endpoint, interval, token]);

    return { data, loading, error };
};
