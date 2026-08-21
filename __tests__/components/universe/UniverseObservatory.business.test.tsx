import React from 'react';
import { render, screen } from '@testing-library/react';
import { UniverseObservatory } from '@/components/universe/UniverseObservatory';
import type { BusinessSummary } from '@/lib/business/mrr';

const noop = () => undefined;

const baseProps = {
    mail: [],
    calendar: [],
    feed: [],
    incidents: [],
    territoryCount: 4,
    documentCount: 10,
    selected: false,
    onOpenMail: noop,
    onOpenCalendar: noop,
    onOpenFeed: noop,
    onOpenNightwatch: noop,
};

const empty: BusinessSummary = { monthlyRevenueMinor: 0, currency: null, activeCount: 0, providers: [] };
const real: BusinessSummary = { monthlyRevenueMinor: 19900, currency: 'EUR', activeCount: 1, providers: ['paddle'] };

/**
 * tenant_subscriptions hatte am 21.08.2026 null Zeilen. Dieser Test haelt
 * fest, dass die Oberflaeche das ehrlich zeigt - und dass sie umschaltet,
 * sobald echte Abos da sind, ohne je eine Zahl zu erfinden.
 */
describe('UniverseObservatory: Wirtschaft', () => {
    it('zeigt ehrlich "noch kein Umsatz", solange keine Abos existieren', () => {
        render(<UniverseObservatory {...baseProps} business={empty} />);

        expect(screen.getByText('Noch kein Umsatz')).toBeInTheDocument();
        expect(screen.queryByText(/€/)).not.toBeInTheDocument();
    });

    it('zeigt den echten Betrag, sobald ein Abo aktiv ist', () => {
        render(<UniverseObservatory {...baseProps} business={real} />);

        expect(screen.getByText('199,00 €')).toBeInTheDocument();
        expect(screen.getByText(/1 aktives Abo/)).toBeInTheDocument();
        expect(screen.getByText(/paddle/)).toBeInTheDocument();
    });
});
