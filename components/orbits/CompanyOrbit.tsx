"use client";

import React, { useMemo } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { Building2, Briefcase, Users, DollarSign, TrendingUp } from 'lucide-react';
import { Bubble } from './Bubble';
import { calculateOrbitPositions, calculateDynamicRadius, type AnchorPoint, positionsToAnchorPoints } from '@/lib/orbit/orbitMath';

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
    center = { x: 0, y: 0 },
    radius,
    onDepartmentSelect,
    onAnchorPointsUpdate
}) => {
    const {
        departments,
        activeDepartmentId,
        navigateToDepartment
    } = useMoraStore();

    // Calculate positions
    const { positions, orbitRadius, anchorPoints } = useMemo(() => {
        const count = departments.length;
        if (count === 0) return { positions: [], orbitRadius: 0, anchorPoints: [] };

        // Smaller bubbles for departments
        const bubbleSize = 70;

        // Calculate optimal radius if not provided
        const orbitRadius = radius ?? calculateDynamicRadius(
            count,
            bubbleSize,
            200, // Min radius
            450  // Max radius
        );

        // Calculate orbit positions
        const positions = calculateOrbitPositions(count, orbitRadius, center);

        // Convert to anchor points for canvas
        const anchorPoints = positionsToAnchorPoints(positions, 'department', bubbleSize / 2);

        return { positions, orbitRadius, anchorPoints };
    }, [departments, center, radius]);

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

    if (departments.length === 0) {
        return null; // No departments to show
    }

    return (
        <div className="absolute inset-0 pointer-events-none">
            {departments.map((dept, index) => {
                const pos = positions[index];
                if (!pos) return null;

                const isActive = dept.id === activeDepartmentId;
                const DeptIcon = getDepartmentIcon(dept.name);
                const color = dept.color || '#10b981'; // Use dept color or fallback

                return (
                    <Bubble
                        key={dept.id}
                        id={dept.id}
                        label={dept.name}
                        icon={DeptIcon}
                        position={{ x: pos.x, y: pos.y }}
                        size={70}
                        color={color}
                        isActive={isActive}
                        onClick={handleDepartmentClick}
                        delay={index * 0.06} // Staggered entrance
                    />
                );
            })}
        </div>
    );
};
