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
    it('hides the Ziel/Warum/Stark block when a result has no routing data', () => {
        render(
            <AmbiguityChoiceSurface
                query="Rechnung"
                results={[
                    { id: 'n1', title: 'Rechnung R-2041', type: 'file', nodeId: 'n1', path: 'Finanzen › Rechnungen' },
                    { id: 'n2', title: 'Rechnungen', type: 'space', spaceId: 'n2', path: 'Finanzen' },
                ]}
                onPick={() => {}}
                onReview={() => {}}
            />
        );
        expect(screen.queryByText('Warum')).not.toBeInTheDocument();
        expect(screen.queryByText('Keine kurze Begründung verfügbar')).not.toBeInTheDocument();
        expect(screen.queryByText('Titel + Pfad + Typ')).not.toBeInTheDocument();
        expect(screen.getByText('2 Treffer')).toBeInTheDocument();
        expect(screen.getByText('In allen Inhalten suchen')).toBeInTheDocument();
    });
});
