'use client';

import React from 'react';
import { ArrowUpRight, BookOpen, FileText, FolderOpen, RefreshCw } from 'lucide-react';
import type { useKnowledgeLibrary } from '../hooks/useKnowledgeLibrary';
import type { OpenableSearchResult } from '@/lib/utils/searchOpen';

export function KnowledgeStart({ companyId, companyName, onOpen, onBrowse, recent, onSearch, library }: {
  companyId: string | null; companyName: string | null;
  onOpen: (entry: OpenableSearchResult) => void; onBrowse: () => void;
  recent: string[]; onSearch: (query: string) => void;
  library: ReturnType<typeof useKnowledgeLibrary>;
}) {
  const { entries, loading, unavailable, reload } = library;
  const spaces = entries.filter(entry => entry.type === 'space');
  const documents = entries.filter(entry => entry.type === 'node');
  const folders = entries.filter(entry => entry.type === 'folder');
  return <section className="uv2-knowledge" data-testid="knowledge-start">
    <div className="uv2-knowledge__intro">
      <span className="uv2-knowledge__eyebrow"><BookOpen size={16} /> Wissen · {companyName || 'Deine Organisation'}</span>
      <h2>Zusammenhänge beginnen<br />bei deinen Inhalten.</h2>
      <p>Öffne einen Arbeitsraum, lies ein Dokument oder suche mit einer Frage. Der Ablageort bleibt dabei sichtbar.</p>
      <button className="uv2-knowledge__browse" type="button" onClick={onBrowse} disabled={!companyId}>Ablage öffnen <ArrowUpRight size={16} /></button>
    </div>
    {!companyId ? <p role="status">Wähle zuerst eine Organisation.</p> : loading ? <p role="status">Deine Wissensräume werden geladen …</p> : unavailable ? <div role="alert" className="uv2-knowledge__notice">
      <p>Deine Inhalte konnten nicht vollständig geladen werden.</p>
      <button type="button" onClick={reload}><RefreshCw size={14} /> Erneut laden</button>
    </div> : <>
      <div className="uv2-knowledge__section-head"><h3>Deine Arbeitsräume</h3><span>{spaces.length ? `${spaces.length} zugänglich` : 'Platz für dein Wissen'}</span></div>
      {spaces.length ? <div className="uv2-knowledge__spaces">{spaces.slice(0, 6).map(entry => <button type="button" key={entry.id} onClick={() => onOpen(entry)}>
        <FolderOpen size={21} strokeWidth={1.3} /><strong>{entry.title}</strong><span>{entry.path?.split(' › ').slice(0, -1).join(' › ') || companyName}</span><ArrowUpRight size={16} />
      </button>)}</div> : <p className="uv2-knowledge__empty">Hier erscheinen die Arbeitsräume, auf die du Zugriff hast. Du kannst deine Ablage öffnen und dort Inhalte einordnen.</p>}
      <div className="uv2-knowledge__section-head"><h3>Dokumente im Zusammenhang</h3><span>Aus deiner Ablage</span></div>
      {documents.length ? <div className="uv2-knowledge__documents">{documents.slice(0, 5).map(entry => <button type="button" key={entry.id} onClick={() => onOpen(entry)}>
        <FileText size={18} /><span><strong>{entry.title}</strong><small>{entry.path?.split(' › ').slice(0, -1).join(' › ')}</small></span><ArrowUpRight size={15} />
      </button>)}</div> : <p className="uv2-knowledge__empty">{folders.length ? 'Deine Ordner sind da. Sobald Dokumente darin liegen, kannst du sie hier direkt öffnen.' : 'Noch keine Dokumente in dieser Ansicht. Suche nach einem Inhalt oder öffne deine Ablage.'}</p>}
    </>}
    {recent.length > 0 && <div className="uv2-knowledge__recent"><h3>Zuletzt gesucht</h3>{recent.map(query => <button type="button" key={query} onClick={() => onSearch(query)}>{query}</button>)}</div>}
  </section>;
}
