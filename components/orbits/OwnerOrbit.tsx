"use client";

import React, { useMemo } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { Building2 } from 'lucide-react';
import { Bubble } from './Bubble';
import { calculateOrbitPositions, calculateDynamicRadius, type AnchorPoint, positionsToAnchorPoints } from '@/lib/orbit/orbitMath';

/**
 * OWNER ORBIT SYSTEM
 * Displays companies in orbital formation around MÔRA
 * Only visible when user role is 'owner'
 */

export interface OwnerOrbitProps {
    /** Center position in pixels */
    center?: { x: number; y: number };

    /** Optional: Custom radius override */
    radius?: number;

    /** Callback when company is selected */
    onCompanySelect?: (companyId: string) => void;

    /** Callback to provide anchor points for canvas */
    onAnchorPointsUpdate?: (anchors: AnchorPoint[]) => void;
}

export const OwnerOrbit: React.FC<OwnerOrbitProps> = ({
    center = { x: 0, y: 0 },
    radius,
    onCompanySelect,
    onAnchorPointsUpdate
}) => {
    const {
        companies,
        activeCompanyId,
        setActiveCompany,
        setViewLevel,
        loadDepartments
    } = useMoraStore();

    // Calculate positions
    const { positions, orbitRadius, anchorPoints } = useMemo(() => {
        const count = companies.length;
        if (count === 0) return { positions: [], orbitRadius: 0, anchorPoints: [] };

        // Bubble size for companies
        const bubbleSize = 80;

        // Calculate optimal radius if not provided
        const orbitRadius = radius ?? calculateDynamicRadius(
            count,
            bubbleSize,
            250, // Min radius
            500  // Max radius
        );

        // Calculate orbit positions
        const positions = calculateOrbitPositions(count, orbitRadius, center);

        // Convert to anchor points for canvas
        const anchorPoints = positionsToAnchorPoints(positions, 'company', bubbleSize / 2);

        return { positions, orbitRadius, anchorPoints };
    }, [companies, center, radius]);

    // Notify parent of anchor points (for canvas signals)
    React.useEffect(() => {
        if (onAnchorPointsUpdate && anchorPoints.length > 0) {
            onAnchorPointsUpdate(anchorPoints);
        }
    }, [anchorPoints, onAnchorPointsUpdate]);

    // Handle company click
    const handleCompanyClick = async (companyId: string) => {
        // Set active company
        setActiveCompany(companyId);

        // Load departments for this company
        await loadDepartments(companyId);

        // Navigate to company view
        setViewLevel('company');

        // Callback
        onCompanySelect?.(companyId);
    };

    if (companies.length === 0) {
        return null; // No companies to show
    }

    return (
        <div className="absolute inset-0 pointer-events-none">
            {companies.map((company, index) => {
                const pos = positions[index];
                if (!pos) return null;

                const isActive = company.id === activeCompanyId;

                return (
                    <Bubble
                        key={company.id}
                        id={company.id}
                        label={company.name}
                        icon={Building2}
                        position={{ x: pos.x, y: pos.y }}
                        size={80}
                        color={isActive ? '#10b981' : '#3b82f6'} // Emerald when active, blue default
                        isActive={isActive}
                        onClick={handleCompanyClick}
                        delay={index * 0.08} // Staggered entrance
                        badge={company.is_demo ? 'DEMO' : undefined}
                    />
                );
            })}
        </div>
    );
};
