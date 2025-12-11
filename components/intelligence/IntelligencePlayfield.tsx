import React from 'react';
import { useIntelligencePulse } from '@/lib/hooks/useIntelligencePulse';
import { PulseRing } from './PulseRing';
import { HotspotMarkers } from './HotspotMarkers';

export const IntelligencePlayfield: React.FC = () => {
    // 1. Poll Data
    const { pulse, hotspots } = useIntelligencePulse();

    return (
        <div className="absolute inset-0 pointer-events-none z-[5] overflow-visible">
            {/* Layer 1: Global Pulse Activity */}
            <PulseRing pulse={pulse} />

            {/* Layer 2: Semantic Hotspots (only visible if nodes are mapped) */}
            <HotspotMarkers hotspots={hotspots} />
        </div>
    );
};
