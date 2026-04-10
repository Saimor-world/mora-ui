'use client';

import React from 'react';

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
    const initials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'B';
    const colors = (() => {
        switch (role) {
            case 'owner':
            case 'system_owner':
                return {
                    ring: 'rgba(212,175,55,0.48)',
                    glow: 'rgba(212,175,55,0.28)',
                    surface: 'radial-gradient(circle at 35% 28%, rgba(255,233,171,0.22), rgba(64,44,10,0.82) 68%)',
                    badge: '#34D399',
                };
            case 'admin':
                return {
                    ring: 'rgba(16,185,129,0.42)',
                    glow: 'rgba(16,185,129,0.26)',
                    surface: 'radial-gradient(circle at 35% 28%, rgba(176,255,229,0.2), rgba(8,62,49,0.82) 68%)',
                    badge: '#34D399',
                };
            default:
                return {
                    ring: 'rgba(56,189,248,0.4)',
                    glow: 'rgba(56,189,248,0.24)',
                    surface: 'radial-gradient(circle at 35% 28%, rgba(199,241,255,0.2), rgba(18,48,74,0.84) 68%)',
                    badge: '#60A5FA',
                };
        }
    })();

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
                <div
                    className="relative shrink-0"
                    style={{ width: compact ? 46 : 52, height: compact ? 46 : 52 }}
                >
                    {!loading ? (
                        <div
                            className="absolute inset-[-6px] rounded-full pointer-events-none"
                            style={{
                                background: `radial-gradient(circle at 35% 30%, ${colors.glow} 0%, transparent 68%)`,
                                filter: 'blur(12px)',
                            }}
                        />
                    ) : null}
                    <div
                        className="absolute inset-0 rounded-full border"
                        style={{
                            borderColor: colors.ring,
                            boxShadow: `0 0 18px ${colors.glow}`,
                        }}
                    />
                    <div className="absolute inset-[3px] overflow-hidden rounded-full border border-white/10 bg-black/25">
                        {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={imageUrl}
                                alt={displayName}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="relative h-full w-full" style={{ background: colors.surface }}>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_24%,rgba(255,255,255,0.18),transparent_28%)]" />
                                <div className="absolute inset-0 flex items-center justify-center text-[14px] font-semibold tracking-[0.08em] text-white/88 drop-shadow-[0_1px_4px_rgba(0,0,0,0.62)]">
                                    {initials}
                                </div>
                            </div>
                        )}
                    </div>
                    <div
                        className="absolute bottom-0 right-0 h-3 w-3 rounded-full border border-black/70"
                        style={{
                            backgroundColor: colors.badge,
                            boxShadow: `0 0 8px ${colors.badge}`,
                        }}
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
