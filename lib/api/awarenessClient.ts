/**
 * Awareness API Client
 * Connects to saimor-core Awareness State endpoints for Môra Orb
 */

import { coreGet, CoreError } from './coreClient';

export type OrbState = 'idle' | 'watch' | 'focus' | 'thinking' | 'alert' | 'insight' | 'demo';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface AwarenessStateResponse {
    state: OrbState;
    last_activity: string | null;
    recent_event_count: number;
    risk_level: RiskLevel;
    context: {
        synthesis_available?: boolean;
        demo_mode?: boolean;
        active_folder?: string;
        event_types?: string[];
    };
    timestamp: string;
}

export interface AwarenessPulseResponse {
    state: OrbState;
    pulse: 'slow' | 'normal' | 'fast' | 'steady';
}

/**
 * Fetch full awareness state
 * Use for initial load or when detailed context is needed
 *
 * @returns {Promise<AwarenessStateResponse>} Awareness state with context
 */
export async function fetchAwarenessState(): Promise<AwarenessStateResponse> {
    try {
        const data = await coreGet('/v1/awareness/state');
        // null = auth failed silently
        if (!data) {
            return {
                state: 'demo',
                last_activity: null,
                recent_event_count: 0,
                risk_level: 'low',
                context: { demo_mode: true },
                timestamp: new Date().toISOString()
            };
        }
        return data;
    } catch (error: any) {
        // Return safe fallback for any error
        return {
            state: 'idle',
            last_activity: null,
            recent_event_count: 0,
            risk_level: 'low',
            context: {},
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Fetch lightweight awareness pulse
 * Use for frequent polling (every 5-10s)
 * Minimal payload, < 5ms backend response
 *
 * @returns {Promise<AwarenessPulseResponse>} Pulse state
 */
export async function fetchAwarenessPulse(): Promise<AwarenessPulseResponse> {
    try {
        const data = await coreGet('/v1/awareness/pulse');
        // null = auth failed silently, use fallback
        if (!data) {
            return { state: 'demo', pulse: 'slow' };
        }
        return data;
    } catch (error: any) {
        // Any other error - return fallback
        return { state: 'idle', pulse: 'slow' };
    }
}
