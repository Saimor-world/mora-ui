import React from 'react';

/**
 * Self-contained presentational cards/chips for the Home surface.
 * Extracted verbatim from HomeSurface.tsx — props-only, behavior-neutral.
 */

const CHIP_ACCENT: Record<string, { border: string; shadow: string }> = {
    Bereiche: { border: '2px solid rgba(52,211,153,0.55)', shadow: 'inset 2px 0 0 rgba(52,211,153,0.45)' },
    Signale:  { border: '2px solid rgba(251,191,36,0.55)', shadow: 'inset 2px 0 0 rgba(251,191,36,0.45)' },
    Privat:   { border: '2px solid rgba(100,116,139,0.55)', shadow: 'inset 2px 0 0 rgba(100,116,139,0.45)' },
    Website:  { border: '2px solid rgba(56,189,248,0.55)', shadow: 'inset 2px 0 0 rgba(56,189,248,0.45)' },
};

export const HomeChip: React.FC<{ label: string; value: number }> = ({ label, value }) => {
    const accent = CHIP_ACCENT[label];
    return (
        <div
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/40 overflow-hidden relative"
            style={accent ? { borderLeftColor: 'transparent', boxShadow: accent.shadow } : undefined}
        >
            {accent && (
                <span
                    className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-full"
                    style={{ background: accent.border.replace('2px solid ', '') }}
                />
            )}
            <span>{label}</span>
            <span className="ml-2 text-[11px] normal-case tracking-normal text-white/82">{value}</span>
        </div>
    );
};

const commandToneClass: Record<string, { border: string; bg: string; hoverBg: string; accent: string; label: string }> = {
    emerald: {
        border: 'rgba(52,211,153,0.22)',
        bg: 'rgba(16,185,129,0.07)',
        hoverBg: 'rgba(16,185,129,0.12)',
        accent: '#34d399',
        label: 'rgba(167,243,208,0.86)',
    },
    cyan: {
        border: 'rgba(103,232,249,0.22)',
        bg: 'rgba(34,211,238,0.06)',
        hoverBg: 'rgba(34,211,238,0.11)',
        accent: '#67e8f9',
        label: 'rgba(207,250,254,0.86)',
    },
    amber: {
        border: 'rgba(251,191,36,0.22)',
        bg: 'rgba(245,158,11,0.06)',
        hoverBg: 'rgba(245,158,11,0.11)',
        accent: '#fbbf24',
        label: 'rgba(254,243,199,0.86)',
    },
    violet: {
        border: 'rgba(167,139,250,0.22)',
        bg: 'rgba(139,92,246,0.07)',
        hoverBg: 'rgba(139,92,246,0.12)',
        accent: '#a78bfa',
        label: 'rgba(237,233,254,0.86)',
    },
    muted: {
        border: 'rgba(255,255,255,0.08)',
        bg: 'rgba(255,255,255,0.03)',
        hoverBg: 'rgba(255,255,255,0.06)',
        accent: 'rgba(255,255,255,0.40)',
        label: 'rgba(255,255,255,0.55)',
    },
};

export const HomeCommandButton: React.FC<{
    label: string;
    detail: string;
    onClick: () => void;
    tone: 'emerald' | 'cyan' | 'amber' | 'violet' | 'muted';
    dataTestId?: string;
}> = ({ label, detail, onClick, tone, dataTestId }) => {
    const t = commandToneClass[tone];
    return (
        <button
            type="button"
            data-testid={dataTestId}
            onClick={onClick}
            className="group relative overflow-hidden rounded-2xl px-4 py-3 text-left transition-all"
            style={{ border: `1px solid ${t.border}`, background: t.bg }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = t.bg; }}
        >
            {/* top shimmer */}
            <div
                className="pointer-events-none absolute left-0 top-0 h-[1px] w-full opacity-60"
                style={{ background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)` }}
            />
            <span className="block text-[12px] font-medium" style={{ color: t.label }}>{label}</span>
            <span className="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-white/28">{detail}</span>
        </button>
    );
};

const SIGNAL_CARD_PALETTE: Record<string, { border: string; accent: string; bg: string }> = {
    emerald: { border: 'rgba(52,211,153,0.18)',  accent: 'rgba(52,211,153,0.60)',  bg: 'rgba(16,185,129,0.05)' },
    violet:  { border: 'rgba(139,92,246,0.18)',  accent: 'rgba(167,139,250,0.60)', bg: 'rgba(139,92,246,0.05)' },
    cyan:    { border: 'rgba(34,211,238,0.18)',  accent: 'rgba(103,232,249,0.60)', bg: 'rgba(34,211,238,0.04)' },
    amber:   { border: 'rgba(245,158,11,0.18)',  accent: 'rgba(251,191,36,0.60)',  bg: 'rgba(245,158,11,0.04)' },
    muted:   { border: 'rgba(255,255,255,0.07)', accent: 'rgba(255,255,255,0.28)', bg: 'rgba(255,255,255,0.02)' },
};

export const HomeSignalCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    title: string;
    detail?: string | null;
    tone: 'emerald' | 'violet' | 'cyan' | 'amber' | 'muted';
    onClick: () => void;
}> = ({ icon, label, title, detail, tone, onClick }) => {
    const p = SIGNAL_CARD_PALETTE[tone];
    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative flex w-full items-center gap-2.5 overflow-hidden rounded-2xl px-3 py-2 text-left transition-all"
            style={{ border: `1px solid ${p.border}`, background: p.bg, borderLeftColor: p.accent.replace('0.60', '0.42') }}
        >
            <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background: p.accent.replace('0.60', '0.10'), border: `1px solid ${p.accent.replace('0.60', '0.20')}` }}
            >
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-white/76 group-hover:text-white/90">{title}</span>
                {detail ? <span className="block truncate text-[10px]" style={{ color: p.accent.replace('0.60', '0.55') }}>{detail}</span> : null}
            </span>
        </button>
    );
};

export const HomeMiniAction: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}> = ({ icon, label, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[10px] text-white/48 transition-colors hover:border-violet-300/16 hover:bg-violet-500/[0.07] hover:text-violet-100/74"
    >
        {icon}
        <span className="max-w-[9rem] truncate">{label}</span>
    </button>
);

export const SuggestionCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    actionText: string;
    tone: 'cyan' | 'violet' | 'amber' | 'emerald';
}> = ({ title, description, icon, onClick, actionText, tone }) => {
    const toneStyles = {
        cyan: {
            border: 'border-cyan-500/20 hover:border-cyan-400/40',
            bg: 'bg-cyan-500/[0.04] hover:bg-cyan-500/[0.08]',
            glow: 'shadow-[0_0_20px_rgba(34,211,238,0.1)]',
            iconBg: 'bg-cyan-500/10 text-cyan-400',
            btnBg: 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-400/20'
        },
        violet: {
            border: 'border-violet-500/20 hover:border-violet-400/40',
            bg: 'bg-violet-500/[0.04] hover:bg-violet-500/[0.08]',
            glow: 'shadow-[0_0_20px_rgba(139,92,246,0.1)]',
            iconBg: 'bg-violet-500/10 text-violet-400',
            btnBg: 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border-violet-400/20'
        },
        amber: {
            border: 'border-amber-500/20 hover:border-amber-400/40',
            bg: 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]',
            glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]',
            iconBg: 'bg-amber-500/10 text-amber-400',
            btnBg: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-400/20'
        },
        emerald: {
            border: 'border-emerald-500/20 hover:border-emerald-400/40',
            bg: 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]',
            glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]',
            iconBg: 'bg-emerald-500/10 text-emerald-400',
            btnBg: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/20'
        }
    }[tone];

    return (
        <div className={`group relative overflow-hidden rounded-2xl border ${toneStyles.border} ${toneStyles.bg} p-4 transition-all duration-300 hover:-translate-y-0.5 ${toneStyles.glow}`}>
            <div className="absolute -inset-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${toneStyles.iconBg}`}>
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-medium text-white/90">{title}</h4>
                    <p className="mt-1 text-[11px] font-light leading-relaxed text-white/60">{description}</p>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                        }}
                        className={`mt-3 flex items-center gap-1 rounded-xl border px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold transition-all ${toneStyles.btnBg}`}
                    >
                        {actionText}
                    </button>
                </div>
            </div>
        </div>
    );
}

const DEPT_PALETTES = [
    { border: 'rgba(103,232,249,0.22)', bg: 'rgba(34,211,238,0.07)', dot: 'rgba(103,232,249,0.75)', hover: 'rgba(34,211,238,0.13)' },
    { border: 'rgba(167,139,250,0.22)', bg: 'rgba(139,92,246,0.07)', dot: 'rgba(167,139,250,0.75)', hover: 'rgba(139,92,246,0.13)' },
    { border: 'rgba(251,191,36,0.22)',  bg: 'rgba(245,158,11,0.07)', dot: 'rgba(251,191,36,0.75)',  hover: 'rgba(245,158,11,0.13)' },
    { border: 'rgba(52,211,153,0.22)',  bg: 'rgba(16,185,129,0.07)', dot: 'rgba(52,211,153,0.75)',  hover: 'rgba(16,185,129,0.13)' },
    { border: 'rgba(248,113,113,0.22)', bg: 'rgba(239,68,68,0.07)',  dot: 'rgba(248,113,113,0.75)', hover: 'rgba(239,68,68,0.13)'  },
    { border: 'rgba(147,197,253,0.22)', bg: 'rgba(59,130,246,0.07)', dot: 'rgba(147,197,253,0.75)', hover: 'rgba(59,130,246,0.13)' },
];

export const DeptPlanetTile: React.FC<{
    dept: { id: string; name: string };
    count: number;
    active: boolean;
    loaded: boolean;
    colorIdx: number;
    onClick: () => void;
}> = ({ dept, count, active, loaded, colorIdx, onClick }) => {
    const palette = DEPT_PALETTES[colorIdx % DEPT_PALETTES.length];
    return (
        <button
            data-testid={`dept-tile-${dept.id}`}
            onClick={onClick}
            className="group relative min-w-0 overflow-hidden rounded-2xl px-3 py-3 text-left transition-all"
            style={{
                border: `1px solid ${active ? palette.border : 'rgba(255,255,255,0.07)'}`,
                background: active ? palette.bg : 'rgba(255,255,255,0.025)',
            }}
            onMouseEnter={(e) => { if (active) e.currentTarget.style.background = palette.hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = active ? palette.bg : 'rgba(255,255,255,0.025)'; }}
        >
            {/* subtle top shimmer on active */}
            {active && (
                <div
                    className="pointer-events-none absolute left-0 top-0 h-[1px] w-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${palette.dot.replace('0.75', '0.45')}, transparent)` }}
                />
            )}
            <div className="flex items-center gap-1.5">
                <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: active ? palette.dot : 'rgba(255,255,255,0.18)' }}
                />
                <span className="truncate text-[11px] font-medium text-white/76 group-hover:text-white/90">{dept.name}</span>
            </div>
            <div className="mt-1.5 text-[10px]" style={{ color: active ? palette.dot.replace('0.75', '0.55') : 'rgba(255,255,255,0.30)' }}>
                {active
                    ? `${count} ${count === 1 ? 'Inhalt' : 'Inhalte'}`
                    : loaded ? 'ruhig' : '…'}
            </div>
        </button>
    );
};
