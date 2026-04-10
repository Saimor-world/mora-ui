'use client';

import React from 'react';
import { UserAvatar } from '@/components/mora/UserAvatar';

interface AccountIdentityPodProps {
    name?: string | null;
    role?: string | null;
    roleLabel?: string | null;
    subtitle?: string | null;
    imageUrl?: string | null;
    actionSlot?: React.ReactNode;
    className?: string;
    compact?: boolean;
    loading?: boolean;
    embedded?: boolean;
}

export const AccountIdentityPod: React.FC<AccountIdentityPodProps> = ({
    name,
    role,
    roleLabel,
    subtitle,
    imageUrl,
    actionSlot,
    className = '',
    compact = false,
    loading = false,
    embedded = false,
}) => {
    const displayName = name?.trim() || 'Benutzer';
    const displayRole = roleLabel?.trim() || 'Konto';
    const displaySubtitle = subtitle?.trim() || 'Arbeitskontext';

    return (
        <div
            className={[
                'relative overflow-hidden rounded-[26px]',
                embedded
                    ? 'border-none bg-transparent shadow-none backdrop-blur-0'
                    : 'border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(0,0,0,0.14))] shadow-[0_14px_34px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl',
                compact ? 'px-3 py-2.5' : 'px-3.5 py-3',
                className,
            ].join(' ')}
        >
            {!embedded ? (
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/32 to-transparent" />
            ) : null}
            <div className="flex items-center gap-3">
                <div className="shrink-0">
                    <UserAvatar
                        role={role || 'member'}
                        size={compact ? 42 : 48}
                        showAura={!loading}
                        name={displayName}
                        imageUrl={imageUrl || undefined}
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-white/88">
                        {displayName}
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-300/68">
                        {displayRole}
                    </div>
                    <div className="mt-1 truncate text-[10px] text-white/32">
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
