"use client";

import React from "react";
import { IdentityMedallion } from "@/components/os/shell/IdentityMedallion";
import { getUserColor } from "@/lib/utils/userColors";

interface UserAvatarProps {
    role?: string;
    size?: number;
    showAura?: boolean;
    /** Name or email — used to compute deterministic per-user aura color */
    name?: string;
    imageUrl?: string;
}

/**
 * Renders a user avatar with an optional aura glow.
 *
 * Aura color strategy:
 *  - owner / system_owner → always gold (brand anchor)
 *  - everyone else        → deterministic per-user color from name/email
 *    (Habbo-style: same person = same color across all surfaces)
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
    role = "member",
    size = 40,
    showAura = false,
    name,
    imageUrl,
}) => {
    const isOwnerRole = role === "owner" || role === "system_owner";

    const auraColor = isOwnerRole
        ? "rgba(212,175,55,0.25)"
        : getUserColor(name || role).glow;

    const personalAuraColor = isOwnerRole
        ? undefined
        : getUserColor(name || role).hex;

    return (
        <div className="relative" title={name || role}>
            {showAura ? (
                <div
                    className="absolute inset-[-20%] rounded-full pointer-events-none"
                    style={{
                        background: `radial-gradient(circle, ${auraColor} 0%, transparent 72%)`,
                        filter: "blur(16px)",
                    }}
                />
            ) : null}
            <IdentityMedallion
                name={name}
                role={role}
                imageUrl={imageUrl}
                size={size}
                preferInitials
                auraColor={personalAuraColor}
            />
        </div>
    );
};
