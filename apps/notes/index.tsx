'use client';
import React, { useCallback } from 'react';
import { Check, Loader2, AlertCircle, FileText, CloudOff } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { useNotesSync } from './hooks/useNotesSync';

export default function NotesApp({ paneId }: AppProps) {
  const { content, setContent, loadState, saveState, handleBlur } = useNotesSync();

  // Ctrl+S / Cmd+S: flush any pending debounce immediately
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleBlur();
    }
  }, [handleBlur]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="flex flex-col h-full bg-[#040a07]/50">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 text-white/35">
          <FileText size={12} />
          <span className="text-[10px] uppercase tracking-[0.18em]">Persönliche Notizen</span>
        </div>

        {/* Save state indicator */}
        <div className="flex items-center gap-1.5 text-[10px]">
          {loadState === 'no-server' ? (
            <span className="flex items-center gap-1 text-white/20">
              <CloudOff size={10} />
              lokal
            </span>
          ) : saveState === 'saving' ? (
            <span className="flex items-center gap-1 text-white/35">
              <Loader2 size={10} className="animate-spin" />
              speichert…
            </span>
          ) : saveState === 'saved' ? (
            <span className="flex items-center gap-1 text-emerald-400/80">
              <Check size={10} />
              gespeichert
            </span>
          ) : saveState === 'error' ? (
            <span className="flex items-center gap-1 text-red-400/80">
              <AlertCircle size={10} />
              Fehler
            </span>
          ) : loadState === 'loading' ? (
            <span className="flex items-center gap-1 text-white/20">
              <Loader2 size={10} className="animate-spin" />
              lädt…
            </span>
          ) : null}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 relative overflow-hidden">
        {loadState === 'loading' ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-white/20 text-xs">
            <Loader2 size={14} className="animate-spin" />
            Lade Notizen…
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={
              loadState === 'no-server'
                ? 'Tippe hier — wird nicht gespeichert (kein Profil verfügbar)'
                : 'Notizen…'
            }
            className={[
              'absolute inset-0 w-full h-full',
              'bg-transparent border-none outline-none resize-none',
              'text-sm text-white/80 placeholder:text-white/20',
              'leading-relaxed px-5 py-4',
              'font-mono',
            ].join(' ')}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
          />
        )}
      </div>

      {/* Footer: word / char count + shortcut hint */}
      {loadState !== 'loading' && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] shrink-0">
          <span className="text-[10px] text-white/20">
            {wordCount > 0 ? `${wordCount} Wörter · ${charCount} Zeichen` : 'Leer'}
          </span>
          <span className="text-[10px] text-white/15 hidden sm:block">
            ⌘S speichern
          </span>
        </div>
      )}
    </div>
  );
}
