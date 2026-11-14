/**
 * Sofortfixes aus dem externen Audit des Live-OS – jeweils das beobachtbare Verhalten:
 * 1. Mappe: keine Vorlagen-/Demo-Zeilen in echten Firmendaten, nur in der getrennten Demo.
 * 2. Buch am Pult: eine hochgeladene Datei (/v3/files) öffnet ruhig und ehrlich, nie ein hängendes Buch.
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mutate = jest.fn();
const fetchNodeDetails = jest.fn();
const createNode = jest.fn();
const getFilePreview = jest.fn();
jest.mock('@/lib/api/orgClient', () => ({ fetchNodeDetails: (...a: unknown[]) => fetchNodeDetails(...a), createNode: (...a: unknown[]) => createNode(...a) }));
jest.mock('@/lib/api/filesClient', () => ({ getFilePreview: (...a: unknown[]) => getFilePreview(...a), fetchCompanyFileBlob: jest.fn() }));
jest.mock('@/lib/queries/useNodes', () => ({ useUpdateNode: () => ({ mutate }) }));

import { Mappe } from '@/features/werkstatt/ui/Mappe';
import { Book, BOOK_READ_TIMEOUT_MS } from '@/features/werkstatt/ui/Book';
import type { Stage } from '@/features/werkstatt/model/stage';

const TODAY = '2026-11-10';
const stage = { k: 0.75, x: 0, y: 0, w: 1440, h: 810 } as unknown as Stage;
const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }); };

// jsdom misst nicht: Höhe eines Textstücks = Zeilen à 40 Zeichen × 34,5 Einheiten (wie im Verhaltens-Test).
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get(this: HTMLElement) {
    if (!this.classList.contains('wk-piece')) return 0;
    return Math.max(1, Math.ceil((this.textContent ?? '').length / 40)) * 34.5 + 13;
  } });
});
const settled = (c: HTMLElement) => waitFor(() => expect(c.querySelector('[aria-busy="true"]')).toBeNull());

beforeEach(() => {
  jest.clearAllMocks();
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() }));
});

describe('Mappe: Vorlagen nur in der Demo', () => {
  it('„Erste Woche anlegen“ in einer echten Abteilung schreibt keine Café- oder Vorlagen-Zeilen nach CORE', async () => {
    createNode.mockResolvedValue({ id: 'n-new' });
    wrap(<Mappe weeks={[]} folderId="f-real" companyId="company-saimor" today={TODAY} defaultRows={['Theke', 'Küche', 'Einkauf']} back={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Erste Woche anlegen/i }));
    await flush();
    expect(createNode).toHaveBeenCalledTimes(1);
    const content = String(createNode.mock.calls[0][0].content);
    expect(content).not.toMatch(/Theke|Küche|Einkauf|Aufgaben|Termine|Notizen/);
    expect(content).toContain('# Wochenplan KW');
  });
  it('in der getrennten Café-Morgenrot-Demo (demo-morgenrot) bleiben die Demo-Zeilen erhalten', async () => {
    createNode.mockResolvedValue({ id: 'n-demo' });
    wrap(<Mappe weeks={[]} folderId="f-demo" companyId="demo-morgenrot" today={TODAY} defaultRows={['Theke', 'Küche']} back={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Erste Woche anlegen/i }));
    await flush();
    expect(String(createNode.mock.calls[0][0].content)).toContain('| Theke |');
  });
});

describe('Buch am Pult: Datei aus /v3/files', () => {
  it('öffnet eine hochgeladene Datei als Leseansicht – ohne /v3/nodes, ohne Speichern, ohne „Offline“', async () => {
    getFilePreview.mockResolvedValue({ previewAvailable: true, content: '# Lieferschein\n\nZwölf Kisten Hafer.' });
    const { container } = wrap(<Book id="file-42" fallbackTitle="lieferschein.pdf" folderId="f-1" stage={stage} back={null} file />);
    await settled(container);
    expect(fetchNodeDetails).not.toHaveBeenCalled();
    expect(getFilePreview).toHaveBeenCalledWith('file-42');
    expect(container.textContent).toContain('Zwölf Kisten Hafer');
    expect(container.textContent).not.toMatch(/offline|fehler|nicht erreichbar/i);
    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).toBeNull();
    expect(container.querySelector('[contenteditable="true"]')).toBeNull();
    expect(mutate).not.toHaveBeenCalled();
  });
  it('ohne Vorschau zeigt die Datei still ihren Titel statt zu hängen', async () => {
    getFilePreview.mockResolvedValue({ previewAvailable: false, reason: 'binary' });
    const { container } = wrap(<Book id="file-7" fallbackTitle="kassenbon.jpg" folderId={null} stage={stage} back={null} file />);
    await settled(container);
    expect(container.textContent).toContain('kassenbon.jpg');
    expect(container.textContent).not.toMatch(/offline|fehler/i);
  });
  it('eine Leseanfrage, die nie antwortet, lässt das Buch nicht hängen', async () => {
    jest.useFakeTimers();
    try {
      fetchNodeDetails.mockReturnValue(new Promise(() => undefined));
      const { container } = wrap(<Book id="n-slow" fallbackTitle="Handbuch" folderId={null} stage={stage} back={null} />);
      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
      await act(async () => { jest.advanceTimersByTime(BOOK_READ_TIMEOUT_MS + 10); });
      for (let i = 0; i < 10; i++) await act(async () => { jest.advanceTimersByTime(20); await Promise.resolve(); });
      expect(container.querySelector('[aria-busy="true"]')).toBeNull();
      expect(container.textContent).toContain('Handbuch');
    } finally {
      jest.useRealTimers();
    }
  });
});
