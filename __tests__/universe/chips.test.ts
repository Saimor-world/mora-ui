import { bodyChips } from '@/lib/universe/planetModel';

const planet = (o: Record<string, unknown>) => ({ key: 'system:x', kind: 'system', state: 'active', counts: {}, sources: [], ...o }) as never;

describe('Arbeits-Chips', () => {
    it('zeigt nur echte Zahlen', () => {
        expect(bodyChips(planet({ capability: 'werkstatt', counts: { open_tasks: 3 } }), null)).toEqual([{ label: 'offene Aufgaben', value: 3, tone: 'open' }]);
        expect(bodyChips(planet({ capability: 'finanzen', counts: { transactions_14d: 0 } }), null)).toEqual([]);
    });
    it('Wache ist ruhig ohne Vorfälle', () => {
        expect(bodyChips(planet({ capability: 'wache', counts: { open_incidents: 0 } }), null)[0]).toEqual({ label: 'keine Vorfälle', tone: 'calm' });
    });
    it('braucht dich steht vorn', () => {
        expect(bodyChips(planet({ capability: 'post', counts: { mails: 2 }, glow: { level: 'need', reason: 'Antwort fällig' } }), null)[0].tone).toBe('need');
    });
});
