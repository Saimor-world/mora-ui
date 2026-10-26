import { importantMails, isImportant, owlChips, owlHeadline, relTime, senderLabel } from '@/features/today/ui/owlModel';

describe('owlModel', () => {
  it('filtert Newsletter, behält Rechnungen', () => {
    expect(isImportant({ subject: 'Zahlungserinnerung', from_addr: 'Accounting - Hetzner Online GmbH <a@hetzner.com>', kind: 'bill' })).toBe(true);
    expect(isImportant({ subject: 'Neuer Post', from_addr: 'Michael Burry <x@substack.com>', kind: 'important' })).toBe(false);
  });
  it('kürzt Absender', () => {
    expect(senderLabel('Accounting - Hetzner Online GmbH <a@hetzner.com>')).toBe('Hetzner Online GmbH');
  });
  it('relative Zeit', () => {
    const now = new Date('2026-10-26T20:00:00Z');
    expect(relTime('2026-10-26T19:30:00Z', now)).toMatch(/vor 30 Min/);
  });
  it('Satz und Chips ohne Rohtext', () => {
    const s: any = { level: 'ok', mail: { unread: 3, highlights: [] }, incidents: [], hetzner: {}, crowdsec: {} };
    expect(owlHeadline(s)).not.toMatch(/http|[0-9a-f]{7,}/);
    expect(owlChips(s).length).toBeGreaterThan(0);
    expect(importantMails(s)).toEqual([]);
  });
});
