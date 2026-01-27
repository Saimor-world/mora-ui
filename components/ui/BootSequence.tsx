import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BootSequenceProps {
    onComplete: () => void;
    user?: { name: string; role: string } | null;
    companyName?: string;
    environment?: string;
}

export const BootSequence: React.FC<BootSequenceProps> = ({
    onComplete,
    user,
    companyName = "UNKNOWN SECTOR",
    environment = "production"
}) => {
    const [logs, setLogs] = useState<string[]>([]);

    // Generate logs based on REAL data
    const dynamicLogs = useMemo(() => {
        const timestamp = new Date().toISOString().split('T')[1].substring(0, 8); // HH:MM:SS
        return [
            `[${timestamp}] INITIALIZING CORTEX KERNEL...`,
            `[SYS] ENV_DETECTED: ${environment.toUpperCase()}`,
            `[AUTH] VERIFYING IDENTITY...`,
            user ? `[AUTH] USER_RECOGNIZED: ${user.name.toUpperCase()} (ROLE: ${user.role.toUpperCase()})` : `[AUTH] ANONYMOUS SESSION`,
            `[NET] ESTABLISHING SECURE CONNECTION...`,
            `[DATA] SYNCING NEURAL GRAPH...`,
            `[CTX] MOUNTING WORKSPACE: ${companyName.toUpperCase()}`,
            `[SYS] READY.`
        ];
    }, [user, companyName, environment]);

    useEffect(() => {
        let isMounted = true;
        const timeouts: NodeJS.Timeout[] = [];
        let totalDelay = 0;

        // Reset logs
        setLogs([]);

        // Create a stable copy of logs to use for this run
        // We do not want to restart the sequence if props change mid-boot
        const stableLogs = [...dynamicLogs];

        stableLogs.forEach((log, index) => {
            totalDelay += Math.random() * 200 + 150;

            const tid = setTimeout(() => {
                if (!isMounted) return;
                setLogs(prev => {
                    if (prev.includes(log)) return prev;
                    return [...prev, log];
                });

                if (index === stableLogs.length - 1) {
                    const finalTid = setTimeout(() => {
                        if (isMounted) onComplete();
                    }, 800);
                    timeouts.push(finalTid);
                }
            }, totalDelay);
            timeouts.push(tid);
        });

        return () => {
            isMounted = false;
            timeouts.forEach(clearTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // CRITICAL: Run once on mount! Do not restart on prop changes.
    // We ignore dynamicLogs dependency intentionally to prevent reset loops.

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-black font-mono text-emerald-500/80 p-10 z-[100] absolute inset-0">
            <div className="w-full max-w-lg space-y-1.5">
                <AnimatePresence>
                    {logs.map((log, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-xs md:text-sm tracking-wider flex items-start font-medium"
                        >
                            <span className="text-emerald-500/30 mr-3 select-none">{`>`}</span>
                            <span className={log.includes('ERROR') ? 'text-red-400' : log.includes('SYS') ? 'text-blue-400/80' : 'text-emerald-500/90'}>
                                {log}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing Cursor */}
                <motion.div
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-2 h-4 bg-emerald-500/80 mt-2 ml-4"
                />
            </div>

            {/* Background Grid for OS feel */}
            <div
                className="absolute inset-0 pointer-events-none opacity-5"
                style={{
                    backgroundImage: 'linear-gradient(#059669 1px, transparent 1px), linear-gradient(90deg, #059669 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Corner Info */}
            <div className="absolute bottom-8 right-8 text-[10px] text-emerald-500/20 font-mono">
                SAIMÔR v1.5.0-R1 // {new Date().getFullYear()}
            </div>
        </div>
    );
};
