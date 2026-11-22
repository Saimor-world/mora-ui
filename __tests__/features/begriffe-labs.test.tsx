import React from 'react';
import { render, screen } from '@testing-library/react';

let mockInternal = false;
jest.mock('@/lib/hooks/useIsSaimorInternal', () => ({ useIsSaimorInternal: () => mockInternal }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

import LabsSurface, { LABS_GROUPS } from '@/features/labs';
import { ShortcutsOverlay } from '@/components/os-shell/ShortcutsOverlay';
import { CANONICAL_SHIP_DEPARTMENTS, getDepartmentRoomContext } from '@/lib/universe/shipDepartments';

const REJECTED = /Kommando & Strategie|Strategische Direktiven|Captain \/ Owner|Kommandozentrale/;

describe('Labs: klassische Oberfläche', () => {
    beforeEach(() => { mockInternal = false; });

    it('zeigt HQ den Weg in die klassische Oberfläche mit ihrem echten Ziel', () => {
        mockInternal = true;
        render(<LabsSurface navigate={jest.fn()} preview={false} />);
        expect(screen.getByTestId('labs-legacy-shell').getAttribute('href')).toBe('/home?classic=1');
    });

    it('zeigt Kunden keinen Weg, der für sie nur zurück ins OS führt', () => {
        render(<LabsSurface navigate={jest.fn()} preview={false} />);
        expect(screen.queryByTestId('labs-legacy-shell')).toBeNull();
    });

    it('behauptet für experimentelle Apps keinen pauschalen Funktionsstand', () => {
        render(<LabsSurface navigate={jest.fn()} preview={false} />);
        expect(document.body.textContent).not.toMatch(/Funktioniert/);
        expect(LABS_GROUPS.map((g) => g.copy).join(' ')).not.toMatch(/Funktioniert|Aufgabe/);
    });
});

describe('Begriffe', () => {
    it('Tastenkürzel heißen Tastenkürzel', () => {
        render(<ShortcutsOverlay items={[]} onClose={jest.fn()} />);
        expect(screen.getByRole('dialog').textContent).toMatch(/Tastenkürzel/);
        expect(screen.getByRole('dialog').textContent).not.toMatch(REJECTED);
    });

    it('die Leitungsabteilung heißt Leitung und bleibt das Kontor', () => {
        const leitung = CANONICAL_SHIP_DEPARTMENTS.find((d) => d.id === 'dept-kommando');
        expect(leitung?.name).toBe('Leitung');
        expect(getDepartmentRoomContext('dept-x', 'Leitung').archetype).toBe('bridge');
        expect(JSON.stringify(getDepartmentRoomContext('dept-kommando', 'Leitung'))).not.toMatch(REJECTED);
    });
});
