import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { corePost } from '@/lib/api/coreClient';
import { SearchPopup } from '@/components/mora/SearchPopup';

jest.mock('@/lib/api/coreClient', () => ({ corePost: jest.fn(), searchGlobal: jest.fn() }));
jest.mock('@/lib/api/moraAgentClient', () => ({ buildChatContext: (x: unknown) => x }));
jest.mock('@/lib/queries/useDepartments', () => {
    const stable = { data: [] as never[] };
    return { useDepartments: () => stable };
});
jest.mock('@/lib/store/paneStore', () => ({ usePaneStore: () => ({ openPane: jest.fn() }) }));
jest.mock('@/lib/mora/presenceEvents', () => ({ dispatchMoraPresence: jest.fn() }));

function Harness() {
    const [q, setQ] = React.useState('@mora ');
    return <SearchPopup isOpen onClose={() => {}} searchQuery={q} onQueryChange={setQ} onMoraChat={() => {}} />;
}

function send(text: string) {
    const input = screen.getByPlaceholderText('Suchen oder @mora für Chat...');
    fireEvent.change(input, { target: { value: `@mora ${text}` } });
    fireEvent.keyDown(input, { key: 'Enter' });
}

describe('SearchPopup MÔRA modes', () => {
    beforeAll(() => { Element.prototype.scrollIntoView = jest.fn(); });
    beforeEach(() => (corePost as jest.Mock).mockReset());

    it('Denken keeps the existing /v3/chat path', async () => {
        (corePost as jest.Mock).mockResolvedValue({ reply: 'Hallo' });
        render(<Harness />);
        expect(screen.getByRole('radio', { name: 'Denken' })).toHaveAttribute('aria-checked', 'true');
        send('hi');
        await waitFor(() => expect(screen.getByText('Hallo')).toBeInTheDocument());
        expect((corePost as jest.Mock).mock.calls[0][0]).toBe('/v3/chat');
    });

    it('Bauen uses /v3/chat/mode and shows a non-executable proposal', async () => {
        (corePost as jest.Mock).mockResolvedValue({
            mode: 'bauen', text: 'Plan steht.', citations: [], sources: [], flags: [],
            proposals: [{ id: 'prop_1', label: 'Branch anlegen', status: 'awaiting_approval', requiresConfirmation: true, risk: 'external' }],
        });
        render(<Harness />);
        fireEvent.click(screen.getByRole('radio', { name: 'Bauen' }));
        send('bau mir was');
        await waitFor(() => expect(screen.getByText('Plan steht.')).toBeInTheDocument());
        const [path, body] = (corePost as jest.Mock).mock.calls[0];
        expect(path).toBe('/v3/chat/mode');
        expect(body.mode).toBe('bauen');
        expect(screen.getByText('Noch nicht ausgeführt')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Freigeben' })).toBeDisabled();
    });

    it('Recherche shows missing evidence', async () => {
        (corePost as jest.Mock).mockResolvedValue({ mode: 'recherche', text: 'Unklar.', citations: [], sources: [], flags: ['no_sources'], proposals: [] });
        render(<Harness />);
        fireEvent.click(screen.getByRole('radio', { name: 'Recherche' }));
        send('was ist X');
        await waitFor(() => expect(screen.getByText(/Keine Belege gefunden/)).toBeInTheDocument());
    });
});
