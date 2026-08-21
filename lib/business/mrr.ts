/**
 * Was aus echten Abonnements wird - keine Schaetzung, keine Demo-Zahl.
 *
 * tenant_subscriptions hatte am 21.08.2026 null Zeilen: 0 zahlende Kunden.
 * Marius baut gerade auf, mit Paddle heute und GoCardless in Aussicht -
 * "wir bereiten uns auf ersten Umsatz 2027 vor". Diese Funktion ist die
 * Leitung, die schon liegt, bevor Wasser durchfliesst: sie rechnet richtig,
 * sobald die erste echte Zahlung eintrifft, und sagt bis dahin ehrlich
 * "nichts" statt eine Zahl zu erfinden.
 */

export interface BillingPrice {
    base_price: { amount_minor: number; currency: string };
    interval: 'month' | 'year' | string;
    seats: number;
    included_seats: number;
    additional_seats: number;
    additional_seat_price: { amount_minor: number; currency: string };
}

export interface BillingSubscription {
    id: string;
    provider: string;
    status: string;
    price: BillingPrice;
}

export interface BusinessSummary {
    monthlyRevenueMinor: number;
    /** null, wenn keine Zahlung existiert ODER wenn mehrere Waehrungen
     *  gemischt sind - beides darf nie zu einer einzelnen Zahl verrechnet
     *  werden, die eine Waehrung vortaeuscht. */
    currency: string | null;
    activeCount: number;
    providers: string[];
}

function monthlyAmount(price: BillingPrice): number {
    const seatSurcharge = price.additional_seats * price.additional_seat_price.amount_minor;
    const total = price.base_price.amount_minor + seatSurcharge;
    // Ein Jahresabo ist keine zwoelfmal so grosse monatliche Zahlung - es
    // ist eine Zahlung pro Jahr. MRR heisst monatlich, also runterrechnen,
    // nicht den Jahresbetrag stehen lassen.
    return price.interval === 'year' ? Math.round(total / 12) : total;
}

export function summarizeSubscriptions(subscriptions: BillingSubscription[]): BusinessSummary {
    const active = subscriptions.filter((sub) => sub.status === 'active');

    if (active.length === 0) {
        return { monthlyRevenueMinor: 0, currency: null, activeCount: 0, providers: [] };
    }

    const currencies = new Set(active.map((sub) => sub.price.base_price.currency));
    const monthlyRevenueMinor = active.reduce((sum, sub) => sum + monthlyAmount(sub.price), 0);

    return {
        monthlyRevenueMinor,
        currency: currencies.size === 1 ? [...currencies][0] : null,
        activeCount: active.length,
        providers: [...new Set(active.map((sub) => sub.provider))],
    };
}
