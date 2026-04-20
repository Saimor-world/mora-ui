'use client';
import React from 'react';
import { Check, Loader2, AlertCircle, FileText } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { useNotesSync } from './hooks/useNotesSync';

export default function NotesApp({ paneId }: AppProps) {
  const { content, setContent, loadState, saveState, handleBlur } = useNotesSync();

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/40">
          <FileText size={13} />
          <span className="text-xs">Persönliche Notizen</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          {loadState === 'no-server' ? (
            <span className="text-white/20">nicht gespeichert</span>
          ) : saveState === 'saving' ? (
            <><Loader2 size={10} className="animate-spin text-white/30" /><span className="text-white/30">speichert...</span></>
          ) : saveState === 'saved' ? (
            <><Check size={10} className="text-emerald-400" /><span className="text-emerald-400/70">gespeichert</span></>
          ) : saveState === 'error' ? (
            <><AlertCircle size={10} className="text-red-400" /><span className="text-red-400/70">Fehler</span></>
          ) : loadState === 'ready' ? (
            <span className="text-white/20">Server</span>
          ) : null}
        </div>
      </div>

      {/* Content */}
      {loadState === 'loading' ? (
        <div className="flex items-center gap-2 text-white/20 text-xs py-4">
          <Loader2 size={12} className="animate-spin" />
          Lade Notizen...
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          placeholder={
            loadState === 'no-server'
              ? 'Tippe hier — Notizen werden nicht gespeichert (kein persönlicher Bereich)'
              : 'Persönliche Notizen...'
          }
          className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-white/80 placeholder:text-white/20 leading-relaxed"
        />
      )}
    </div>
  );
}
