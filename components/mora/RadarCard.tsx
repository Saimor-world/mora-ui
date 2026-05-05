"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Clock3, FileText, FolderOpen, Info, Layers3, Lightbulb, MapPin } from 'lucide-react';
import type { RadarNotification } from '@/lib/store/radarStore';

interface RadarCardProps {
  notification: RadarNotification;
  onDismiss: () => void;
  onAct?: () => void;
}

export const RadarCard: React.FC<RadarCardProps> = ({ notification, onDismiss, onAct }) => {
  const isInform = notification.tier === 'inform';
  const Icon = isInform ? Info : Lightbulb;
  const signal = getSignalMeta(notification.signal_type, notification.entity_type);
  const TargetIcon = signal.targetIcon;
  const tone = isInform
    ? {
        label: 'Hinweis',
        accent: 'text-blue-300',
        muted: 'text-blue-200/60',
        border: 'border-blue-400/25',
        bg: 'bg-blue-500/[0.07]',
        button: 'text-blue-200 hover:text-blue-100 hover:bg-blue-400/10',
      }
    : {
        label: 'Vorschlag',
        accent: 'text-amber-300',
        muted: 'text-amber-200/65',
        border: 'border-amber-400/35',
        bg: 'bg-amber-500/[0.08]',
        button: 'text-amber-200 hover:text-amber-100 hover:bg-amber-400/10',
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`rounded-lg border p-3 shadow-[0_14px_40px_rgba(0,0,0,0.18)] ${tone.border} ${tone.bg}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className={`inline-flex items-center gap-1.5 rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-medium ${tone.accent}`}>
          <Icon size={11} />
          <span>{tone.label}</span>
          <span className={tone.muted}>/ {signal.label}</span>
        </div>
        <div className="inline-flex items-center gap-1 text-[10px] text-white/35">
          <Clock3 size={10} />
          <span>{formatRadarTime(notification.created_at)}</span>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-tight text-white/90">{notification.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/55">{notification.body}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 rounded-md border border-white/8 bg-black/20 p-2">
        <div className="flex items-start gap-2">
          <TargetIcon size={13} className={`mt-0.5 shrink-0 ${tone.accent}`} />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/32">Mora sieht</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/62">{signal.read}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <ArrowRight size={13} className="mt-0.5 shrink-0 text-white/34" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/32">Naechster Schritt</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/58">{signal.next}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={onDismiss}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/45 transition-colors hover:bg-white/7 hover:text-white/70"
        >
          <Check size={11} />
          Erledigt
        </button>
        {onAct && (
          <button
            onClick={onAct}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${tone.button}`}
          >
            {signal.cta} <ArrowRight size={10} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

function getSignalMeta(signalType: string, entityType?: string): {
  label: string;
  read: string;
  next: string;
  cta: string;
  targetIcon: typeof FileText;
} {
  const normalized = signalType
    .replace(/Rule$/, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();

  switch (normalized) {
    case 'stale_document':
      return {
        label: 'Dokument',
        read: 'Ein Dokument liegt in einem aktiven Bereich, wurde selbst aber laenger nicht beruehrt.',
        next: 'Oeffne es im Kontext und entscheide: aktualisieren, archivieren oder jemandem zuweisen.',
        cta: entityType === 'folder' ? 'Ordner oeffnen' : 'Dokument oeffnen',
        targetIcon: FileText,
      };
    case 'inactive_space':
      return {
        label: 'Bereich',
        read: 'Ein Space wirkt still, obwohl er noch Teil der Arbeitsstruktur ist.',
        next: 'Pruefe, ob der Bereich noch gebraucht wird oder als Archiv markiert werden sollte.',
        cta: 'Bereich oeffnen',
        targetIcon: Layers3,
      };
    case 'deadline_proximity':
      return {
        label: 'Termin',
        read: 'Ein Titel enthaelt ein nahes Datum, aber es gibt kein aktuelles Update dazu.',
        next: 'Oeffne das Dokument, klaere Status und naechste Verantwortung.',
        cta: 'Termin ansehen',
        targetIcon: FileText,
      };
    case 'duplicate_folder':
      return {
        label: 'Ordner',
        read: 'Mora hat aehnliche Ordnernamen in getrennten Bereichen erkannt.',
        next: 'Oeffne den neuen Ordner und klaere, ob zusammenfuehren oder sauber trennen sinnvoll ist.',
        cta: 'Ordner oeffnen',
        targetIcon: FolderOpen,
      };
    case 'hot_document':
      return {
        label: 'Aktivitaet',
        read: 'Ein Dokument wurde auffaellig oft bearbeitet. Dort entsteht gerade Arbeit oder Reibung.',
        next: 'Oeffne es und pruefe, ob eine Entscheidung, Zusammenfassung oder Aufgabe fehlt.',
        cta: 'Dokument oeffnen',
        targetIcon: FileText,
      };
    case 'missing_recurring_update':
      return {
        label: 'Routine',
        read: 'Ein Bereich hatte wiederkehrende Updates, diesmal fehlt dieses Muster.',
        next: 'Pruefe kurz, ob die Routine ausgesetzt, vergessen oder abgeschlossen ist.',
        cta: 'Routine pruefen',
        targetIcon: Layers3,
      };
    default:
      return {
        label: normalized.replace(/_/g, ' '),
        read: 'Mora hat ein Signal aus deinem Workspace erkannt.',
        next: 'Oeffne den betroffenen Ort und entscheide, ob daraus eine Aufgabe wird.',
        cta: entityType === 'folder' ? 'Ort oeffnen' : 'Ansehen',
        targetIcon: entityType === 'folder' ? FolderOpen : entityType === 'space' ? Layers3 : MapPin,
      };
  }
}

function formatRadarTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'gerade';

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'gerade';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}
