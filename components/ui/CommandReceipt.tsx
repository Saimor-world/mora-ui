"use client";

import React from 'react';

type ReceiptTone = 'slate' | 'emerald' | 'amber' | 'cyan' | 'blue' | 'violet' | 'red';

const toneStyles: Record<ReceiptTone, { shell: string; badge: string; dot: string; label: string }> = {
    slate: {
        shell: 'border-white/8 bg-white/[0.03]',
        badge: 'border-white/10 bg-white/[0.04] text-white/55',
        dot: 'bg-white/35',
        label: 'text-white/40',
    },
    emerald: {
        shell: 'border-emerald-400/16 bg-emerald-500/[0.06]',
        badge: 'border-emerald-400/16 bg-emerald-500/10 text-emerald-100/82',
        dot: 'bg-emerald-400',
        label: 'text-emerald-200/70',
    },
    amber: {
        shell: 'border-amber-400/18 bg-amber-500/[0.06]',
        badge: 'border-amber-400/18 bg-amber-500/10 text-amber-100/86',
        dot: 'bg-amber-400',
        label: 'text-amber-200/72',
    },
    cyan: {
        shell: 'border-cyan-400/18 bg-cyan-500/[0.05]',
        badge: 'border-cyan-400/18 bg-cyan-500/10 text-cyan-100/84',
        dot: 'bg-cyan-400',
        label: 'text-cyan-200/72',
    },
    blue: {
        shell: 'border-blue-400/18 bg-blue-500/[0.05]',
        badge: 'border-blue-400/18 bg-blue-500/10 text-blue-100/84',
        dot: 'bg-blue-400',
        label: 'text-blue-200/72',
    },
    violet: {
        shell: 'border-violet-400/18 bg-violet-500/[0.05]',
        badge: 'border-violet-400/18 bg-violet-500/10 text-violet-100/84',
        dot: 'bg-violet-400',
        label: 'text-violet-200/72',
    },
    red: {
        shell: 'border-red-400/18 bg-red-500/[0.05]',
        badge: 'border-red-400/18 bg-red-500/10 text-red-100/84',
        dot: 'bg-red-400',
        label: 'text-red-200/72',
    },
};

export interface CommandReceiptChip {
    label: React.ReactNode;
    tone?: ReceiptTone;
}

interface CommandReceiptProps {
    tone?: ReceiptTone;
    label: React.ReactNode;
    title?: React.ReactNode;
    body?: React.ReactNode;
    chips?: CommandReceiptChip[];
    actions?: React.ReactNode;
    footer?: React.ReactNode;
    icon?: React.ComponentType<any>;
    dismiss?: React.ReactNode;
    className?: string;
}

export const CommandReceipt: React.FC<CommandReceiptProps> = ({
    tone = 'slate',
    label,
    title,
    body,
    chips,
    actions,
    footer,
    icon: Icon,
    dismiss,
    className = '',
}) => {
    const styles = toneStyles[tone];

    return (
        <div className={`rounded-[24px] border backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden ${styles.shell} ${className}`}>
            <div className="flex items-start gap-4 px-5 py-4">
                {Icon ? (
                    <div className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${styles.badge}`}>
                        <Icon className={styles.label} size={20} />
                    </div>
                ) : (
                    <div className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} />
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className={`text-[11px] uppercase tracking-[0.24em] font-semibold ${styles.label}`}>{label}</div>
                            {title && <div className="mt-1 text-sm text-white/82 leading-relaxed">{title}</div>}
                        </div>
                        {dismiss}
                    </div>

                    {body && <div className="mt-2 text-sm text-white/72 leading-relaxed">{body}</div>}

                    {chips && chips.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {chips.map((chip, index) => {
                                const chipStyles = toneStyles[chip.tone || tone];
                                return (
                                    <span
                                        key={`${index}-${typeof chip.label === 'string' ? chip.label : index}`}
                                        className={`rounded-full border px-2.5 py-1 text-[11px] ${chipStyles.badge}`}
                                    >
                                        {chip.label}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
                    {footer && <div className="mt-3 text-[11px] leading-relaxed text-white/42">{footer}</div>}
                </div>
            </div>
        </div>
    );
};

export type { ReceiptTone };
