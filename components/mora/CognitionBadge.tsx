"use client";

import React, { useEffect, useState } from "react";
import { coreGet } from "@/lib/api/coreClient";
import { motion } from "framer-motion";
import { usePaneStore } from "@/lib/store/paneStore";

interface CognitionStatus {
    embedding: {
        enabled: boolean;
        mode: string;
    };
    heartbeat: {
        status: string;
        last_check_at: string;
        message: string;
    };
}

interface CognitionBadgeProps {
    onClick?: () => void;
}

/**
 * CognitionBadge - Shows current cognition/intelligence mode
 *
 * Displays: NULL | ACTIVE | EXTERNAL | LOCAL
 * Based on /v3/operator/status endpoint
 *
 * Click opens the Mora Hub with Stats section
 */
export const CognitionBadge: React.FC<CognitionBadgeProps> = ({ onClick }) => {
    const { openPane } = usePaneStore();
    const [status, setStatus] = useState<CognitionStatus | null>(null);
    const [mode, setMode] = useState<string>("unknown");
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await coreGet("/v3/operator/status", { isOptional: true });
                if (res) {
                    setStatus(res);
                    // Determine mode based on embedding status
                    if (!res.embedding?.enabled) {
                        setMode("NULL");
                    } else if (res.embedding?.mode === "SIMULATION" || res.embedding?.mode === "LIVE") {
                        setMode("ACTIVE"); // Active cognition
                    } else {
                        setMode("EXTERNAL");
                    }
                    setError(false);
                }
            } catch (err) {
                // Silent fail - just show OFFLINE mode
                setError(true);
                setMode("OFFLINE");
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Every 30s
        return () => clearInterval(interval);
    }, []);

    const getBadgeColor = () => {
        switch (mode) {
            case "NULL":
                return "bg-gray-500/20 border-gray-500/50 text-gray-400";
            case "ACTIVE":
                return "bg-emerald-500/20 border-emerald-500/50 text-emerald-400";
            case "EXTERNAL":
                return "bg-emerald-500/20 border-emerald-500/50 text-emerald-400";
            case "LOCAL":
                return "bg-blue-500/20 border-blue-500/50 text-blue-400";
            case "OFFLINE":
                return "bg-red-500/20 border-red-500/50 text-red-400";
            default:
                return "bg-gray-500/20 border-gray-500/50 text-gray-400";
        }
    };

    const getTooltip = (): string => {
        switch (mode) {
            case "NULL":
                return "No cognition active. Pass-through mode.";
            case "ACTIVE":
                return "Cognition engine processing. AI reasoning active.";
            case "EXTERNAL":
                return "Real LLM active (GPT-4/Claude/Gemini).";
            case "LOCAL":
                return "Local LLM active (Ollama).";
            case "OFFLINE":
                return "Backend not reachable.";
            default:
                return "Status unknown.";
        }
    };

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            // Default: Open Mora Hub with Stats section
            openPane({
                id: 'mora-hub',
                type: 'mora-hub',
                title: 'Mora Nexus',
                size: { width: 560, height: 720 },
                data: { activeSection: 'stats' }
            });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
        px-2.5 py-1 rounded-full
        border backdrop-blur-xl
        flex items-center gap-1.5
        cursor-pointer select-none
        hover:brightness-110 transition-all
        ${getBadgeColor()}
      `}
            title={`${getTooltip()} Klicken für Details.`}
        >
            {/* Pulse indicator */}
            <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-2 h-2 rounded-full ${mode === "ACTIVE" ? "bg-emerald-400" :
                    mode === "EXTERNAL" ? "bg-emerald-400" :
                        mode === "OFFLINE" ? "bg-red-400" :
                            "bg-gray-400"
                    }`}
            />

            {/* Mode label */}
            <span className="text-[10px] font-medium tracking-wider uppercase">
                {mode}
            </span>

            {/* Heartbeat indicator */}
            {status?.heartbeat?.status === "active" && (
                <span className="text-[8px] opacity-60">•</span>
            )}
        </motion.div>
    );
};

export default CognitionBadge;
