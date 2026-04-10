"use client";

import React from "react";
import { useUser } from "@/lib/hooks/useUser";
import { IdentityMedallion } from "@/components/os/shell/IdentityMedallion";

interface UserAvatarProps {
    onClick?: () => void;
    showLabel?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ onClick, showLabel = true }) => {
    const { user, role, isLoading } = useUser();

    if (isLoading || !user) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="relative flex items-center gap-3 rounded-full transition-transform hover:scale-[1.03] active:scale-[0.98]"
            title={user.email || "User"}
        >
            <IdentityMedallion
                name={user.email}
                role={role}
                size={56}
                preferInitials
            />
            {showLabel ? (
                <span className="text-xs uppercase tracking-[0.16em] text-white/70">
                    Konto
                </span>
            ) : null}
        </button>
    );
};
