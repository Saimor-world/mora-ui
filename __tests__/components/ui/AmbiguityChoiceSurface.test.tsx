import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { AmbiguityChoiceSurface } from '@/components/ui/AmbiguityChoiceSurface';

afterEach(() => {
    cleanup();
});

describe('AmbiguityChoiceSurface', () => {
    it('renders receipt label, description, chips, and footer when provided', () => {
        render(
            <AmbiguityChoiceSurface
                query="Launch"
                label="Mehrere plausible Treffer"
                body="Aus Dokumentinhalt erkannt"
                description="Mehrere Ziele passen zum aktuellen Kontext."
                footer="Wähle den passenden Treffer, bevor Mora etwas oeffnet."
                chips={[
                    { label: '/Acme/Operations' },
                    { label: 'Treffer auswählen' },
                ]}
                results={[
                    {
                        id: 'node-1',
                        title: 'Launch Briefing',
                        type: 'node',
                        nodeId: 'node-1',
                        path: '/Acme/Operations',
                    },
                    {
                        id: 'node-2',
                        title: 'Launch Notes',
                        type: 'node',
                        nodeId: 'node-2',
                        path: '/Acme/Operations',
                    },
                ]}
                onPick={() => {}}
            />
        );

        expect(screen.getByText('Mehrere plausible Treffer')).toBeInTheDocument();
        expect(screen.getByText('Aus Dokumentinhalt erkannt')).toBeInTheDocument();
        expect(screen.getByText('Mehrere Ziele passen zum aktuellen Kontext.')).toBeInTheDocument();
        expect(screen.getAllByText('/Acme/Operations').length).toBeGreaterThan(0);
        expect(screen.getByText('Treffer auswählen')).toBeInTheDocument();
        expect(screen.getByText('Wähle den passenden Treffer, bevor Mora etwas oeffnet.')).toBeInTheDocument();
    });
});
