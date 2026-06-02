/**
 * One status/severity language for MÔRA's UI.
 *
 * Single source of truth for the colours, icons and labels that were previously
 * duplicated across OpenFlowLagebild, ToolTrace, homeCards, openflow/presentation
 * and actionCenter/format. This does NOT introduce a new design language — it
 * consolidates the meaning that already exists (emerald=done, amber=attention,
 * red=critical, cyan=info, violet=suggestion, slate=neutral).
 */
import {
    CheckCircle2,
    Info,
    AlertTriangle,
    AlertOctagon,
    Sparkles,
    Circle,
    type LucideIcon,
} from 'lucide-react';

export type StatusTone = 'success' | 'info' | 'warning' | 'critical' | 'suggestion' | 'neutral';

export const STATUS_TONES: StatusTone[] = ['success', 'info', 'warning', 'critical', 'suggestion', 'neutral'];

export interface ToneStyle {
    /** text colour */
    text: string;
    /** solid dot / indicator background */
    dot: string;
    /** subtle border */
    border: string;
    /** subtle fill */
    bg: string;
    /** default icon for the tone */
    icon: LucideIcon;
    /** default German label */
    label: string;
}

export const TONES: Record<StatusTone, ToneStyle> = {
    success:    { text: 'text-emerald-300', dot: 'bg-emerald-400', border: 'border-emerald-500/25', bg: 'bg-emerald-500/10', icon: CheckCircle2,   label: 'Erledigt' },
    info:       { text: 'text-cyan-300',    dot: 'bg-cyan-400',    border: 'border-cyan-500/25',    bg: 'bg-cyan-500/10',    icon: Info,           label: 'Info' },
    warning:    { text: 'text-amber-300',   dot: 'bg-amber-400',   border: 'border-amber-500/25',   bg: 'bg-amber-500/10',   icon: AlertTriangle,  label: 'Achtung' },
    critical:   { text: 'text-red-300',     dot: 'bg-red-400',     border: 'border-red-500/25',     bg: 'bg-red-500/10',     icon: AlertOctagon,   label: 'Kritisch' },
    suggestion: { text: 'text-violet-300',  dot: 'bg-violet-400',  border: 'border-violet-500/25',  bg: 'bg-violet-500/10',  icon: Sparkles,       label: 'Vorschlag' },
    neutral:    { text: 'text-white/55',    dot: 'bg-white/30',    border: 'border-white/10',       bg: 'bg-white/[0.04]',   icon: Circle,         label: '' },
};

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

/** Severity score (0..1) → priority band. Thresholds preserved from openflow/presentation. */
export function priorityFromSeverity(severity?: number | null): Priority {
    if (typeof severity !== 'number') return 'normal';
    if (severity >= 0.86) return 'urgent';
    if (severity >= 0.66) return 'high';
    if (severity >= 0.33) return 'normal';
    return 'low';
}

const PRIORITY_TONE: Record<Priority, StatusTone> = {
    urgent: 'critical',
    high: 'warning',
    normal: 'info',
    low: 'neutral',
};

export function toneForPriority(priority: Priority): StatusTone {
    return PRIORITY_TONE[priority] ?? 'neutral';
}

const ACTION_STATUS_TONE: Record<string, StatusTone> = {
    done: 'success',
    failed: 'critical',
    rejected: 'neutral',
    expired: 'neutral',
    running: 'info',
    proposed: 'info',
    pending_confirmation: 'warning',
};

export function toneForActionStatus(status: string): StatusTone {
    return ACTION_STATUS_TONE[status] ?? 'neutral';
}

const ACTION_STATUS_LABEL: Record<string, string> = {
    proposed: 'Vorgeschlagen',
    running: 'Läuft',
    pending_confirmation: 'Wartet auf Bestätigung',
    done: 'Abgeschlossen',
    failed: 'Fehlgeschlagen',
    rejected: 'Verworfen',
    expired: 'Abgelaufen',
};

/** German label for an action status. Falls back to the raw status. */
export function actionStatusLabel(status: string): string {
    return ACTION_STATUS_LABEL[status] ?? status;
}
