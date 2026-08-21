import { summarizeSubscriptions, type BillingSubscription } from '@/lib/business/mrr';

const sub = (over: Partial<BillingSubscription> = {}): BillingSubscription => ({
    id: 's1',
    provider: 'paddle',
    status: 'active',
    price: {
        base_price: { amount_minor: 19900, currency: 'EUR' },
        interval: 'month',
        seats: 5,
        included_seats: 5,
        additional_seats: 0,
        additional_seat_price: { amount_minor: 2900, currency: 'EUR' },
    },
    ...over,
});

/**
 * Marius baut sein Geschaeft gerade erst auf ("wir bereiten uns auf ersten
 * Umsatz 2027 vor") - heute liegen in tenant_subscriptions 0 Zeilen. Diese
 * Funktion muss darum vor allem eines richtig machen: ehrlich "nichts" sagen,
 * ohne dass irgendwo eine erfundene Zahl durchrutscht.
 */
describe('summarizeSubscriptions', () => {
    it('ist ehrlich leer ohne jede Zahlung', () => {
        const summary = summarizeSubscriptions([]);
        expect(summary).toEqual({ monthlyRevenueMinor: 0, currency: null, activeCount: 0, providers: [] });
    });

    it('zaehlt nur aktive Abos, keine Testphasen oder gekuendigten', () => {
        const summary = summarizeSubscriptions([
            sub({ status: 'active' }),
            sub({ id: 's2', status: 'trialing' }),
            sub({ id: 's3', status: 'canceled' }),
        ]);
        expect(summary.activeCount).toBe(1);
    });

    it('rechnet ein Jahresabo auf den Monat herunter statt es 12x zu zaehlen', () => {
        const summary = summarizeSubscriptions([
            sub({ price: { base_price: { amount_minor: 199000, currency: 'EUR' }, interval: 'year', seats: 5, included_seats: 5, additional_seats: 0, additional_seat_price: { amount_minor: 29000, currency: 'EUR' } } }),
        ]);
        expect(summary.monthlyRevenueMinor).toBe(Math.round(199000 / 12));
    });

    it('addiert Sitzplaetze ueber dem Kontingent zum Grundpreis', () => {
        const summary = summarizeSubscriptions([
            sub({ price: { base_price: { amount_minor: 19900, currency: 'EUR' }, interval: 'month', seats: 8, included_seats: 5, additional_seats: 3, additional_seat_price: { amount_minor: 2900, currency: 'EUR' } } }),
        ]);
        expect(summary.monthlyRevenueMinor).toBe(19900 + 3 * 2900);
    });

    it('summiert ueber mehrere Anbieter hinweg - Paddle heute, GoCardless kuenftig', () => {
        const summary = summarizeSubscriptions([
            sub({ id: 'p1', provider: 'paddle' }),
            sub({ id: 'g1', provider: 'gocardless' }),
        ]);
        expect(summary.activeCount).toBe(2);
        expect(summary.providers.sort()).toEqual(['gocardless', 'paddle']);
    });

    it('meldet eine gemischte Waehrung statt sie stillschweigend zu addieren', () => {
        const summary = summarizeSubscriptions([
            sub({ price: { base_price: { amount_minor: 19900, currency: 'EUR' }, interval: 'month', seats: 1, included_seats: 1, additional_seats: 0, additional_seat_price: { amount_minor: 0, currency: 'EUR' } } }),
            sub({ id: 's2', price: { base_price: { amount_minor: 19900, currency: 'USD' }, interval: 'month', seats: 1, included_seats: 1, additional_seats: 0, additional_seat_price: { amount_minor: 0, currency: 'USD' } } }),
        ]);
        expect(summary.currency).toBeNull();
    });
});
