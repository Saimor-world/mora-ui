import { checkConnectResult, newestRef, senderName, type MailSummary } from '@/lib/os-prototype/mailSummary';
import { translateCoreError } from '@/lib/os-prototype/sourceDock';

describe('V1.8 verified connect – pure helpers', () => {
  it('mail counts as docked only with status connected AND confirmed', () => {
    expect(checkConnectResult('mail', { status: 'connected', confirmed: true, fetched: 5 })).toEqual({ ok: true });
    expect(checkConnectResult('mail', { status: 'configured' }).ok).toBe(false);
    expect(checkConnectResult('mail', { status: 'connected' }).ok).toBe(false);
    expect(checkConnectResult('mail', { status: 'connected', confirmed: false }).ok).toBe(false);
  });

  it('no answer from CORE is an error, never a success', () => {
    expect(checkConnectResult('mail', null)).toEqual({ ok: false, reason: expect.stringMatching(/nicht erreichbar/) });
    expect(checkConnectResult('cloud', undefined).ok).toBe(false);
    expect(checkConnectResult('cloud', { status: 'connected' }).ok).toBe(true);
  });

  it('translates the German CORE mail errors honestly', () => {
    expect(translateCoreError('Anmeldung am Postfach fehlgeschlagen. Zugangsdaten prüfen.')).toMatch(/abgelehnt/);
    expect(translateCoreError('Mail-Server nicht erreichbar.')).toMatch(/nicht erreichbar/);
    expect(translateCoreError('Der Posteingang konnte nicht gelesen werden.')).toMatch(/Posteingang/);
    expect(translateCoreError('Die Verbindung konnte in CORE nicht bestätigt werden.')).toMatch(/nicht bestätigt/);
    expect(translateCoreError('Der lokale Test-Server ist nur in der lokalen Entwicklung freigeschaltet.')).toMatch(/nur in der lokalen Entwicklung/);
    expect(translateCoreError('CORE nicht erreichbar (keine Antwort).')).toMatch(/nicht erreichbar/);
  });

  it('picks the newest referenced message as first signal and strips addresses', () => {
    const s: MailSummary = {
      method: 'regelbasiert', status: 'ok', total: 2, headline: 'x',
      groups: [{ key: 'termin', label: 'Termine', count: 1, refs: [{ uid: '1', message_id: '<a>', subject: 'Alt', from: 'A <a@x.example.test>', date: '2026-10-08T08:00:00+00:00' }] }],
      other: { count: 1, refs: [{ uid: '2', message_id: '<b>', subject: 'Neu', from: 'B <b@x.example.test>', date: '2026-10-09T08:00:00+00:00' }] },
    };
    expect(newestRef(s)?.subject).toBe('Neu');
    expect(newestRef(null)).toBeNull();
    expect(senderName('Buchhaltung Musterlieferant <buchhaltung@lieferant.example.test>')).toBe('Buchhaltung Musterlieferant');
    expect(senderName('plain@x.example.test')).toBe('plain@x.example.test');
  });
});
