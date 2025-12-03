"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import type { CoreDepartment, CoreFolder, CoreSpace } from "@/lib/types/core";

type Props = {
    departments: CoreDepartment[];
    activeDepartmentId?: string | null;
    orbPosition?: { x: number; y: number }; // percent of container
    radius?: number; // px
    spacesByDepartment?: Record<string, CoreSpace[]>;
    foldersBySpace?: Record<string, CoreFolder[]>;
    onDepartmentClick?: (deptId: string) => void;
};

// Helper to keep colors consistent
const getBadgeColor = (hex?: string) => hex || "#0EA5E9";

export const DepartmentCluster: React.FC<Props> = ({
    departments,
    activeDepartmentId,
    orbPosition = { x: 50, y: 50 },
    radius = 280,
    onDepartmentClick,
}) => {
    const positions = useMemo(() => {
        const count = Math.max(departments.length, 1);
        const step = (2 * Math.PI) / count;
        const start = -Math.PI / 2; // start at top

        return departments.map((dept, idx) => {
            const angle = start + idx * step;
            const dx = Math.cos(angle) * radius;
            const dy = Math.sin(angle) * radius;
            return { id: dept.id, dx, dy };
        });
    }, [departments, radius]);

    if (!departments.length) return null;

    return (
        <div className="absolute inset-0 pointer-events-none">
            {departments.map((dept, idx) => {
                const pos = positions[idx];
                const isActive = dept.id === activeDepartmentId;
                const badgeColor = getBadgeColor(dept.color);

                return (
                    <motion.button
                        key={dept.id}
                        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                        style={{
                            left: `calc(${orbPosition.x}% + ${pos.dx}px)`,
                            top: `calc(${orbPosition.y}% + ${pos.dy}px)`,
                        }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDepartmentClick?.(dept.id);
                        }}
                    >
                        {/* Node shell */}
                        <div
                            className={`relative w-14 h-14 rounded-full border border-white/10 bg-black/70 backdrop-blur-md shadow-[0_0_25px_rgba(0,0,0,0.45)] flex flex-col items-center justify-center gap-0.5 transition-all`}
                            style={{
                                boxShadow: isActive
                                    ? `0 0 30px ${badgeColor}55, inset 0 0 15px ${badgeColor}44`
                                    : "0 0 20px rgba(0,0,0,0.35)",
                            }}
                        >
                            {/* Active ring */}
                            {isActive && (
                                <motion.div
                                    className="absolute inset-[-6px] rounded-full border border-white/15"
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                />
                            )}

                            {/* Icon dot */}
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white/80"
                                style={{
                                    background: `radial-gradient(circle at 30% 30%, ${badgeColor}77, ${badgeColor}22)`,
                                }}
                            >
                                <Building2 size={14} />
                            </div>

                            {/* Label */}
                            <div className="text-[9px] uppercase tracking-[0.12em] text-emerald-50/80 text-center leading-none px-1">
                                {dept.name}
                            </div>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
};

