"use client";

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { usePaneStore } from '@/lib/store/paneStore';
import {
    Search,
    Folder,
    MessageCircle,
    Settings,
    Grid,
    Layout
} from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';

export const PhysicsDock = () => {
    const mouseX = useMotionValue(Infinity);
    const { openPane } = usePaneStore();
    const viewMode = useNavStore((s) => s.viewMode);

    return (
        <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-2xl glass-panel flex items-end gap-3 z-[100]"
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 20 }}
        >
            <DockIcon mouseX={mouseX} icon={Search} label="Search" onClick={() => {
                // Trigger Spotlight (search logic handled via shortcut or global state)
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }} />
            <DockIcon mouseX={mouseX} icon={Layout} label="Dashboard" onClick={() => openPane({ id: 'dashboard', type: 'apps', size: { width: 800, height: 600 }, title: 'Dashboard' })} />
            <DockIcon mouseX={mouseX} icon={Folder} label="Finder" onClick={() => openPane({ id: 'finder-main', type: 'finder', size: { width: 1280, height: 820 }, title: 'Finder' })} />

            <div className="w-px h-10 bg-white/10 mx-1" />

            <DockIcon mouseX={mouseX} icon={MessageCircle} label="Chat" onClick={() => openPane({ id: 'chat-main', type: 'chat', size: { width: 860, height: 680 }, title: 'Môra Chat' })} />

            <DockIcon mouseX={mouseX} icon={Settings} label="Settings" onClick={() => openPane({ id: 'settings-main', type: 'settings', size: { width: 700, height: 500 }, title: 'Settings' })} />
        </motion.div>
    );
};

function DockIcon({ mouseX, icon: Icon, label, onClick }: any) {
    const ref = useRef<HTMLDivElement>(null);

    const distance = useTransform(mouseX, (val: number) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - bounds.x - bounds.width / 2;
    });

    const widthSync = useTransform(distance, [-150, 0, 150], [48, 80, 48]);
    const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

    return (
        <motion.div
            ref={ref}
            style={{ width, height: width }}
            className="aspect-square rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center relative cursor-pointer transition-colors"
            onClick={onClick}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.10)' }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.08 }}
        >
            <Icon className="text-white/80 w-1/2 h-1/2" />

            {/* Tooltip: framer whileHover avoids CSS group-hover latency between layout layers */}
            <motion.div
                className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur rounded text-xs text-white pointer-events-none whitespace-nowrap border border-white/10"
                style={{ zIndex: 200 }}
                initial={{ opacity: 0, y: 4 }}
                whileHover={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
            >
                {label}
            </motion.div>
        </motion.div>
    );
}
