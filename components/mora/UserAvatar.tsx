"use client";

import React from "react";
import { IdentityMedallion } from "@/components/os/shell/IdentityMedallion";

interface UserAvatarProps {
    role?: string;
    size?: number;
    showAura?: boolean;
    name?: string;
    imageUrl?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
    role = "member",
    size = 40,
    showAura = false,
    name,
    imageUrl,
}) => (
    <div className="relative" title={name || role}>
        {showAura ? (
            <div
                className="absolute inset-[-20%] rounded-full pointer-events-none"
                style={{
                    background: role === "owner" || role === "system_owner"
                        ? "radial-gradient(circle, rgba(212,175,55,0.22) 0%, transparent 72%)"
                        : role === "admin"
                            ? "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 72%)"
                            : "radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 72%)",
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
        />
    </div>
);
