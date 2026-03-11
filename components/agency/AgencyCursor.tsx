'use client';

/**
 * [DEPRECATED] AgencyCursor - Legacy visual wrapper
 *
 * Visual duties have been moved to components/mora/CursorAgent.tsx.
 * This file remains solely to render the AgencyActionOverlay and 
 * forward legacy `agency:move_cursor` events to the unified system.
 */

import React, { useEffect } from 'react';
import { AgencyActionOverlay } from './AgencyActionOverlay';

export function AgencyCursor() {
    // Forward legacy agency:move_cursor events to the unified cursor agent
    useEffect(() => {
        const handleLegacyMove = (event: CustomEvent<{ targetId: string }>) => {
            window.dispatchEvent(new CustomEvent('mora:cursor', {
                detail: {
                    action: 'point',
                    targetId: event.detail.targetId,
                    message: null
                }
            }));
        };

        window.addEventListener('agency:move_cursor', handleLegacyMove as EventListener);
        
        return () => {
            window.removeEventListener('agency:move_cursor', handleLegacyMove as EventListener);
        };
    }, []);

    // The visual abort button / execution state is now handled here
    return <AgencyActionOverlay />;
}

export default AgencyCursor;
