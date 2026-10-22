import { extractCouncil } from '@/lib/chat/council';
import { toToolTrace } from '@/lib/chat/toolTrace';

const result = {
  kind: 'council',
  question: 'Online-Buchung einführen?',
  perspectives: [
    { role: 'security', label: 'Sicherheit', stance: 'bedingt', advice: 'Nur mit AVV.', risks: ['DSGVO'], available: true },
    { role: 'customer', label: 'Kunde', stance: 'dagegen', advice: 'Zu kompliziert.', risks: [], available: true },
    { role: 'finance', label: 'Finanzen', stance: 'quatsch', advice: '', risks: [], available: false },
  ],
  synthesis: { verdict: 'bedingt', consensus: false, summary: 'Mehrheit: bedingt.', dissent: [{ role: 'customer' }] },
};

describe('extractCouncil', () => {
  it('liest die Beratung und behält den Widerspruch', () => {
    const c = extractCouncil([{ tool: 'convene_council', success: true, result }])!;
    expect(c.verdict).toBe('bedingt');
    expect(c.dissentRoles).toEqual(['customer']);
    expect(c.voices[0].risks).toEqual(['DSGVO']);
  });
  it('macht aus unbekannter Haltung „unklar“ und aus fehlender Antwort keine Zustimmung', () => {
    const c = extractCouncil([{ tool: 'convene_council', success: true, result }])!;
    expect(c.voices[2].stance).toBe('unklar');
    expect(c.voices[2].available).toBe(false);
  });
  it('ignoriert fehlgeschlagene oder fremde Werkzeuge', () => {
    expect(extractCouncil([{ tool: 'convene_council', success: false, result }])).toBeNull();
    expect(extractCouncil([{ tool: 'search', success: true, result }])).toBeNull();
    expect(extractCouncil(undefined)).toBeNull();
  });
  it('zeigt den Rat im Werkzeug-Verlauf als „Rat gefragt“', () => {
    const [s] = toToolTrace([{ tool: 'convene_council', success: true }]);
    expect(s.kind).toBe('consulted');
    expect(s.label).toBe('Rat gefragt');
  });
});
