"use client";

import React from 'react';
import { useReducedMotion } from 'framer-motion';
import { NodeStar } from '@/components/mora/NodeStar';

interface DeepSpaceLayerProps {
    nodes: Array<{
        node: any;
        x: number;
        y: number;
        delay: number;
    }>;
    onNodeClick: (node: any) => void;
}

export const DeepSpaceLayer: React.FC<DeepSpaceLayerProps> = ({ nodes, onNodeClick }) => {
    const prefersReducedMotion = useReducedMotion();
    // Deterministic random based on ID for stable hydration
    const getSeededRandom = (id: string) => {
        const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return (seed % 100) / 100;
    };

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {nodes.map(({ node, x, y, delay }) => {
                const randomVal = getSeededRandom(node.id);
                return (
                    <div
                        key={node.id}
                        className={`absolute pointer-events-auto ${prefersReducedMotion ? '' : 'deep-space-node'}`}
                        style={{
                            left: `${x}vw`,
                            top: `${y}vh`,
                            transform: 'translate(-50%, -50%)',
                            opacity: prefersReducedMotion ? 0.82 : undefined,
                            animationDelay: prefersReducedMotion ? undefined : `${delay}s`,
                            animationDuration: prefersReducedMotion ? undefined : `${4 + randomVal * 4}s`,
                        }}
                    >
                        <NodeStar
                            node={node}
                            position={{ x: '50%', y: '50%' }}
                            onClick={() => onNodeClick(node)}
                        />
                    </div>
                );
            })}
        </div>
    );
};
