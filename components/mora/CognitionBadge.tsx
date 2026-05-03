"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { coreGet } from "@/lib/api/coreClient";
import { usePaneStore } from "@/lib/store/paneStore";
import { openMoraCenter } from "@/lib/utils/openMoraCenter";

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
 * CognitionBadge - shows current cognition/intelligence mode.
 * Click opens the Mora Center with runtime details.
 */
export const CognitionBadge: React.FC<CognitionBadgeProps> = ({ onClick }) => {
    const { openPane } = usePaneStore();
    const [status, setStatus] = useState<CognitionStatus | null>(null);
    const [mode, setMode] = useState<string>("unknown");

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await coreGet("/v3/operator/status", { isOptional: true });
                if (res) {
                    setStatus(res);
                    if (!res.embedding?.enabled) {
                        setMode("NULL");
                    } else if (res.embedding?.mode === "SIMULATION" || res.embedding?.mode === "LIVE") {
                        setMode("ACTIVE");
                    } else {
                        setMode("EXTERNAL");
                    }
                }
            } catch {
                setMode("OFFLINE");
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const getBadgeColor = () => {
        switch (mode) {
            case "NULL":
                return "bg-gray-500/20 border-gray-500/50 text-gray-400";
            case "ACTIVE":
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
                return "Keine erweiterte Intelligenz aktiv. Durchleitungsmodus.";
            case "ACTIVE":
                return "Kognitionslauf aktiv. Mora verarbeitet Signale und Kontext.";
            case "EXTERNAL":
                return "Cloud-Modell aktiv.";
            case "LOCAL":
                return "Lokales Modell aktiv.";
            case "OFFLINE":
                return "Backend nicht erreichbar.";
            default:
                return "Status unbekannt.";
        }
    };

    const handleClick = () => {
        if (onClick) {
            onClick();
            return;
        }
        openMoraCenter(openPane, "stats", { width: 560, height: 720 });
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
            <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-2 h-2 rounded-full ${
                    mode === "ACTIVE" || mode === "EXTERNAL"
                        ? "bg-emerald-400"
                        : mode === "OFFLINE"
                            ? "bg-red-400"
                            : mode === "LOCAL"
                                ? "bg-blue-400"
                                : "bg-gray-400"
                }`}
            />

            <span className="text-[10px] font-medium tracking-wider uppercase">
                {mode}
            </span>

            {status?.heartbeat?.status === "active" && (
                <span className="text-[8px] opacity-60">•</span>
            )}
        </motion.div>
    );
};

export default CognitionBadge;
