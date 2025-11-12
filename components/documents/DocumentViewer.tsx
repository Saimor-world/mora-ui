'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MoraObject } from '@/lib/types';
import { emitMoraEvent } from '@/lib/mora/listener';
import usePrefersReducedMotion from '@/lib/hooks/usePrefersReducedMotion';

interface DocumentViewerProps {
  object: MoraObject;
  onClose: () => void;
}

export default function DocumentViewer({ object, onClose }: DocumentViewerProps) {
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => onClose(), prefersReducedMotion ? 100 : 200);
  }, [onClose, prefersReducedMotion]);

  useEffect(() => {
    emitMoraEvent('open_document', {
      id: object.id,
      title: object.title,
      path: object.path,
      tags: object.tags,
    });
  }, [object]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleClose]);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusable = modal.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    (closeButtonRef.current ?? focusable[0])?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    modal.addEventListener('keydown', handleKeyDown);
    return () => modal.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderContent = () => {
    // Links - open in new tab
    if (object.type === 'link' && object.url) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="text-6xl opacity-50">🔗</div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-medium">{object.title}</h3>
            <p className="text-sm text-muted-foreground max-w-md">{object.url}</p>
          </div>
          <a
            href={object.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 mora-transition mora-glow mora-ripple font-medium tracking-wide"
          >
            Open Link →
          </a>
        </div>
      );
    }

    // PDFs - iframe preview (if file_url exists)
    if (object.type === 'file' && object.path?.endsWith('.pdf')) {
      const fileUrl = (object as any).file_url;
      const hasMockSource = object.source === 'mock' || !fileUrl;

      if (hasMockSource) {
        return (
          <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
            <div className="text-6xl opacity-50 mora-breathe">📄</div>
            <div className="text-center space-y-3 max-w-md">
              <h3 className="text-xl font-medium">{object.title}</h3>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-sm">
                Demo-Daten – Datei nicht verfügbar
              </div>
              <p className="text-sm text-muted-foreground">
                PDF-Vorschau ist verfügbar, sobald Dateien mit dem Core verbunden sind.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="h-full flex flex-col">
          <div className="flex-1 bg-muted/30 rounded-lg overflow-hidden p-2">
            <iframe
              src={fileUrl}
              className="w-full h-full rounded-lg"
              sandbox="allow-same-origin"
              title={object.title}
            />
          </div>
          <div className="p-4 flex justify-center">
            <a
              href={fileUrl}
              download={object.title}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 mora-transition mora-ripple font-medium"
              title={fileUrl ? 'Download PDF' : 'Demo-Quelle – später via Core verfügbar'}
              aria-disabled={!fileUrl}
            >
              📥 Download PDF
            </a>
          </div>
        </div>
      );
    }

    // Excel/Spreadsheets
    if (object.path?.match(/\.(xlsx?|csv)$/)) {
      const fileUrl = (object as any).file_url;
      const hasMockSource = object.source === 'mock' || !fileUrl;
      const rows =
        Array.isArray(object.metadata?.sample_rows) && object.metadata?.sample_rows.length > 0
          ? (object.metadata?.sample_rows as string[][])
          : [
              ['Quarter', 'Budget', 'Delta'],
              ['Q1', '120.000 €', '+3%'],
              ['Q2', '118.000 €', '-1%'],
            ];
      const lastModified = object.metadata?.updated_at
        ? new Date(object.metadata.updated_at).toLocaleString()
        : '–';

      return (
        <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
          <div className="text-6xl opacity-50 mora-breathe">📊</div>
          <div className="w-full max-w-2xl bg-card/80 border border-border rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-medium">{object.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {object.metadata?.size_kb ? `${object.metadata.size_kb} KB` : 'Spreadsheet'}
                </p>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                <p>Letzte Änderung</p>
                <p className="font-mono">{lastModified}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={`${row.join('-')}-${idx}`}
                      className={idx === 0 ? 'bg-muted/60 font-semibold' : 'odd:bg-muted/20'}
                    >
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-3 py-2 text-left">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMockSource ? (
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-700 text-sm">
                Demo-Daten – Download wird aktiv, sobald Core verbunden ist.
              </div>
            ) : fileUrl ? (
              <div className="flex flex-wrap gap-3">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex-1 px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 mora-transition mora-ripple font-medium"
                  title="In neuem Tab ansehen"
                >
                  🔗 In neuem Tab öffnen
                </a>
                <a
                  href={fileUrl}
                  download={object.title}
                  className="inline-flex-1 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 mora-transition mora-ripple font-medium"
                  title="Datei herunterladen"
                >
                  📥 Download
                </a>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    // Notes - rich text display
    if (object.type === 'note') {
      return (
        <div className="h-full overflow-auto">
          <div className="max-w-3xl mx-auto py-12 px-8">
            <h1 className="text-3xl font-light mb-8 text-foreground/90">{object.title}</h1>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                Note content will appear here once connected to Core storage.
              </p>
              {object.metadata && (
                <div className="mt-8 p-4 bg-muted/30 rounded-lg space-y-2 text-sm">
                  {Object.entries(object.metadata).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-muted-foreground">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Emails
    if (object.type === 'email') {
      return (
        <div className="h-full overflow-auto">
          <div className="max-w-3xl mx-auto py-12 px-8">
            <div className="mb-8 pb-6 border-b border-border/50">
              <h1 className="text-2xl font-light mb-4">{object.title}</h1>
              {object.metadata?.from && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>From: {object.metadata.from}</div>
                  {object.ts && <div>Date: {new Date(object.ts).toLocaleString()}</div>}
                </div>
              )}
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                Email content will appear here once connected to Core storage.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Tasks
    if (object.type === 'task') {
      return (
        <div className="h-full overflow-auto">
          <div className="max-w-2xl mx-auto py-12 px-8">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl">✓</div>
                  <h1 className="text-2xl font-light">{object.title}</h1>
                </div>
                {object.metadata?.status && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                    {object.metadata.status}
                  </div>
                )}
              </div>
              {object.metadata && (
                <div className="space-y-3 text-sm">
                  {object.metadata.priority && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24">Priority:</span>
                      <span className="font-medium">{object.metadata.priority}</span>
                    </div>
                  )}
                  {object.ts && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24">Created:</span>
                      <span>{new Date(object.ts).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Fallback for other types
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6">
        <div className="text-6xl opacity-50">📦</div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-medium">{object.title}</h3>
          <p className="text-sm text-muted-foreground">Type: {object.type}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop - sanftes Einblenden */}
      <div
        className={`fixed inset-0 bg-background/85 backdrop-blur-md z-50 mora-transition ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Modal - organisches Wachstum */}
      <div
        className={`fixed inset-4 md:inset-8 lg:inset-16 bg-card border border-border/50 rounded-3xl mora-depth-lg z-50 flex flex-col overflow-hidden mora-transition ${
          isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100 mora-grow'
        }`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={object.title}
      >
        {/* Header - mit sanftem Glühen */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/30 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <span className="text-3xl mora-breathe">{getIcon(object.type)}</span>
            <div>
              <h2 className="text-lg font-medium tracking-wide">{object.title}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{object.type}</span>
                {object.spaceId && (
                  <>
                    <span className="text-border">•</span>
                    <span>{object.spaceId}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            ref={closeButtonRef}
            className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary/80 mora-transition mora-ripple text-lg"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">{renderContent()}</div>

        {/* Footer with Tags - organisch fließend */}
        {object.tags && object.tags.length > 0 && (
          <div className="px-6 py-4 border-t border-border/30 bg-card/30 backdrop-blur-sm flex flex-wrap gap-2">
            {object.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 mora-transition cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    file: '📄',
    link: '🔗',
    note: '📝',
    email: '✉️',
    task: '✓',
  };
  return icons[type] || '📦';
}
