import React from 'react';

/**
 * Floating banner that tells the user which non-production mode the OS is in
 * (playground / demo / preview / visitor). Renders nothing for real HQ.
 * Extracted verbatim from MoraShell.tsx — behavior-neutral.
 */
export const ModeIndicatorBanner: React.FC<{ activeMode: 'real_hq' | 'public_playground' | 'personal_demo' | 'private_preview' | 'visitor' }> = ({ activeMode }) => {
    if (activeMode === 'real_hq') return null;

    let borderClass = '';
    let bgClass = '';
    let glowColor = '';
    let modeText = '';
    let badgeText = '';

    if (activeMode === 'public_playground') {
        borderClass = 'border-cyan-500/30';
        bgClass = 'bg-cyan-500/5';
        glowColor = 'shadow-[0_0_20px_rgba(6,182,212,0.15)]';
        badgeText = 'Website-HQ / Public Playground';
        modeText = 'Geteilte Umgebung. Du kannst Beiträge auf der Wall schreiben.';
    } else if (activeMode === 'personal_demo') {
        borderClass = 'border-violet-500/30';
        bgClass = 'bg-violet-500/5';
        glowColor = 'shadow-[0_0_20px_rgba(139,92,246,0.15)]';
        badgeText = 'Personal Demo';
        modeText = 'Deine private Testumgebung. Experimente werden nicht veröffentlicht.';
    } else if (activeMode === 'private_preview') {
        borderClass = 'border-amber-500/30';
        bgClass = 'bg-amber-500/5';
        glowColor = 'shadow-[0_0_20px_rgba(245,158,11,0.15)]';
        badgeText = 'Private Preview';
        modeText = 'Zeitlich begrenzte Voransicht. Deine Sitzung endet nach 24 Stunden; deine Daten werden nach 20 Tagen gelöscht.';
    } else if (activeMode === 'visitor') {
        borderClass = 'border-emerald-500/30';
        bgClass = 'bg-emerald-500/5';
        glowColor = 'shadow-[0_0_20px_rgba(16,185,129,0.15)]';
        badgeText = 'Visitor';
        modeText = 'Deine personalisierte Ansicht basierend auf deinem Security Scan.';
    }

    return (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[49] flex items-center gap-3 px-4 py-2 rounded-full border ${borderClass} ${bgClass} backdrop-blur-xl ${glowColor} transition-all pointer-events-auto`}>
            <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    activeMode === 'public_playground' ? 'bg-cyan-400' : activeMode === 'personal_demo' ? 'bg-violet-400' : activeMode === 'visitor' ? 'bg-emerald-400' : 'bg-amber-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    activeMode === 'public_playground' ? 'bg-cyan-500' : activeMode === 'personal_demo' ? 'bg-violet-500' : activeMode === 'visitor' ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                {badgeText}
            </span>
            <span className="text-white/40 font-light">|</span>
            <span className="text-xs text-white/70 max-w-sm truncate">
                {modeText}
            </span>
        </div>
    );
};
