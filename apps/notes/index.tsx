'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Heading, List, ListChecks, Minus } from 'lucide-react';
import { AlertCircle, Check, CloudOff, FileText, FolderOpen, Loader2, Save } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { saveLocalPrivateTextFile } from '@/lib/files/localPrivateFiles';
import { usePaneStore } from '@/lib/store/paneStore';
import { toast } from '@/lib/toast';
import { useNotesSync } from './hooks/useNotesSync';
import { PaneWindow } from '@/components/layers/PaneWindow';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';

function toNoteFilename(text: string) {
  const firstLine = text
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .find(Boolean);
  const title = firstLine || 'Persönliche Notiz';
  const safe = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s._-]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 48) || 'Persönliche Notiz';
  return /\.md$/i.test(safe) ? safe : `${safe}.md`;
}

export default function NotesApp(props: AppProps) {
  // Universe v2: Notizen öffnen in einem echten Fenster statt flächig über dem Raum.
  if (isUniverseV2Enabled()) return <PaneWindow paneId={props.paneId} title="Notizen"><NotesBody {...props} /></PaneWindow>;
  return <NotesBody {...props} />;
}

function NotesBody({ paneId: _paneId }: AppProps) {
  const { content, setContent, loadState, saveState, handleBlur } = useNotesSync();
  const openPane = usePaneStore((state) => state.openPane);
  const [localSaveState, setLocalSaveState] = useState<'idle' | 'saved'>('idle');
  const areaRef = useRef<HTMLTextAreaElement>(null);
  // Format per Symbol: setzt das Zeichen an den Anfang der aktuellen Zeile.
  const insertPrefix = useCallback((prefix: string) => {
    const el = areaRef.current; const pos = el ? el.selectionStart : content.length;
    const lineStart = content.lastIndexOf('\n', pos - 1) + 1;
    const next = prefix.startsWith('\n') ? content.slice(0, pos) + prefix + content.slice(pos) : content.slice(0, lineStart) + prefix + content.slice(lineStart);
    setContent(next);
    requestAnimationFrame(() => { if (el) { el.focus(); const c = pos + prefix.length; el.setSelectionRange(c, c); } });
  }, [content, setContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleBlur();
    }
  }, [handleBlur]);

  const openPrivateFiles = useCallback((selectedFileId?: string) => {
    openPane({
      id: 'meine-dateien',
      type: 'meine-dateien',
      title: 'Meine Dateien',
      size: { width: 1120, height: 720 },
      data: selectedFileId ? { selectedFileId } : undefined,
    });
  }, [openPane]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const canSaveAsFile = useMemo(() => content.trim().length > 0, [content]);

  const saveIntoPrivateFiles = useCallback(() => {
    const text = content.trim() ? content : '# Persönliche Notiz\n\n';
    const file = saveLocalPrivateTextFile(toNoteFilename(text), text);
    setLocalSaveState('saved');
    setTimeout(() => setLocalSaveState('idle'), 1800);
    toast.success('Notiz in Meine Dateien abgelegt');
    openPrivateFiles(`local-${file.id}`);
  }, [content, openPrivateFiles]);

  if (isUniverseV2Enabled()) {
    const firstLine = content.split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).find(Boolean);
    const status = loadState === 'no-server' ? 'nur dieses Gerät' : saveState === 'saving' ? 'speichert …' : saveState === 'saved' ? 'gespeichert' : saveState === 'error' ? 'nicht gespeichert' : loadState === 'loading' ? 'lädt …' : 'in deinem Profil';
    return (
      <div className="flex h-full flex-col" data-uv2-app="notes">
        <div className="uv2-ftool" data-testid="notes-v2-bar">
          <div className="uv2-ftool__nav" role="toolbar" aria-label="Format">
            <button type="button" title="Überschrift" aria-label="Überschrift" onClick={() => insertPrefix('# ')}><Heading /></button>
            <button type="button" title="Liste" aria-label="Liste" onClick={() => insertPrefix('- ')}><List /></button>
            <button type="button" title="Checkliste" aria-label="Checkliste" onClick={() => insertPrefix('- [ ] ')}><ListChecks /></button>
            <button type="button" title="Trennlinie" aria-label="Trennlinie" onClick={() => insertPrefix('\n---\n')}><Minus /></button>
          </div>
          <span className="uv2-ftool__crumb" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{firstLine ? firstLine.slice(0, 60) : 'Neue Notiz'}</span>
          <span className="uv2-dot" data-on={saveState === 'saved' || loadState === 'ready' ? '' : undefined} data-warn={saveState === 'error' || loadState === 'no-server' ? '' : undefined} title={status} />
          <span className="uv2-notes__count">{wordCount}</span>
          <button type="button" className="uv2-pill" title="Meine Dateien" aria-label="Meine Dateien" onClick={() => openPrivateFiles()}><FolderOpen /></button>
          <button type="button" className="uv2-pill uv2-pill--gold" disabled={!canSaveAsFile} onClick={saveIntoPrivateFiles} data-testid="notes-v2-save"><Save />{localSaveState === 'saved' ? 'Abgelegt' : 'Als Datei'}</button>
        </div>
        <div className="relative min-h-0 flex-1">
          {loadState === 'loading' ? (
            <p className="px-8 py-10 font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(247,244,233,.5)]">Notizen werden geladen …</p>
          ) : (
            <textarea ref={areaRef} value={content} onChange={(e) => setContent(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown}
              placeholder="Schreib einfach los …" className="uv2-paper" spellCheck autoComplete="off" />
          )}
        </div>
        <div className="uv2-foot"><span>{charCount} Zeichen · ⌘S</span><span>{status}</span></div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col bg-[#040a07]/50">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-2 text-white/35">
          <FileText size={12} />
          <span className="text-[10px] uppercase tracking-[0.18em]">Schnelle Notiz</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px]">
          {loadState === 'no-server' ? (
            <span className="flex items-center gap-1 text-white/25">
              <CloudOff size={10} />
              nur dieses Gerät
            </span>
          ) : saveState === 'saving' ? (
            <span className="flex items-center gap-1 text-white/35">
              <Loader2 size={10} className="animate-spin" />
              speichert...
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
              lädt...
            </span>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-b border-white/[0.06] px-5 py-3 text-[11px] leading-relaxed text-white/42">
        Das ist dein schneller Schreibblock. Er speichert in deinem persönlichen OS-Profil, sobald die Verbindung steht.
        Wenn daraus eine Datei werden soll, lege sie bewusst in <span className="text-white/65">Meine Dateien</span> ab.
      </div>

      <div className="relative flex-1 overflow-hidden">
        {loadState === 'loading' ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-white/20">
            <Loader2 size={14} className="animate-spin" />
            Lade Notizen...
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={
              loadState === 'no-server'
                ? 'Tippe hier - als lokale Datei sicherbar, sobald du sie in Meine Dateien ablegst'
                : 'Gedanken, Aufgaben, Meeting-Notizen...'
            }
            className={[
              'absolute inset-0 h-full w-full',
              'resize-none border-none bg-transparent outline-none',
              'px-5 py-4 font-mono text-sm leading-relaxed text-white/80 placeholder:text-white/20',
            ].join(' ')}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
          />
        )}
      </div>

      {loadState !== 'loading' && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-2">
          <span className="text-[10px] text-white/20">
            {wordCount > 0 ? `${wordCount} Wörter - ${charCount} Zeichen` : 'Noch leer'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canSaveAsFile}
              onClick={saveIntoPrivateFiles}
              className={[
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition',
                canSaveAsFile
                  ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-50 hover:bg-emerald-400/16'
                  : 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/18',
              ].join(' ')}
            >
              {localSaveState === 'saved' ? <Check size={12} /> : <Save size={12} />}
              {localSaveState === 'saved' ? 'In Dateien' : 'Als Datei sichern'}
            </button>
            <button
              type="button"
              onClick={() => openPrivateFiles()}
              className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold text-white/45 transition hover:bg-white/[0.06] hover:text-white/70 sm:inline-flex"
            >
              <FolderOpen size={12} />
              Meine Dateien
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
