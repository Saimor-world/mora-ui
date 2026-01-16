"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useSemanticGravity } from '@/lib/mora/useSemanticGravity';

interface SemanticItemProps {
    children: React.ReactNode;
    className?: string;
    relevance?: number; // 0.0 to 1.0
    onClick?: (e: React.MouseEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

/**
 * SEMANTIC ITEM WRAPPER
 * 
 * Applies "Semantic Gravity" physics to any UI element.
 * Items with higher relevance will be pulled towards the cursor.
 */
export const SemanticItem: React.FC<SemanticItemProps> = ({
    children,
    className,
    relevance = 0,
    onClick,
    onContextMenu
}) => {
    const { ref, style } = useSemanticGravity(relevance);

    return (
        <motion.div
            ref={ref}
            className={className}
            style={style}
            onClick={onClick}
            onContextMenu={onContextMenu}
            whileHover={{ scale: 1.02, zIndex: 10 }}
            whileTap={{ scale: 0.98 }}
        >
            {children}
        </motion.div>
    );
};
