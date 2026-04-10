'use client';

import React from 'react';
import { IdentityMedallion } from './IdentityMedallion';

interface AccountIdentityPodProps {
    name?: string | null;
    role?: string | null;
    roleLabel?: string | null;
    subtitle?: string | null;
    imageUrl?: string | null;
    preferInitials?: boolean;
    actionSlot?: React.ReactNode;
    className?: string;
    compact?: boolean;
    loading?: boolean;
    embedded?: boolean;
    variant?: 'default' | 'dock';
}

export const AccountIdentityPod: React.FC<AccountIdentityPodProps> = ({
    name,
    role,
    roleLabel,
    subtitle,
    imageUrl,
    preferInitials = true,
    actionSlot,
    className = '',
    compact = false,
    loading = false,
    embedded = false,
    variant = 'default',
}) => {
    const displayName = name?.trim() || 'Benutzer';
    const displayRole = roleLabel?.trim() || 'Konto';
    const displaySubtitle = subtitle?.trim() || 'Arbeitskontext';
    const isDockVariant = variant === 'dock';

    return (
        <div
            className={[
                'relative overflow-hidden rounded-[26px]',
                embedded
                    ? isDockVariant
                        ? 'border border-[#d4af37]/16 bg-[linear-gradient(160deg,rgba(27,22,10,0.34),rgba(4,10,13,0.08))] shadow-[0_18px_44px_rgba(0,0,0,0.32),0_0_28px_rgba(212,175,55,0.08),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl'
                        : 'border-none bg-transparent shadow-none backdrop-blur-0'
                    : 'border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(0,0,0,0.14))] shadow-[0_14px_34px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl',
                compact ? (isDockVariant ? 'px-3 py-2.5' : 'px-3 py-2.5') : 'px-4 py-3.5',
                className,
            ].join(' ')}
        >
            {!embedded || isDockVariant ? (
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/32 to-transparent" />
            ) : null}
            {isDockVariant ? (
                <>
                    <div className="pointer-events-none absolute -left-4 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-[#d4af37]/10 blur-2xl" />
                    <div className="pointer-events-none absolute -right-4 bottom-0 h-16 w-16 rounded-full bg-emerald-400/8 blur-2xl" />
                </>
            ) : null}
            <div className="flex items-center gap-3.5">
                <IdentityMedallion
                    name={displayName}
                    role={role}
                    imageUrl={imageUrl}
                    preferInitials={preferInitials}
                    size={isDockVariant ? 58 : compact ? 50 : 56}
                />

                <div className="min-w-0 flex-1">
                    <div className={`truncate font-semibold tracking-[0.01em] text-white/92 ${isDockVariant ? 'text-[15px]' : 'text-[13px]'}`}>
                        {displayName}
                    </div>
                    <div className={`mt-0.5 uppercase tracking-[0.18em] ${isDockVariant ? 'text-[9px] text-[#f2d581]/74' : 'text-[10px] text-emerald-300/68'}`}>
                        {displayRole}
                    </div>
                    <div className={`mt-1 truncate ${isDockVariant ? 'text-[10px] text-white/48' : 'text-[10px] text-white/36'}`}>
                        {displaySubtitle}
                    </div>
                </div>

                {actionSlot ? (
                    <div className="shrink-0">
                        {actionSlot}
                    </div>
                ) : null}
            </div>
        </div>
    );
};
