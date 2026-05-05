"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Bell, Brain, X } from 'lucide-react';
import type { RadarNotification } from '@/lib/store/radarStore';

interface MoraRadarToastProps {
  notification: RadarNotification;
  onOpen: () => void;
  onDismiss: () => void;
  onShowAll: () => void;
}

export function MoraRadarToast({
  notification,
  onOpen,
  onDismiss,
  onShowAll,
}: MoraRadarToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ type: 'spring', damping: 24, stiffness: 260 }}
      className="absolute bottom-full right-0 z-[500] mb-4 w-[360px] overflow-hidden rounded-2xl border border-amber-300/20 bg-[#090b08]/94 shadow-[0_28px_90px_rgba(0,0,0,0.55),0_0_60px_rgba(245,158,11,0.12)] backdrop-blur-2xl"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-200/20 bg-amber-300/12 text-amber-100">
              <Brain size={15} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-amber-100/48">Mora sieht etwas</p>
              <p className="mt-0.5 text-xs text-amber-50/78">Proaktiver Vorschlag</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-white/30 transition-colors hover:bg-white/8 hover:text-white/65"
            aria-label="Mora-Hinweis ausblenden"
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-sm font-medium leading-tight text-white/90">{notification.title}</p>
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/56">{notification.body}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onShowAll}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] text-white/45 transition-colors hover:bg-white/7 hover:text-white/75"
          >
            <Bell size={12} />
            Alle Signale
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/20 bg-amber-300/12 px-3 py-2 text-[11px] font-medium text-amber-50 transition-colors hover:bg-amber-300/18"
          >
            Jetzt ansehen
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
