"use client";

/**
 * AmbientRoomOverlay — fullscreen Môra Field above pane stack.
 *
 * AmbientRoom used to render inside ViewPort (z-10), which left it buried under
 * GlassPanel panes (z-100+) and the Dock. This portal keeps voice entry visible.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavStore } from '@/lib/store/navStore';
import { AmbientRoom } from '@/components/ambient/AmbientRoom';

/** Above PaneManager/GlassPanel (~100–850), below shell toasts (928+). */
const AMBIENT_ROOM_Z_INDEX = 880;

export const AmbientRoomOverlay: React.FC = () => {
    const viewLevel = useNavStore((s) => s.viewLevel);
    const isOpen = viewLevel === 'ambient';
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="ambient-room-overlay"
                    className="fixed inset-0"
                    style={{ zIndex: AMBIENT_ROOM_Z_INDEX }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                >
                    <AmbientRoom />
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
};
