import React from 'react';
import type { SourceWidget } from './types';
import './widgets.css';

/** Shared presentation: content and provenance come entirely from adapters. */
export function WidgetBoard({ widgets }: { widgets: SourceWidget[] }) {
  if (!widgets.length) return null;
  return <section className="widget-board" aria-label="Quellenübersicht" data-testid="widget-board">
    {widgets.map(w => <article className={`source-widget source-widget--${w.size}`} key={w.id} data-testid={`widget-${w.id}`}>
      <h2>{w.title}</h2>
      {w.state === 'unavailable' ? <p>Quelle derzeit nicht verfügbar</p> : <WidgetBody content={w.content} />}
      <footer>{w.source}{w.demo ? ' · Fiktive Demo' : ''}{w.state === 'stale' ? ' · Stand veraltet' : ''}{w.updatedAt ? ` · ${w.updatedAt}` : ''}</footer>
    </article>)}
  </section>;
}
function WidgetBody({ content }: { content: SourceWidget['content'] }) {
  if (content.type === 'metric') return <><strong>{content.value}</strong>{content.detail && <p>{content.detail}</p>}</>;
  if (content.type === 'status') return <><strong>{content.label}</strong>{content.detail && <p>{content.detail}</p>}</>;
  if (content.type === 'approval') return <><strong>{content.title}</strong>{content.detail && <p>{content.detail}</p>}</>;
  return <ul>{content.items.map(item => <li key={item.id}>{item.title}{item.detail && <span> · {item.detail}</span>}</li>)}</ul>;
}
