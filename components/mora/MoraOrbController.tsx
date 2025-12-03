"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MoraOrb } from './MoraOrb';
import { fetchAwarenessPulse, type OrbState } from '@/lib/api/awarenessClient';
import { useUser } from '@/lib/hooks/useUser';
import { useMoraStore } from '@/lib/store/moraState';

interface OrbPosition {
    position: 'center' | 'top-right' | 'bottom-right';
    scale: number;
    x: string;
    y: string;
}

/**
 * MoraOrbController (v2.0)
 *
 * Enhanced smart wrapper for MoraOrb that:
 * - Fetches awareness state from backend (polls every 10s)
 * - Handles role-based display
 * - **NEW:** Dynamic repositioning based on viewLevel
 * - **NEW:** Never disappears (persistent across all views)
 * - Syncs with user context (demo mode, role)
 *
 * Glass Pane Architecture Integration:
 * - Company/Core: Center, large (scale 1.8)
 * - Department: Top-right, medium (scale 0.6)
 * - Space: Bottom-right, small (scale 0.5)
 * - Folder/Node: Bottom-right, smaller (scale 0.4)
 */

export const MoraOrbController: React.FC = () => {
    const { role, demoMode, isLoading: userLoading } = useUser();
    const { viewLevel, orbState: storeOrbState } = useMoraStore();
    const [apiOrbState, setApiOrbState] = useState<OrbState>('idle');
    const [isInitialized, setIsInitialized] = useState(false);

    // Fetch awareness from API
    useEffect(() => {
        if (userLoading) return;

        const loadAwareness = async () => {
            try {
                const pulse = await fetchAwarenessPulse();
                setApiOrbState(pulse.state);
                setIsInitialized(true);
            } catch (error) {
                console.error('Failed to fetch awareness pulse:', error);
                setIsInitialized(true);
            }
        };

        loadAwareness();
        const interval = setInterval(loadAwareness, 10000);
        return () => clearInterval(interval);
    }, [userLoading]);

    // Calculate orb position based on viewLevel
    const orbPosition: OrbPosition = useMemo(() => {
        switch (viewLevel) {
            case 'company':
            case 'core':
                // Home screen: Center, large
                return {
                    position: 'center',
                    scale: 1.8,
                    x: '50%',
                    y: '50%'
                };
            case 'department':
                // Department view (spaces): Top-right, medium
                return {
                    position: 'top-right',
                    scale: 0.6,
                    x: 'calc(100% - 80px)',
                    y: '80px'
                };
            case 'space':
                // Space view (folders): Bottom-right, small
                return {
                    position: 'bottom-right',
                    scale: 0.5,
                    x: 'calc(100% - 70px)',
                    y: 'calc(100% - 70px)'
                };
            case 'folder':
                // Folder view (nodes): Bottom-right, smaller
                return {
                    position: 'bottom-right',
                    scale: 0.4,
                    x: 'calc(100% - 60px)',
                    y: 'calc(100% - 60px)'
                };
            default:
                return {
                    position: 'center',
                    scale: 1.5,
                    x: '50%',
                    y: '50%'
                };
        }
    }, [viewLevel]);

    // Don't render until initialized
    if (!isInitialized || userLoading) return null;

    // Map role to orb role type
    const orbRole = role === 'admin' || role === 'owner'
        ? 'admin'
        : role === 'manager'
            ? 'manager'
            : 'member';

    // Use store state if available (reactive updates), fallback to API state
    const finalOrbState = storeOrbState || apiOrbState;

    return (
        <motion.div
            className="fixed z-50"
            style={{
                left: orbPosition.x,
                top: orbPosition.y,
                pointerEvents: orbPosition.position === 'center' ? 'auto' : 'none',
            }}
            animate={{
                x: '-50%',
                y: '-50%',
                scale: orbPosition.scale
            }}
            transition={{
                type: 'spring',
                stiffness: 120,
                damping: 25,
                mass: 1
            }}
        >
            <MoraOrb
                role={orbRole}
                state={finalOrbState}
                demoMode={demoMode}
            />
        </motion.div>
    );
};
