import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const node = {
  id: 'n-plan', title: 'Wochenplan November', name: 'wochenplan.docx', type: 'document',
  content: '# Wochenplan November\n\nText.', updated_at: '2026-11-09T10:00:00Z', metadata: { origin: 'Word' },
};
jest.mock('@/lib/api/orgClient', () => ({ fetchNodeDetails: jest.fn(async () => node) }));
jest.mock('@/features/home/cockpit/Scene', () => ({ planetColor: () => ({}) }));
jest.mock('@/lib/queries/useNodes', () => ({ useUpdateNode: () => ({ mutate: jest.fn() }) }));
jest.mock('@/lib/lea/useDayActions', () => ({
  useDayActions: () => ({ setDone: jest.fn(), addTask: jest.fn(async () => true), update: jest.fn(), assignFolder: jest.fn() }),
}));

// eslint-disable-next-line import/first
import { WorkSurface, docKind, docMetaLine, docTitle } from '@/features/universe/ui/Workbench';
// eslint-disable-next-line import/first
import type { DeptWork } from '@/lib/universe/deptWork';

const moon = { id: 'f-plan', title: 'Planung', files: [] } as never;
const planet = { id: 'dept-laden', title: 'Laden', moons: [moon] } as never;
const work: DeptWork = {
  moons: new Map([['f-plan', {
    docs: [
      { id: 'n-plan', name: 'Wochenplan November', meta: 'document' },
      { id: 'n-pdf', name: 'Wochenplan November (PDF)', meta: 'pdf' },
    ],
    open: [], done: [], overdue: 0,
  }]]),
  loose: [], open: 0, overdue: 0,
};

const renderSurface = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <WorkSurface planet={planet} moon={moon} work={work} origin={null} companyId="c" owner="Marius" onClose={() => {}} />
    </QueryClientProvider>,
  );
};

describe('Arbeitsmodus: Dokumente zeigen Titel und Art, nie den Dateinamen', () => {
  it('Art kommt aus Herkunft/Typ: Word vor Dokument, PDF aus Dateiname', () => {
    expect(docKind('document', 'Wochenplan November', node)).toBe('Word');
    expect(docKind('pdf', 'Wochenplan November (PDF)')).toBe('PDF');
    expect(docKind('note', 'Glossar')).toBe('Notiz');
  });

  it('Titel ohne angehängte Art, Kopfzeile ohne Dateiname', () => {
    expect(docTitle('Wochenplan November (PDF)', 'PDF')).toBe('Wochenplan November');
    expect(docTitle('Glossar', 'Notiz')).toBe('Glossar');
    const line = docMetaLine('Planung', 'Word', null, new Date('2026-11-09T10:00:00Z'));
    expect(line).toMatch(/^Planung · Word · 9\. Nov/);
    expect(line).not.toMatch(/docx|\.pdf/i);
  });

  it('Regal: Art als eigene Zeile; offenes Dokument: Kopf „Planung · Word · …“ ohne wochenplan.docx', async () => {
    renderSurface();
    await waitFor(() => expect(screen.getByTestId('work-doc-kind-n-plan')).toHaveTextContent('Word'));
    expect(screen.getByTestId('work-doc-kind-n-pdf')).toHaveTextContent('PDF');
    // Titel im Regal ohne doppeltes „(PDF)“
    expect(screen.getByTestId('work-doc-n-pdf')).not.toHaveTextContent('(PDF)');

    fireEvent.click(screen.getByTestId('work-doc-n-plan'));
    const meta = await screen.findByTestId('work-doc-meta');
    await waitFor(() => expect(meta).toHaveTextContent(/Planung · Word/));
    expect(meta.textContent).not.toMatch(/wochenplan\.docx|\.docx/i);
  });
});

describe('Dev-Abzeichen liegt nicht über der Dock-Uhr', () => {
  it('next.config schaltet das Next-Dev-Abzeichen ab', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cfg = require('../../../next.config.js');
    expect(cfg.devIndicators).toBe(false);
  });
});
