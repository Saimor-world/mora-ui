'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavStore } from '@/lib/store/navStore';
import { HomeSurfaceUnified } from '@/components/home/HomeSurfaceUnified';
import { VisitorHomeSurface } from '@/components/home/VisitorHomeSurface';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';
import { CAMERA, cameraTransition, homeLayerFor, universeLayerFor, type CameraShot } from '@/lib/universe/motion';

/**
 * CoreLayer — Surface router for viewLevel='core'.
 *
 * Authenticated OS users land on the new command field. Public/preview visitors
 * keep the purpose-built visitor surface. Universe remains an explicit explore
 * mode so the Saimôr spatial identity stays intact without owning the daily path.
 */
const UniverseView = dynamic(() => import('@/components/home/UniverseView'), {
    ssr: false,
    loading: () => (
        <div
            className="absolute inset-0 bg-[#05080e]"
            aria-hidden
            data-testid="universe-view-loading"
        />
    ),
});

export const CoreLayer: React.FC = () => {
    const coreMode = useNavStore((s) => s.coreMode);
    const activeMode = useNavStore((s) => s.activeMode);
    const prefersReducedMotion = useReducedMotion();

    const homeVariants = {
        initial: {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 1.008,
        },
        animate: {
            opacity: 1,
            scale: 1,
            transition: { duration: prefersReducedMotion ? 0.16 : 0.48, ease: [0.22, 0.9, 0.18, 1] as const },
        },
        exit: {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 0.985,
            transition: { duration: prefersReducedMotion ? 0.14 : 0.42, ease: [0.32, 0.02, 0.16, 1] as const },
        },
    };

    const exploreVariants = {
        initial: {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 1.045,
            filter: prefersReducedMotion ? 'blur(0px)' : 'blur(8px)',
        },
        animate: {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            transition: { duration: prefersReducedMotion ? 0.16 : 0.72, ease: [0.16, 0.84, 0.2, 1] as const },
        },
        exit: {
            opacity: 0,
            transition: { duration: prefersReducedMotion ? 0.12 : 0.22 },
        },
    };

    if (isUniverseV2Enabled() && activeMode !== 'visitor' && activeMode !== 'private_preview') {
        return <CameraCore shot={coreMode === 'home' ? 'near' : 'far'} reduced={!!prefersReducedMotion} />;
    }

    return (
        <div className="absolute inset-0">
            <AnimatePresence initial={false} mode="wait">
                {coreMode === 'home' ? (
                    <motion.div
                        key="home"
                        className="absolute inset-0 z-10 pointer-events-none"
                        variants={homeVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        {activeMode === 'visitor' || activeMode === 'private_preview'
                            ? <VisitorHomeSurface />
                            : <HomeSurfaceUnified />}
                    </motion.div>
                ) : (
                    <motion.div
                        key="universe"
                        className="absolute inset-0 z-10"
                        variants={exploreVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <UniverseView />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * Universe v2 – Home und Universe sind ein Ort. Beide Ebenen bleiben gemountet;
 * der Wechsel ist eine einzige Kamerafahrt mit MÔRAs Licht als Fluchtpunkt:
 * Home = nah (Universe unscharf dahinter), Universe = weit.
 */
const CameraCore = React.memo(function CameraCore({ shot, reduced }: { shot: CameraShot; reduced: boolean }) {
    const t = cameraTransition(reduced);
    const [settled, setSettled] = React.useState(shot === 'far');
    // Home bleibt nur während der Fahrt gemountet – im Weitbild fängt es keine Klicks ab.
    const [homeMounted, setHomeMounted] = React.useState(shot === 'near');
    React.useEffect(() => {
        if (shot === 'near') { setHomeMounted(true); return; }
        const id = window.setTimeout(() => setHomeMounted(false), reduced ? 200 : CAMERA.move + 50);
        return () => window.clearTimeout(id);
    }, [shot, reduced]);
    return (
        <div className="absolute inset-0 overflow-hidden" data-testid="uv2-camera" data-shot={shot}>
            <style>{'[data-testid="uv2-camera"] > [data-settled="true"]{filter:none!important;transform:none!important;will-change:auto!important}'}</style>
            <motion.div
                className="absolute inset-0 z-10"
                style={{ transformOrigin: `${CAMERA.origin.x}% ${CAMERA.origin.y}%`, pointerEvents: shot === 'far' ? 'auto' : 'none' }}
                initial={false}
                animate={universeLayerFor(shot, reduced)}
                transition={t}
                // Angekommen im Weitbild: Filter und Transform ganz entfernen. Ein stehengebliebenes
                // blur(0px)/scale(1) hält eine Compositing-Ebene offen (weiche Kanten, Streifen) und
                // macht position:fixed darin relativ zur Ebene.
                onAnimationComplete={() => setSettled(shot === 'far')}
                onAnimationStart={() => setSettled(false)}
                data-settled={settled && shot === 'far' ? 'true' : 'false'}
                aria-hidden={shot !== 'far'}
            >
                <UniverseView />
            </motion.div>
            {/* MÔRAs Licht – im Nahbild groß und warm, im Weitbild tritt es zurück ins Universe */}
            <motion.div aria-hidden className="pointer-events-none absolute z-[15] rounded-full" data-testid="uv2-near-light"
                style={{ left: `${CAMERA.origin.x}%`, top: `${CAMERA.origin.y}%`, width: 900, height: 900, marginLeft: -450, marginTop: -450,
                    background: 'radial-gradient(circle, rgba(255,222,170,0.28) 0%, rgba(255,200,140,0.09) 36%, transparent 66%)' }}
                initial={false}
                animate={shot === 'near' ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduced ? 1 : 0.25 }}
                transition={t} />
            <motion.div
                className="absolute inset-0 z-20"
                style={{ transformOrigin: `${CAMERA.origin.x}% ${CAMERA.origin.y}%`, pointerEvents: 'none' }}
                initial={false}
                animate={homeLayerFor(shot, reduced)}
                transition={t}
                aria-hidden={shot !== 'near'}
            >
                {homeMounted && (
                    <div className={`absolute inset-0 ${shot === 'near' ? '' : '[&_*]:!pointer-events-none'}`}>
                        <HomeSurfaceUnified />
                    </div>
                )}
            </motion.div>
        </div>
    );
});
