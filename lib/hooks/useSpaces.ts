'use client';

import { useState, useEffect } from 'react';
import type { Space, SpaceCreate, SpaceUpdate, SpacesResponse } from '@/lib/types/spaces';

const API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:8081';
const TOKEN = process.env.NEXT_PUBLIC_JWT_TOKEN || '';

export function useSpaces() {
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSpaces = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/v1/spaces`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data: SpacesResponse = await res.json();
            setSpaces(data.spaces || []);
        } catch (err: any) {
            // Gracefully handle offline mode
            setError(err.message);
            setSpaces([]);
            console.warn('Spaces API offline:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const createSpace = async (space: SpaceCreate): Promise<boolean> => {
        try {
            const res = await fetch(`${API_URL}/v1/spaces`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(space)
            });

            if (res.ok) {
                await fetchSpaces();
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to create space:', err);
            return false;
        }
    };

    const updateSpace = async (spaceId: string, updates: SpaceUpdate): Promise<boolean> => {
        try {
            const res = await fetch(`${API_URL}/v1/spaces/${spaceId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                await fetchSpaces();
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to update space:', err);
            return false;
        }
    };

    const deleteSpace = async (spaceId: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_URL}/v1/spaces/${spaceId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });

            if (res.ok) {
                await fetchSpaces();
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to delete space:', err);
            return false;
        }
    };

    useEffect(() => {
        fetchSpaces().catch(() => {
            // Silent - already handled
        });
    }, []);

    return {
        spaces,
        loading,
        error,
        createSpace,
        updateSpace,
        deleteSpace,
        refresh: fetchSpaces
    };
}
