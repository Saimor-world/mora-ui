'use client';

/**
 * [DEPRECATED] UserCursor
 * 
 * Visual duties have been migrated to components/mora/CursorAgent.tsx.
 * This component intentionally returns null and serves only as a deprecation marker.
 * Existing callers rendering <UserCursor /> will safely render nothing,
 * while the unified <CursorAgent /> handles the global events.
 */

import React from 'react';

interface MoraCursorAgentProps {
    enabled?: boolean;
}

export const UserCursor: React.FC<MoraCursorAgentProps> = () => {
    return null;
};

export default UserCursor;
