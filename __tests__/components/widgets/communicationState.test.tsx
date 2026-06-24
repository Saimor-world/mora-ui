import React from 'react';
import { screen } from '@testing-library/react';
import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import type { IntegrationConnectionState } from '@/lib/integrations/connectionState';
import { queryKeys } from '@/lib/queries/queryKeys';
import { createTestQueryClient, renderWithProviders } from '../../test-utils';

jest.mock('framer-motion', () => {
    const React = require('react');
    const pass = (tag: string) => ({ children, ...props }: any) => React.createElement(tag, props, children);
    return {
        motion: { div: pass('div'), button: pass('button'), span: pass('span') },
        AnimatePresence: ({ children }: any) => <>{children}</>,
    };
});

function renderMeinTag(state: IntegrationConnectionState) {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.viewHome(), {
        company: { id: 'company-1', name: 'Test', is_visitor: false },
        greeting: 'Hallo',
        changes: [],
        attention: [],
        next_steps: [],
    });

    const content = WIDGET_REGISTRY.meinTag.render({
        context: {
            surface: 'universe',
            compact: true,
            data: {
                mailPreview: [],
                calendarPreview: [],
                mailState: state,
                calendarState: state,
                cloudState: state,
            },
        },
    });

    return renderWithProviders(<>{content}</>, { queryClient });
}

describe('Mein Tag integration state', () => {
    it('offers connection only when explicitly unconfigured', () => {
        renderMeinTag('unconfigured');
        expect(screen.getByText('Mail verbinden')).toBeInTheDocument();
        expect(screen.getByText('Kalender verbinden')).toBeInTheDocument();
    });

    it('does not mislabel loading as disconnected', () => {
        renderMeinTag('loading');
        expect(screen.getAllByText('Status wird geladen')).toHaveLength(3);
        expect(screen.queryByText(/verbinden/i)).not.toBeInTheDocument();
    });

    it('does not mislabel an error as disconnected', () => {
        renderMeinTag('error');
        expect(screen.getAllByText('Status nicht verfuegbar')).toHaveLength(3);
        expect(screen.queryByText(/verbinden/i)).not.toBeInTheDocument();
    });

    it('shows honest empty states when connected', () => {
        renderMeinTag('configured');
        expect(screen.getByText('Posteingang leer')).toBeInTheDocument();
        expect(screen.getByText('Keine Termine heute')).toBeInTheDocument();
    });
});
