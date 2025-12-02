"use client";

import React, { useEffect, useState } from 'react';
import { MoraOrb } from './MoraOrb';
import { fetchAwarenessPulse, type OrbState } from '@/lib/api/awarenessClient';
import { useUser } from '@/lib/hooks/useUser';

/**
 * MoraOrbController
 *
 * Smart wrapper for MoraOrb that:
 * - Fetches awareness state from backend
 * - Polls every 10 seconds for updates
 * - Handles role-based display
 * - Syncs with user context (demo mode, role)
 */

export const MoraOrbController: React.FC = () => {
    const { role, demoMode, isLoading: userLoading } = useUser();
    const [orbState, setOrbState] = useState<OrbState>('idle');
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Don't poll until user is loaded
        if (userLoading) return;

        const loadAwareness = async () => {
            try {
                const pulse = await fetchAwarenessPulse();
                setOrbState(pulse.state);
                setIsInitialized(true);
            } catch (error) {
                console.error('Failed to fetch awareness pulse:', error);
                // Keep last known state on error
                setIsInitialized(true);
            }
        };

        // Initial load
        loadAwareness();

        // Poll every 10 seconds
        const interval = setInterval(loadAwareness, 10000);

        return () => clearInterval(interval);
    }, [userLoading]);

    // Don't render until initialized to avoid flash
    if (!isInitialized || userLoading) return null;

    // Map role to orb role type
    const orbRole = role === 'admin' || role === 'owner' ? 'admin' : role === 'manager' ? 'manager' : 'member';

    return (
        <MoraOrb
            role={orbRole}
            state={orbState}
            demoMode={demoMode}
        />
    );
};
