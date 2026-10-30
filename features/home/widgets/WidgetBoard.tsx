import React from 'react';
import type { SourceWidget } from './types';
import './widgets.css';

function humanSourceName(source: string): string {
  const s = source.toLowerCase();
  if (s.includes('task') || s === 'tasks') return 'Aufgaben';
  if (s.includes('calendar') || s === 'core_calendar') return 'Kalender';
  if (s.includes('mail') || s === 'post') return 'Post';
  if (s.includes('kasse') || s === 'revenue') return 'Kasse';
  if (s.includes('schicht')) return 'Schichtplan';
  return source;
}

function humanTime(iso?: string | null): string | null {
  if (!iso) return null;
  if (!iso.includes('T') && !iso.endsWith('Z')) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Heute ${timeStr}`;
  const diffDays = Math.round((now.getTime() - d.getTime()) / 864e5);
  if (diffDays === 1) return `Gestern ${timeStr}`;
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} · ${timeStr}`;
}

export interface WidgetBoardProps {
  widgets: SourceWidget[];
  onOpen?: (id: string) => void;
}

/** Shared presentation: content and provenance come entirely from adapters. */
export function WidgetBoard({ widgets, onOpen }: WidgetBoardProps) {
  if (!widgets.length) return null;
  return (
    <section className="widget-board" aria-label="Quellenübersicht" data-testid="widget-board">
      {widgets.map((w) => {
        const clickable = Boolean(onOpen);
        return (
          <article
            className={`source-widget source-widget--${w.size}`}
            key={w.id}
            data-testid={`widget-${w.id}`}
            onClick={() => onOpen?.(w.id)}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            style={clickable ? { cursor: 'pointer' } : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onOpen?.(w.id);
              }
            }}
          >
            <h2>{w.title}</h2>
            {w.state === 'unavailable' ? <p>Quelle derzeit nicht verfügbar</p> : <WidgetBody content={w.content} />}
            <footer>
              {humanSourceName(w.source)}
              {w.demo ? <> · <span className="fiktiv-badge">Fiktive Demo</span></> : ''}
              {w.state === 'stale' ? ' · Stand veraltet' : ''}
              {w.updatedAt ? ` · ${humanTime(w.updatedAt)}` : ''}
            </footer>
          </article>
        );
      })}
    </section>
  );
}

function WidgetBody({ content }: { content: SourceWidget['content'] }) {
  if (content.type === 'metric') return <><strong>{content.value}</strong>{content.detail && <p>{content.detail}</p>}</>;
  if (content.type === 'status') return <><strong>{content.label}</strong>{content.detail && <p>{content.detail}</p>}</>;
  if (content.type === 'approval') return <><strong>{content.title}</strong>{content.detail && <p>{content.detail}</p>}</>;
  return (
    <ul>
      {content.items.map((item) => {
        const isOpen = item.detail?.includes('Offen');
        return (
          <li key={item.id}>
            {item.title}
            {item.detail && (
              <span style={isOpen ? { color: 'var(--amber, #f59e0b)', fontWeight: 500 } : undefined}>
                {' · '}{item.detail}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
