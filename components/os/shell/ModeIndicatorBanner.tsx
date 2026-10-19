'use client';

import React, { useEffect, useState } from 'react';

/**
 * Floating banner that tells the user which non-production mode the OS is in
 * (playground / demo / preview / visitor). Renders nothing for real HQ.
 *
 * UV2 Design: Compact, gold accent, respects safe-area, never overlaps content.
 */

const GOLD = '#D6A848';

export const ModeIndicatorBanner: React.FC<{ activeMode: 'real_hq' | 'public_playground' | 'personal_demo' | 'private_preview' | 'visitor' }> = ({ activeMode }) => {
    const [ownerReturnAvailable, setOwnerReturnAvailable] = useState(false);
    const [isReturning, setIsReturning] = useState(false);
    const [returnError, setReturnError] = useState('');

    useEffect(() => {
        if (activeMode !== 'private_preview') {
            setOwnerReturnAvailable(false);
            return;
        }
        if (typeof fetch !== 'function') return;

        let cancelled = false;
        fetch('/api/auth/owner-preview-return', { headers: { Accept: 'application/json' } })
            .then((response) => response.ok ? response.json() : null)
            .then((payload) => {
                if (!cancelled) setOwnerReturnAvailable(Boolean(payload?.available));
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, [activeMode]);

    const returnToOwner = async () => {
        setIsReturning(true);
        setReturnError('');
        try {
            const response = await fetch('/api/auth/owner-preview-return', { method: 'POST' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload?.detail || 'Owner-Sitzung konnte nicht wiederhergestellt werden.');
            const destination = payload?.destination || '/home';
            const separator = destination.includes('?') ? '&' : '?';
            window.location.replace(`${destination}${separator}ownerReturn=${Date.now()}`);
        } catch (error) {
            setReturnError(error instanceof Error ? error.message : 'Rückkehr nicht möglich.');
            setIsReturning(false);
        }
    };

    if (activeMode === 'real_hq') return null;

    let badgeText = '';
    let shortText = '';

    if (activeMode === 'public_playground') {
        badgeText = 'Public Playground';
        shortText = 'Geteilte Umgebung';
    } else if (activeMode === 'personal_demo') {
        badgeText = 'Personal Demo';
        shortText = 'Private Testumgebung';
    } else if (activeMode === 'private_preview') {
        badgeText = ownerReturnAvailable ? 'Kunden-Vorschau' : 'Vorschau';
        shortText = ownerReturnAvailable ? 'Isolierter Tenant' : 'Endet in 20 Tagen';
    } else if (activeMode === 'visitor') {
        badgeText = 'Vorschau';
        shortText = 'Personalisierte Ansicht';
    }

    return (
        <div
            className="fixed z-[80] pointer-events-auto"
            style={{
                top: 'max(env(safe-area-inset-top, 0px), 12px)',
                left: '50%',
                transform: 'translateX(-50%)',
            }}
        >
            <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl"
                style={{
                    background: 'rgba(7,11,12,0.75)',
                    border: `0.5px solid rgba(214,168,72,0.35)`,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                }}
            >
                <span className="relative flex h-1.5 w-1.5">
                    <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: GOLD, opacity: 0.6 }}
                    />
                    <span
                        className="relative inline-flex h-1.5 w-1.5 rounded-full"
                        style={{ background: GOLD }}
                    />
                </span>
                <span
                    className="text-[11px] font-medium"
                    style={{
                        color: GOLD,
                        letterSpacing: '0.04em',
                    }}
                >
                    {badgeText}
                </span>
                <span
                    className="hidden sm:inline text-[11px]"
                    style={{ color: 'rgba(247,244,233,0.55)' }}
                >
                    · {shortText}
                </span>
                {activeMode === 'private_preview' && ownerReturnAvailable ? (
                    <button
                        type="button"
                        onClick={returnToOwner}
                        disabled={isReturning}
                        className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition disabled:opacity-50"
                        style={{
                            background: `rgba(214,168,72,0.15)`,
                            border: `0.5px solid rgba(214,168,72,0.35)`,
                            color: GOLD,
                        }}
                    >
                        {isReturning ? 'Rückkehr…' : 'Zurück'}
                    </button>
                ) : null}
            </div>
            {returnError ? (
                <p
                    className="mt-1 text-center text-[10px]"
                    style={{ color: 'rgba(251,113,133,0.85)' }}
                >
                    {returnError}
                </p>
            ) : null}
        </div>
    );
};
