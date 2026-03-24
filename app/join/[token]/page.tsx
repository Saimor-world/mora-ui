'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { JoinFlow } from '@/components/auth/JoinFlow';

/**
 * Public invite acceptance route.
 * No auth guard -- the invite token is the authentication mechanism.
 * On completion, redirects to the main app (company universe).
 */
export default function JoinPage() {
    const params = useParams();
    const token = typeof params.token === 'string' ? params.token : '';

    return (
        <div className="min-h-screen bg-[#060810] flex items-center justify-center">
            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <JoinFlow
                    token={token}
                    onComplete={() => {
                        window.location.href = '/';
                    }}
                />
            </div>
        </div>
    );
}
