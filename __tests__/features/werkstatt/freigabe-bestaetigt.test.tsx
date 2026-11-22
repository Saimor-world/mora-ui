import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { DeskWorkstation } from '@/features/werkstatt/ui/DeskWorkstation';
import type { WorkTask } from '@/lib/universe/deptWork';

// Audit 21.11., Befund „Hoch“: „Freigegeben“/„Geprüft“ wurde nur im lokalen Zustand umgeschaltet.
// Eine Freigabe zählt erst, wenn CORE sie gespeichert hat, und muss nach erneutem Öffnen gleich aussehen.

function task(id: string, title: string, done = false, assignee: string | null = 'Mira Test'): WorkTask {
    return { id, title, status: done ? 'done' : 'backlog', done, due: null, overdue: false, dueToday: false, folderId: null, assignee, raw: { id, title, status: done ? 'done' : 'backlog' } as WorkTask['raw'] };
}

function desk(props: Partial<React.ComponentProps<typeof DeskWorkstation>> = {}) {
    return render(
        <DeskWorkstation stationKind="bridge-station" planetId="dept-test-leitung" planetTitle="Leitung" crew={[]} tasks={[]} docs={[]} onClose={jest.fn()} {...props} />,
    );
}

beforeEach(() => window.localStorage.clear());

describe('Leitung › Freigaben', () => {
    it('zeigt ohne Einträge aus CORE keine Freigabe als erteilt', () => {
        desk();
        const sheet = screen.getByTestId('wk-station-bridge-station');
        expect(within(sheet).queryByText(/Freigegeben/)).toBeNull();
    });

    it('zeigt „Freigegeben“ erst nach bestätigter Speicherung', async () => {
        let resolve: (ok: boolean) => void = () => {};
        const onToggleTask = jest.fn(() => new Promise<boolean>((r) => { resolve = r; }));
        const t = task('t-1', 'TEST: Angebot Mira freigeben');
        const { rerender } = desk({ tasks: [t], onToggleTask });

        fireEvent.click(screen.getByRole('button', { name: 'Freigeben' }));
        expect(onToggleTask).toHaveBeenCalledWith(t);
        expect(screen.queryByText(/Freigegeben/)).toBeNull();
        expect(screen.getByRole('button', { name: 'Wird gespeichert' })).toBeDisabled();

        // Optimistischer Cache meldet schon „erledigt“, CORE hat aber noch nicht geantwortet.
        rerender(<DeskWorkstation stationKind="bridge-station" planetId="dept-test-leitung" planetTitle="Leitung" crew={[]} tasks={[task('t-1', 'TEST: Angebot Mira freigeben', true)]} docs={[]} onToggleTask={onToggleTask} onClose={jest.fn()} />);
        expect(screen.queryByText(/Freigegeben/)).toBeNull();

        await act(async () => { resolve(true); });
        rerender(<DeskWorkstation stationKind="bridge-station" planetId="dept-test-leitung" planetTitle="Leitung" crew={[]} tasks={[task('t-1', 'TEST: Angebot Mira freigeben', true)]} docs={[]} onToggleTask={onToggleTask} onClose={jest.fn()} />);
        expect(screen.getByText(/Freigegeben/)).toBeInTheDocument();
    });

    it('meldet eine abgelehnte Speicherung und zeigt keine Freigabe', async () => {
        const onToggleTask = jest.fn().mockResolvedValue(false);
        desk({ tasks: [task('t-1', 'TEST: Angebot Mira freigeben')], onToggleTask });
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Freigeben' })); });
        expect(screen.queryByText(/Freigegeben/)).toBeNull();
        expect(screen.getByRole('alert')).toHaveTextContent('Nicht gespeichert');
    });

    it('nach erneutem Öffnen gilt der Stand aus CORE, nicht ein lokaler Vermerk', () => {
        window.localStorage.setItem('mora.station.bridge.dec.dept-test-leitung', JSON.stringify([{ id: 'x', title: 'Lokal vermerkt', owner: 'Marius', approved: true }]));
        const first = desk({ tasks: [task('t-2', 'TEST: Vertrag Mira', true)] });
        expect(screen.queryByText('Lokal vermerkt')).toBeNull();
        expect(screen.getByText(/Freigegeben/)).toBeInTheDocument();
        first.unmount();
        desk({ tasks: [task('t-2', 'TEST: Vertrag Mira', false)] });
        expect(screen.queryByText(/Freigegeben/)).toBeNull();
    });

    it('legt eine neue Freigabe nur über CORE an, ohne vorgegebene Person', () => {
        const onAddTask = jest.fn();
        desk({ onAddTask });
        fireEvent.change(screen.getByTestId('wk-bridge-new-directive'), { target: { value: 'TEST: Rechnung Mira' } });
        fireEvent.submit(screen.getByTestId('wk-bridge-new-directive').closest('form')!);
        expect(onAddTask).toHaveBeenCalledWith('TEST: Rechnung Mira', null);
        expect(screen.queryByText('TEST: Rechnung Mira')).toBeNull();
    });
});

describe('Kontor › Budgets', () => {
    it('bietet keine lokale „Geprüft“-Freigabe an', () => {
        render(<DeskWorkstation stationKind="raum-station" planetId="dept-test-kontor" planetTitle="Kontor" crew={[]} tasks={[]} docs={[]} onClose={jest.fn()} />);
        const sheet = screen.getByTestId('wk-station-raum-station');
        expect(within(sheet).queryByText(/Geprüft ✓/)).toBeNull();
        expect(within(sheet).queryByRole('button', { name: 'Freigeben' })).toBeNull();
    });
});
