import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useIntelligenceStore } from '@/lib/store/intelligenceStore';

interface HotspotMarkersProps {
    hotspots: Array<{ node_id: string; score: number }>;
}

export const HotspotMarkers: React.FC<HotspotMarkersProps> = ({ hotspots }) => {
    // Read positions from store
    const nodePositions = useIntelligenceStore((state) => state.nodePositions);

    // Filter hotspots that have valid positions in current view
    const activeMarkers = useMemo(() => {
        if (!hotspots.length || nodePositions.size === 0) return [];

        return hotspots.map(h => {
            const pos = nodePositions.get(h.node_id);
            if (!pos) return null;
            return { ...h, x: pos.x, y: pos.y };
        }).filter((m): m is { node_id: string; score: number; x: number; y: number } => m !== null);
    }, [hotspots, nodePositions]);

    if (activeMarkers.length === 0) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-0">
            {/* We need the same coordinate space as the nodeStars. 
                 CompanyCoreView renders nodeStars in a container centered at 50% 50%.
                 IntelligencePlayfield is absolute inset-0.
                 So we need to transform-translate center to match.
             */}
            <div className="absolute top-1/2 left-1/2">
                {activeMarkers.map(marker => (
                    <motion.div
                        key={`hotspot-${marker.node_id}`}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            left: marker.x,
                            top: marker.y,
                            transform: 'translate(-50%, -50%)',
                            width: 60,
                            height: 60,
                            background: `radial-gradient(circle, ${marker.score > 0.7 ? '#F59E0B' : '#FCD34D'}30, transparent 70%)`,
                            filter: 'blur(8px)'
                        }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.2, 1] }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>
        </div>
    );
};
