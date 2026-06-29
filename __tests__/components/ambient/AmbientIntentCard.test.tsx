/**
 * AmbientIntentCard.test.tsx
 *
 * Tests:
 *   - Renders intent text and action label
 *   - Ausführen button calls onExecute
 *   - Verstanden button calls onDismiss
 *   - No Ausführen button when toolCalls is empty
 *   - Buttons disabled when disabled=true
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AmbientIntentCard } from '@/components/ambient/AmbientIntentCard';
import type { AmbientToolCall } from '@/lib/hooks/useAmbientMora';

// framer-motion passthrough — proxy any motion.<tag> to a plain element so
// nested components (LagefeldCanvas uses motion.article / motion.line) render.
jest.mock('framer-motion', () => {
    const React = require('react');
    const motion = new Proxy({}, {
        get: (_target, tag: string) =>
            React.forwardRef(({ children, ...rest }: any, ref: any) =>
                React.createElement(tag, { ref, ...rest }, children)
            ),
    });
    return {
        motion,
        AnimatePresence: ({ children }: any) => <>{children}</>,
    };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const createNodeCall: AmbientToolCall = {
    tool:  'createNode',
    input: { title: 'Sprint Note', content: 'Inhalt', folder_id: 'f-1' },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AmbientIntentCard', () => {

    it('renders the intent text', () => {
        render(
            <AmbientIntentCard
                intent="Du möchtest eine Note erstellen"
                toolCalls={[createNodeCall]}
                onExecute={jest.fn()}
                onDismiss={jest.fn()}
            />
        );
        expect(screen.getByText(/Du möchtest eine Note erstellen/i)).toBeInTheDocument();
    });

    it('renders the action description for createNode', () => {
        render(
            <AmbientIntentCard
                intent="Note erstellen"
                toolCalls={[createNodeCall]}
                onExecute={jest.fn()}
                onDismiss={jest.fn()}
            />
        );
        expect(screen.getByText(/Sprint Note/i)).toBeInTheDocument();
    });

    it('shows Ausführen button when toolCalls is non-empty', () => {
        render(
            <AmbientIntentCard
                intent="Aktion"
                toolCalls={[createNodeCall]}
                onExecute={jest.fn()}
                onDismiss={jest.fn()}
            />
        );
        expect(screen.getByTestId('intent-execute')).toBeInTheDocument();
    });

    it('does NOT show Ausführen button when toolCalls is empty', () => {
        render(
            <AmbientIntentCard
                intent="Nur Text"
                toolCalls={[]}
                onExecute={jest.fn()}
                onDismiss={jest.fn()}
            />
        );
        expect(screen.queryByTestId('intent-execute')).not.toBeInTheDocument();
    });

    it('calls onExecute when Ausführen is clicked', () => {
        const onExecute = jest.fn();
        render(
            <AmbientIntentCard
                intent="Aktion"
                toolCalls={[createNodeCall]}
                onExecute={onExecute}
                onDismiss={jest.fn()}
            />
        );
        fireEvent.click(screen.getByTestId('intent-execute'));
        expect(onExecute).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when Verstanden is clicked', () => {
        const onDismiss = jest.fn();
        render(
            <AmbientIntentCard
                intent="Aktion"
                toolCalls={[createNodeCall]}
                onExecute={jest.fn()}
                onDismiss={onDismiss}
            />
        );
        fireEvent.click(screen.getByTestId('intent-dismiss'));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('disables both buttons when disabled=true', () => {
        render(
            <AmbientIntentCard
                intent="Aktion"
                toolCalls={[createNodeCall]}
                onExecute={jest.fn()}
                onDismiss={jest.fn()}
                disabled
            />
        );
        expect(screen.getByTestId('intent-execute')).toBeDisabled();
        expect(screen.getByTestId('intent-dismiss')).toBeDisabled();
    });

    it('renders action description for openPane', () => {
        render(
            <AmbientIntentCard
                intent="Pane anzeigen"
                toolCalls={[{ tool: 'openPane', input: { type: 'finder' } }]}
                onExecute={jest.fn()}
                onDismiss={jest.fn()}
            />
        );
        expect(screen.getByText(/finder öffnen/i)).toBeInTheDocument();
    });

    it('renders action description for searchGlobal', () => {
        render(
            <AmbientIntentCard
                intent="Suche starten"
                toolCalls={[{ tool: 'searchGlobal', input: { query: 'Sprint Retro' } }]}
                onExecute={jest.fn()}
                onDismiss={jest.fn()}
            />
        );
        expect(screen.getByText(/Sprint Retro/i)).toBeInTheDocument();
    });

    it('renders a live Lagefeld preview when fieldPreview is provided', () => {
        const fieldPreview = {
            cards: [
                { id: 's1', kind: 'signal' as const, title: 'Mahnung', x: 24, y: 40, symbols: [] },
                { id: 'd1', kind: 'interpretation' as const, title: 'Zugespitzt', x: 262, y: 56, symbols: [] },
            ],
            connections: [{ from: 's1', to: 'd1', relation: 'relates_to' as const }],
        };
        render(
            <AmbientIntentCard
                intent="Lagefeld formen"
                toolCalls={[{ tool: 'openPane', input: { type: 'lagefeld' } }]}
                fieldPreview={fieldPreview}
                onExecute={jest.fn()}
                onDismiss={jest.fn()}
            />
        );
        expect(screen.getByTestId('intent-lagefeld-preview')).toBeInTheDocument();
        // action label reflects the field, not the generic "lagefeld öffnen"
        expect(screen.getByText(/Lagefeld — 2 Karten/i)).toBeInTheDocument();
    });
});
