import { bodyCaption, bodyChips } from '@/lib/universe/planetModel';

const planet = (o: Record<string, unknown>) => ({ key: 'system:x', kind: 'system', state: 'active', counts: {}, sources: [], ...o }) as never;

describe('Arbeits-Chips', () => {
    it('zeigt nur echte Zahlen', () => {
        expect(bodyChips(planet({ capability: 'werkstatt', counts: { open_tasks: 3 } }), null)).toEqual([{ label: 'Aufgaben', value: 3, tone: 'open' }]);
        expect(bodyChips(planet({ capability: 'finanzen', counts: { transactions_14d: 0 } }), null)).toEqual([]);
        expect(bodyChips(planet({ capability: 'finanzen', counts: { open_invoices: 2 } }), null)).toEqual([{ label: 'offen', value: 2, tone: 'open' }]);
        expect(bodyChips(planet({ capability: 'post', counts: { mails: 4 } }), null)).toEqual([{ label: 'neu', value: 4, tone: 'open' }]);
    });
    it('Wache ist ruhig ohne Vorfälle', () => {
        expect(bodyChips(planet({ capability: 'wache', counts: { open_incidents: 0 } }), null)[0]).toEqual({ label: 'keine Vorfälle', tone: 'calm' });
    });
    it('braucht dich steht vorn', () => {
        expect(bodyChips(planet({ capability: 'post', counts: { mails: 2 }, glow: { level: 'need', reason: 'Antwort fällig' } }), null)[0].tone).toBe('need');
    });
    it('caption nur bei Wert > 0', () => {
        expect(bodyCaption(planet({ capability: 'post', counts: { mails: 4 } }), null)).toBe('4 neu');
        expect(bodyCaption(planet({ capability: 'finanzen', counts: { open_invoices: 2 } }), null)).toBe('2 offen');
        expect(bodyCaption(planet({ capability: 'werkstatt', counts: { open_tasks: 0 } }), null)).toBe('');
        expect(bodyCaption(planet({ capability: 'wache', counts: { open_incidents: 0 } }), null)).toBe('');
        expect(bodyCaption(planet({ capability: 'wache', counts: { open_incidents: 1, docs: 24 } }), null)).toBe('1 Vorfall');
    });
});
