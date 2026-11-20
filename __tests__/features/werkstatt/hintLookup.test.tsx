import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HintLookup } from '@/features/werkstatt/ui/HintLookup';
import { searchSemantic } from '@/lib/api/searchClient';

jest.mock('@/lib/api/searchClient', () => ({ searchSemantic: jest.fn() }));
jest.mock('@/lib/demo/demoSourceGuard', () => ({ useDemoScopeActive: () => false }));
jest.mock('@/lib/api/http', () => ({ isLocalDemoFallback: () => false }));
jest.mock('@/lib/store/sessionStore', () => ({ useSessionStore: () => 'reader' }));

const search = jest.mocked(searchSemantic);
const question = 'Mindestbestand Hafermilch noch klären.';
function setup(demo = false, companyId: string | null = 'firma') {
  const open = jest.fn();
  const scope = { open, demo, companyId, documents: [{ id: 'rez-1', name: 'Rezept' }, { id: 'inv-1', name: 'Bestand' }] };
  render(<QueryClientProvider client={new QueryClient()}><HintLookup scope={scope} sourceId="rez-1" passage={question} /></QueryClientProvider>);
  expect(search).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Nachsehen' }));
  return open;
}
beforeEach(() => { search.mockReset(); });

it('finds the cited minimum in the demo and opens the matching source document', async () => {
  const open = setup(true);
  await screen.findByText(/Mindestbestand 24 Liter/);
  fireEvent.click(screen.getByRole('button', { name: 'Bestand öffnen' }));
  expect(open).toHaveBeenCalledWith('inv-1');
  expect(search).not.toHaveBeenCalled();
});

it('sends the selected passage and company and keeps only permitted room documents', async () => {
  search.mockResolvedValue(['rez-1', 'outside', 'inv-1', 'inv-1'].map((node_id, i) => ({
    node_id, company_id: i === 2 ? 'other' : 'firma', score: 1, content: 'Quelle ' + i,
  })));
  setup();
  await screen.findByText('Quelle 3');
  expect(search).toHaveBeenCalledWith(question, 'firma', 20, 0.55, true);
  expect(screen.queryByText(/Quelle [012]/)).toBeNull();
});

it('leaves missing evidence open', async () => {
  search.mockResolvedValue([]);
  setup();
  await screen.findByText(/Frage bleibt offen/);
});

it('can retry a failed lookup without reporting an empty result', async () => {
  search.mockRejectedValueOnce(new Error('403')).mockResolvedValueOnce([]);
  setup();
  fireEvent.click(await screen.findByRole('button', { name: 'Erneut nachsehen' }));
  await screen.findByText(/Frage bleibt offen/);
});

it('requires a company for live lookup', async () => {
  setup(false, null);
  await screen.findByText(/fehlt der Arbeitsbereich/);
  expect(search).not.toHaveBeenCalled();
});
