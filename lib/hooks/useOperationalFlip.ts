"use client";

import { useEffect, useRef } from 'react';
import { fetchUserProfile } from '@/lib/api/coreClient';
import { realtime } from '@/lib/api/realtimeClient';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';

const OPERATIONAL_FLIP_EVENTS = ['company_created', 'setup_complete'] as const;

export function useOperationalFlip() {
    const operationalState = useSessionStore((s) => s.user?.operational_state);
    const patchOperationalSession = useSessionStore((s) => s.patchOperationalSession);
    const queryClient = useQueryClient();
    const inFlightRef = useRef(false);

    useEffect(() => {
        if (operationalState !== 'setup_required') return;

        let mounted = true;

        const handlePotentialOperationalFlip = async () => {
            if (inFlightRef.current) return;
            inFlightRef.current = true;

            try {
                const session = await fetchUserProfile();
                if (!mounted || session?.operational_state !== 'operational') return;

                patchOperationalSession({
                    operational_state: session.operational_state,
                    setup_required: session.setup_required,
                    active_company_id: session.active_company_id,
                    active_company_name: session.active_company_name,
                    company_count: session.company_count,
                    scope_source: session.scope_source,
                });

                await queryClient.invalidateQueries({ queryKey: queryKeys.companies() });
            } catch {
                // Best-effort sync; keep setup state until backend truth flips.
            } finally {
                inFlightRef.current = false;
            }
        };

        OPERATIONAL_FLIP_EVENTS.forEach((eventType) => {
            realtime.on(eventType, handlePotentialOperationalFlip);
        });

        return () => {
            mounted = false;
            OPERATIONAL_FLIP_EVENTS.forEach((eventType) => {
                realtime.off(eventType, handlePotentialOperationalFlip);
            });
        };
    }, [operationalState, patchOperationalSession, queryClient]);
}
