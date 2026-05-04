"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Info, Lightbulb, X, ArrowRight } from 'lucide-react';
import type { RadarNotification } from '@/lib/store/radarStore';

interface RadarCardProps {
  notification: RadarNotification;
  onDismiss: () => void;
  onAct?: () => void;
}

export const RadarCard: React.FC<RadarCardProps> = ({ notification, onDismiss, onAct }) => {
  const isInform = notification.tier === 'inform';
  const Icon = isInform ? Info : Lightbulb;
  const accentColor = isInform ? 'text-blue-400' : 'text-amber-400';
  const borderColor = isInform ? 'border-blue-500/30' : 'border-amber-500/30';
  const bgGlow = isInform ? 'bg-blue-500/5' : 'bg-amber-500/5';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`rounded-lg border p-3 ${borderColor} ${bgGlow}`}
    >
      <div className="flex items-start gap-2">
        <Icon size={14} className={`mt-0.5 shrink-0 ${accentColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/80 leading-tight">{notification.title}</p>
          <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">{notification.body}</p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
          aria-label="Schließen"
        >
          <X size={12} />
        </button>
      </div>
      {notification.tier === 'suggest' && onAct && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={onAct}
            className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
          >
            Ansehen <ArrowRight size={10} />
          </button>
        </div>
      )}
    </motion.div>
  );
};
