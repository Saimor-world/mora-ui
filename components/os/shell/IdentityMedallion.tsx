"use client";

import React from "react";

interface IdentityMedallionProps {
    name?: string | null;
    role?: string | null;
    imageUrl?: string | null;
    size?: number;
    className?: string;
    preferInitials?: boolean;
    showStatusDot?: boolean;
    auraColor?: string;  // overrides role colors for non-owner
}

const getRoleColors = (role?: string | null) => {
    switch (role) {
        case "owner":
        case "system_owner":
            return {
                ring: "rgba(212,175,55,0.52)",
                glow: "rgba(212,175,55,0.32)",
                halo: "rgba(250, 214, 90, 0.28)",
                core: "radial-gradient(circle at 34% 26%, rgba(255,241,192,0.26), rgba(92,66,16,0.92) 62%, rgba(18,12,4,0.96) 100%)",
                accent: "#34D399",
            };
        case "admin":
            return {
                ring: "rgba(16,185,129,0.5)",
                glow: "rgba(16,185,129,0.28)",
                halo: "rgba(72, 255, 191, 0.24)",
                core: "radial-gradient(circle at 34% 26%, rgba(192,255,236,0.22), rgba(11,82,60,0.9) 62%, rgba(5,18,15,0.98) 100%)",
                accent: "#34D399",
            };
        default:
            return {
                ring: "rgba(56,189,248,0.46)",
                glow: "rgba(56,189,248,0.24)",
                halo: "rgba(120, 219, 255, 0.22)",
                core: "radial-gradient(circle at 34% 26%, rgba(215,245,255,0.24), rgba(19,58,92,0.9) 62%, rgba(6,14,22,0.98) 100%)",
                accent: "#60A5FA",
            };
    }
};

export const IdentityMedallion: React.FC<IdentityMedallionProps> = ({
    name,
    role,
    imageUrl,
    size = 48,
    className = "",
    preferInitials = true,
    showStatusDot = true,
    auraColor,
}) => {
    const label = name?.trim() || "Benutzer";
    const initials = label
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "B";
    const colors = getRoleColors(role);
    const isOwner = role === 'owner' || role === 'system_owner';
    const resolvedColors = (auraColor && !isOwner)
        ? {
              ...colors,
              ring: `${auraColor}52`,
              glow: `${auraColor}24`,
              halo: `${auraColor}28`,
          }
        : colors;
    const showImage = Boolean(imageUrl) && !preferInitials;

    return (
        <div
            className={`relative shrink-0 ${className}`}
            style={{ width: size, height: size }}
            aria-hidden="true"
        >
            <div
                className="pointer-events-none absolute inset-[-28%] rounded-full opacity-80"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${resolvedColors.halo} 0%, transparent 68%)`,
                    filter: "blur(22px)",
                }}
            />
            <div
                className="pointer-events-none absolute inset-[-14%] rounded-full animate-pulse"
                style={{
                    background: `radial-gradient(circle at 40% 35%, ${resolvedColors.glow} 0%, transparent 72%)`,
                    filter: "blur(16px)",
                    animationDuration: '4.8s',
                }}
            />

            <div
                className="absolute inset-0 rounded-full"
                style={{
                    background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04), rgba(255,255,255,0) 72%)",
                    border: `1.5px solid ${resolvedColors.ring}`,
                    boxShadow: `0 0 20px ${resolvedColors.glow}, inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.12)`,
                }}
            />

            <div
                className="absolute inset-[6%] rounded-full"
                style={{
                    border: `1px solid ${resolvedColors.glow}`,
                    boxShadow: `inset 0 0 18px ${resolvedColors.glow}`,
                }}
            />

            <div
                className="absolute inset-[11%] rounded-full"
                style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
            />

            <div
                className="absolute inset-[7%] overflow-hidden rounded-full border border-white/10"
                style={{
                    background: colors.core,
                    boxShadow: "inset 0 0 16px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -10px 18px rgba(0,0,0,0.24)",
                }}
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.18),transparent_24%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_76%,rgba(0,0,0,0.22),transparent_34%)]" />
                <div
                    className="absolute inset-[-18%] opacity-55"
                    style={{
                        background: "conic-gradient(from 210deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.18) 58deg, transparent 122deg, rgba(255,255,255,0.05) 204deg, transparent 360deg)",
                        filter: "blur(6px)",
                        animation: "identity-swirl 12s linear infinite",
                    }}
                />
                <div
                    className="absolute inset-[12%] rounded-full"
                    style={{
                        border: "1px solid rgba(255,255,255,0.05)",
                        boxShadow: "inset 0 0 14px rgba(255,255,255,0.04)",
                    }}
                />
                <div className="absolute inset-[16%] rounded-full border border-white/8" />
                {showImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl!}
                        alt={label}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span
                            className="select-none font-semibold tracking-[0.06em] text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.78)]"
                            style={{ fontSize: Math.max(15, size * 0.38) }}
                        >
                            {initials}
                        </span>
                    </div>
                )}
            </div>

            {showStatusDot ? (
                <div
                    className="absolute bottom-[2%] right-[2%] rounded-full border border-black/70"
                    style={{
                        width: Math.max(10, size * 0.22),
                        height: Math.max(10, size * 0.22),
                        backgroundColor: colors.accent,
                        boxShadow: `0 0 10px ${colors.accent}`,
                    }}
                />
            ) : null}

            <style jsx>{`
                @keyframes identity-swirl {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
};
