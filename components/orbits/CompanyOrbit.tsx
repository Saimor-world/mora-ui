"use client";

import React, { useMemo } from 'react';
import { useNavStore } from '@/lib/store/navStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { Building2, Briefcase, Users, DollarSign, TrendingUp } from 'lucide-react';
import { Bubble } from './Bubble';
import { calculateOrbitPositions, calculateDynamicRadius, calculateVisualCenter, type AnchorPoint, positionsToAnchorPoints } from '@/lib/orbit/orbitMath';
import { logger } from '@/lib/utils/logger';

/**
 * COMPANY ORBIT SYSTEM
 * Displays departments in orbital formation around company center
 * Visible when user has selected a company (viewLevel: 'company')
 */

export interface CompanyOrbitProps {
    /** Center position in pixels */
    center?: { x: number; y: number };

    /** Optional: Custom radius override */
    radius?: number;

    /** Callback when department is selected */
    onDepartmentSelect?: (deptId: string) => void;

    /** Callback to provide anchor points for canvas */
    onAnchorPointsUpdate?: (anchors: AnchorPoint[]) => void;
}

// Icon mapping for departments
const DEPARTMENT_ICONS: Record<string, any> = {
    operations: Briefcase,
    engineering: Building2,
    finance: DollarSign,
    marketing: TrendingUp,
    hr: Users
};

// Helper to get department icon
function getDepartmentIcon(name: string): React.ElementType {
    const key = name.toLowerCase();
    return DEPARTMENT_ICONS[key] || Building2;
}

export const CompanyOrbit: React.FC<CompanyOrbitProps> = ({
    center,
    radius,
    onDepartmentSelect,
    onAnchorPointsUpdate
}) => {
    const { activeCompanyId, activeDepartmentId, navigateToDepartment } = useNavStore();
    const { data: departments = [] } = useDepartments(activeCompanyId);

    // Calculate center from viewport (accounts for sidebars/right panel)
    const calculatedCenter = useMemo(() => {
        if (typeof window === 'undefined') return { x: 600, y: 400 };
        const visualCenter = calculateVisualCenter(window.innerWidth, window.innerHeight);
        // Convert global center (accounts for sidebars) into local canvas coordinates
        return {
            x: visualCenter.x - 72, // left offset used in UniverseView container
            y: visualCenter.y
        };
    }, []);

    const finalCenter = center ?? calculatedCenter;

    // Calculate positions - ARC MODE: Max 6-8 departments in upper arc
    const { positions, orbitRadius, anchorPoints } = useMemo(() => {
        const count = Math.min(departments.length, 8); // Max 8
        if (count === 0) {
            return { positions: [], orbitRadius: 0, anchorPoints: [] };
        }

        // Professional arc settings
        const bubbleSize = 60;
        const orbitRadius = radius ?? 190; // Smaller radius for arc
        const arcAngle = 2.618; // 150 degrees (professional upper arc)
        const startAngle = -Math.PI / 2 - arcAngle / 2; // Center the arc at top

        // Calculate arc positions
        const positions = calculateOrbitPositions(count, orbitRadius, finalCenter, startAngle, arcAngle);

        // Convert to anchor points
        const anchorPoints = positionsToAnchorPoints(positions, 'department', bubbleSize / 2);

        return { positions, orbitRadius, anchorPoints };
    }, [departments, finalCenter, radius]);

    // Notify parent of anchor points (for canvas signals)
    React.useEffect(() => {
        if (onAnchorPointsUpdate && anchorPoints.length > 0) {
            onAnchorPointsUpdate(anchorPoints);
        }
    }, [anchorPoints, onAnchorPointsUpdate]);

    // Handle department click
    const handleDepartmentClick = (deptId: string) => {
        // Use store's navigation helper (loads spaces automatically)
        navigateToDepartment(deptId);

        // Callback
        onDepartmentSelect?.(deptId);
    };

    // RESCUE MODE: Show max 8 departments
    const visibleDepartments = departments.slice(0, 8);

    if (visibleDepartments.length === 0) {
        return null;
    }

    return (
        <div className="absolute inset-0 pointer-events-none">
            {visibleDepartments.map((dept, index) => {
                const pos = positions[index];
                if (!pos) return null;

                const isActive = dept.id === activeDepartmentId;
                const DeptIcon = getDepartmentIcon(dept.name);
                const color = dept.color || '#10b981';

                logger.debug(`[CompanyOrbit] Rendering bubble: ${dept.name} at (${Math.round(pos.x)}, ${Math.round(pos.y)})`);

                return (
                    <Bubble
                        key={dept.id}
                        id={dept.id}
                        label={dept.name}
                        icon={DeptIcon as any}
                        position={{ x: pos.x, y: pos.y }}
                        size={60}
                        color={color}
                        isActive={isActive}
                        onClick={handleDepartmentClick}
                        delay={index * 0.06}
                    />
                );
            })}
        </div>
    );
};
