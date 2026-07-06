"use client";



/**

 * AmbientRoomOverlay — Môra voice layer above the active OS surface.

 *

 * Voice is NOT a separate viewLevel. The current surface (Home canvas, Universe,

 * department, panes) stays mounted underneath a translucent overlay at z-880.

 */



import React, { useEffect, useState } from 'react';

import { createPortal } from 'react-dom';

import { AnimatePresence, motion } from 'framer-motion';

import { useNavStore } from '@/lib/store/navStore';

import { closeVoiceOverlay } from '@/lib/os/openVoiceOverlay';

import { AmbientRoom } from '@/components/ambient/AmbientRoom';



/** Above PaneManager/GlassPanel (~100–850), below shell toasts (928+). */

export const AMBIENT_ROOM_Z_INDEX = 880;



export const AmbientRoomOverlay: React.FC = () => {

    const voiceOverlayOpen = useNavStore((s) => s.voiceOverlayOpen);

    const [mounted, setMounted] = useState(false);



    useEffect(() => {

        setMounted(true);

        return () => setMounted(false);

    }, []);



    if (!mounted) return null;



    return createPortal(

        <AnimatePresence>

            {voiceOverlayOpen && (

                <motion.div

                    key="ambient-room-overlay"

                    data-testid="ambient-room-overlay"

                    className="fixed inset-0"

                    style={{ zIndex: AMBIENT_ROOM_Z_INDEX }}

                    initial={{ opacity: 0 }}

                    animate={{ opacity: 1 }}

                    exit={{ opacity: 0 }}

                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}

                >

                    {/* Dimmed canvas/universe — surface stays visible underneath */}

                    <div

                        className="absolute inset-0 bg-[#02050a]/55 backdrop-blur-[3px]"

                        aria-hidden
                        onClick={handleClose}
                    />

                    <AmbientRoom variant="overlay" onClose={handleClose} />

                </motion.div>

            )}

        </AnimatePresence>,

        document.body,

    );

};



function handleClose() {

    closeVoiceOverlay();

}
