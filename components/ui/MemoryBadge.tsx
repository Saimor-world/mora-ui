"use client";

import React from "react";
import { Brain } from "lucide-react";
import { usePaneStore } from "@/lib/store/paneStore";

interface MemoryBadgeProps {
    pendingCount: number;
    compact?: boolean;
    onClick?: () => void;
}

export const MemoryBadge: React.FC<MemoryBadgeProps> = ({
    pendingCount,
    compact = false,
    onClick,
}) => {
    const { openPane } = usePaneStore();

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            openPane({
                id: "mora-hub",
                type: "mora-hub" as any,
                title: "Mora Nexus",
                size: { width: 720, height: 640 },
                data: { activeSection: "memory" }
            });
        }
    };

    if (pendingCount === 0) return null;

    return (
        <button
            onClick={handleClick}
            className={`relative flex items-center gap-1.5 rounded-full transition-all ${
                compact
                    ? "p-1.5 bg-violet-500/20 hover:bg-violet-500/30"
                    : "px-2.5 py-1 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20"
            }`}
            title={`${pendingCount} Konto-Eintraege zur Pruefung`}
        >
            <Brain className={`text-violet-400 ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />

            {!compact && (
                <span className="text-[10px] text-violet-300 font-medium">
                    {pendingCount}
                </span>
            )}

            {/* Pulse indicator */}
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500 text-[7px] text-white font-bold items-center justify-center">
                    {pendingCount > 9 ? '!' : pendingCount}
                </span>
            </span>
        </button>
    );
};

export default MemoryBadge;
