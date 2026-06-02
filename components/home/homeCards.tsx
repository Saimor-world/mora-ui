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
