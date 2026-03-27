/**
 * ConfirmationCard Ã¢â‚¬â€ route explainability / Trust V3
 *
 * Tests that the intake variant correctly surfaces:
 *   - learned-route badge when route_mode === 'learned_route'
 *   - human-readable signal labels (not raw keys)
 *   - graceful fallback for unknown signal keys
 *   - learning copy from route_learning
 *   - "still forming" note for thin evidence
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/api/coreClient', () => ({ corePost: jest.fn() }));
jest.mock('@/lib/mora/presenceEvents', () => ({ dispatchMoraPresence: jest.fn() }));
jest.mock('framer-motion', () => ({
    motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { ConfirmationCard } from '@/components/mora/ConfirmationCard';

// Ã¢â€â‚¬Ã¢â€â‚¬ fixtures Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const baseIntakeContext = {
    business_summary: 'Quartalsbericht Q4 2025',
    target_department_name: 'Finance',
    target_space_name: 'Reports',
    target_folder_name: 'Q4 Reports',
    route_confidence_label: 'hoch',
    route_reason: 'Ãƒâ€žhnliche Berichte wurden hier eingeordnet.',
};

function makeAction(overrides: Record<string, unknown> = {}) {
    return {
        tool_name: 'create_node_from_file',
        params: {},
        risk_level: 'mutation',
        confirmation_token: 'tok-expl-1',
        action_id: 'act-expl-1',
        intake_context: { ...baseIntakeContext, ...overrides },
    };
}

const noop = () => {};

// Ã¢â€â‚¬Ã¢â€â‚¬ Learned badge Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

describe('ConfirmationCard Ã¢â‚¬â€ learned-route badge', () => {
    it('shows learned badge when route_mode is learned_route', () => {
        render(
            <ConfirmationCard
                action={makeAction({ route_mode: 'learned_route' })}
                onConfirmed={noop}
                onRejected={noop}
                variant="intake"
            />
        );
        expect(screen.getByText(/Gelernter Pfad/i)).toBeInTheDocument();
    });

    it('does not show learned badge when route_mode is absent', () => {
        render(
            <ConfirmationCard
                action={makeAction({ route_mode: undefined })}
                onConfirmed={noop}
                onRejected={noop}
                variant="intake"
            />
        );
        expect(screen.queryByText(/Gelernter Pfad/i)).not.toBeInTheDocument();
    });

    it('does not show learned badge when route_mode is default_route', () => {
        render(
            <ConfirmationCard
                action={makeAction({ route_mode: 'default_route' })}
                onConfirmed={noop}
                onRejected={noop}
                variant="intake"
            />
        );
        expect(screen.queryByText(/Gelernter Pfad/i)).not.toBeInTheDocument();
    });
});

// Ã¢â€â‚¬Ã¢â€â‚¬ Signal humanization Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

describe('ConfirmationCard Ã¢â‚¬â€ signal humanization', () => {
    it('renders known signal keys as German labels', () => {
        render(
            <ConfirmationCard
                action={makeAction({
                    route_signals: ['frueher_aehnlich_eingeordnet', 'wiederkehrendes_dateimuster'],
                })}
                onConfirmed={noop}
                onRejected={noop}
                variant="intake"
            />
        );
        expect(document.body).toHaveTextContent('Ähnliche Dateien eingeordnet');
        expect(document.body).toHaveTextContent('Wiederkehrendes Dateimuster');
        // raw keys must NOT appear
        expect(screen.queryByText('frueher_aehnlich_eingeordnet')).not.toBeInTheDocument();
        expect(screen.queryByText('wiederkehrendes_dateimuster')).not.toBeInTheDocument();
    });

    it('falls back gracefully for unknown signal keys', () => {
        render(
            <ConfirmationCard
                action={makeAction({ route_signals: ['some_unknown_key'] })}
                onConfirmed={noop}
                onRejected={noop}
                variant="intake"
            />
        );
        // Should not render the raw snake_case key
        expect(screen.queryByText('some_unknown_key')).not.toBeInTheDocument();
        // Should render something readable (space-separated + capitalized)
        expect(screen.getByText(/Some Unknown Key/i)).toBeInTheDocument();
    });

    it('maps manuell_gesetzt to "Manuell festgelegt"', () => {
        render(
            <ConfirmationCard
                action={makeAction({ route_signals: ['manuell_gesetzt'] })}
                onConfirmed={noop}
                onRejected={noop}
                variant="intake"
            />
        );
        expect(screen.getByText(/Manuell festgelegt/)).toBeInTheDocument();
    });
});

// Ã¢â€â‚¬Ã¢â€â‚¬ Learning copy Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

describe('ConfirmationCard Ã¢â‚¬â€ route_learning copy', () => {
    it('renders confirmed-count learning line', () => {
        render(
            <ConfirmationCard
                action={makeAction({
                    route_mode: 'learned_route',
                    route_learning: { confirmed_count: 6, corrected_count: 0 },
                })}
                onConfirmed={noop}
                onRejected={noop}
                variant="intake"
            />
        );
        expect(document.body).toHaveTextContent('Dieser Pfad wurde bereits 6-mal bestaetigt oder korrigiert.');
    });

    it('renders correction line when corrected_count > 0', () => {
        render(
            <ConfirmationCard
                action={makeAction({
                    route_mode: 'learned_route',
                    route_learning: { confirmed_count: 4, corrected_count: 2 },
                })}
                onConfirmed={noop}
                onRejected={noop}
                variant="intake"
            />
        );
        expect(document.body).toHaveTextContent('Davon wurden 2-mal manuelle Korrekturen uebernommen.');
    });

    it('does not render correction line when corrected_count is 0', () => {
        render(
            <ConfirmationCard
                action={makeAction({
                    route_mode: 'learned_route',
                    route_learning: { confirmed_count: 3, corrected_count: 0 },
                })}
                onConfirmed={noop}
                onRejected={noop}
                variant="intake"
            />
        );
        expect(screen.queryByText(/manuelle Korrekturen/i)).not.toBeInTheDocument();
    });

    it('shows "still forming" note when evidence is thin (confirmed_count <= 1)', () => {
        render(
            <ConfirmationCard
                action={makeAction({
                    route_mode: 'learned_route',
                    route_learning: { confirmed_count: 1, corrected_count: 0 },
                })}
                onConfirmed={noop}
                onRejected={noop}
                variant="intake"
            />
        );
        expect(screen.getByText(/Die Einordnung ist noch im Aufbau/i)).toBeInTheDocument();
    });

    it('does not show "still forming" when confirmed_count is substantial', () => {
        render(
            <ConfirmationCard
                action={makeAction({
                    route_mode: 'learned_route',
                    route_learning: { confirmed_count: 5, corrected_count: 0 },
                })}
                onConfirmed={noop}
                onRejected={noop}
                variant="intake"
            />
        );
        expect(screen.queryByText(/noch im Aufbau/i)).not.toBeInTheDocument();
    });

    it('does not show learning line when route_learning is absent', () => {
        render(
            <ConfirmationCard
                action={makeAction({ route_mode: 'learned_route', route_learning: undefined })}
                onConfirmed={noop}
                onRejected={noop}
                variant="intake"
            />
        );
        expect(screen.queryByText(/Dieser Pfad wurde bereits/i)).not.toBeInTheDocument();
    });
});
