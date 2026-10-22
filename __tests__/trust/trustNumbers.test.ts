/**
 * Schritt 1 Vertrauen: eine Zahl, eine Quelle.
 * Home, Universe-Planet und Post zeigen dieselbe Mail-Zahl aus CORE.
 */
import { buildLivePlanetInput, overlayLivePlanet } from '@/lib/universe/livePlanetSources';
import { bodyChips, bodyMeta, type ModelPlanet } from '@/lib/universe/planetModel';
import type { TodaySnapshot } from '@/lib/api/todayClient';
import { mailFilterLabels, parseMailCounts } from '@/lib/mail/mailCounts';
import { mailCountDetail, syncTimeLabel } from '@/components/home/TodayOverview';
import { moonCaption } from '@/components/universe/OrganizationField';
import { buildOrbitals } from '@/lib/universe/orbitals';
import { setupHeadline } from '@/apps/settings/WorkspaceControlTab';

const planet = (cap: string, o: Partial<ModelPlanet> = {}): ModelPlanet => ({
  key: `system:${cap}`, kind: 'system', capability: cap, label: cap, state: 'active', size: 'M',
  brightness: 1, score: 1, ring: 1, look: { archetype: 'ocean', hue: 1, glyph: 'mail', seed: 1 },
  moons: [], more_moons: 0, counts: {}, sources: [], ...o,
} as ModelPlanet);

const today = (mail: Record<string, unknown>) => ({
  mail: { status: 'ok', complete: true, inbox_loaded: 5, sample_limit: 5, items: [], ...mail },
  calendar: { status: 'ok', count: 0 },
  tasks: { status: 'ok', counts: { open: 0 } },
  nightwatch: { status: 'ok', open_incidents: 0 },
}) as unknown as TodaySnapshot;

describe('eine Mail-Zahl', () => {
  const server = { unread_count: 10, total: 240 };

  it('Home, Planet und Post zeigen dieselbe ungelesen-Zahl', () => {
    const home = mailCountDetail(server.unread_count, server.total);
    const input = buildLivePlanetInput({ today: today(server) });
    const p = overlayLivePlanet(planet('post'), input);
    const chip = bodyChips(p, null).find((c) => c.label === 'ungelesen');
    const post = mailFilterLabels(parseMailCounts(server), 10, 3);

    expect(home).toBe('10 ungelesen · 240 im Posteingang');
    expect(chip?.value).toBe(10);
    expect(bodyMeta(p, null)).toContain('10 ungelesen');
    expect(post.unread).toBe('Ungelesen 10');
    expect(post.all).toBe('Alle 240');
  });

  it('die 5er-Stichprobe wird nie zur Gesamtzahl', () => {
    const input = buildLivePlanetInput({ today: today({ inbox_loaded: 5 }) });
    expect(input.mailCount).toBeNull();
    expect(input.mailUnread).toBeNull();
  });

  it('ohne Server-Zahl kein erfundenes 0', () => {
    expect(mailCountDetail(null, null)).toBe('Zahl wird gelesen …');
    expect(parseMailCounts({ unread_count: null, total: null })).toBeNull();
    expect(mailFilterLabels(null, 7, 2)).toEqual({ all: 'Alle 7', unread: 'Ungelesen 2' });
  });
});

describe('Quellen-Monde', () => {
  it('verbunden ohne Zahl heißt "wird gelesen", nicht "leer"', () => {
    const { moons } = buildOrbitals({ id: 'w', diameter: 100, spaces: [{ id: 'source:nextcloud', name: 'Nextcloud', reading: true }], documentCount: 0 });
    expect(moonCaption(moons[0])).toBe('verbunden · wird gelesen');
    expect(moonCaption({ documents: 0 })).toBe('noch leer');
    expect(moonCaption({ documents: 0, countUnknown: true })).toBe('verbunden');
    expect(moonCaption({ documents: 12 })).toBe('12 Dokumente');
  });

  it('nur synchronisierte Quellen zählen als verbunden', () => {
    const p = planet('wissen', { sources: [{ type: 'nextcloud', status: 'syncing' }, { type: 'google_drive', status: 'connected' }] });
    const chips = bodyChips(p, null);
    expect(chips).toContainEqual({ label: 'Quelle verbunden', value: 1, tone: 'calm' });
    expect(chips).toContainEqual({ label: 'Quelle wird gelesen', value: 1, tone: 'calm' });
  });
});

describe('Einstellungen', () => {
  it('nennt Schritte und den offenen Schritt', () => {
    expect(setupHeadline(2, 4, 'Organisation')).toBe('2 von 4 Schritten erledigt – offen: Organisation');
    expect(setupHeadline(4, 4)).toBe('Dein System ist startklar.');
  });
});

describe('Abgleich statt "teilweise"', () => {
  it('nennt die Uhrzeit des letzten Abgleichs in Berliner Zeit', () => {
    const now = new Date('2026-10-22T09:30:00Z');
    expect(syncTimeLabel('2026-10-22T07:42:00Z', now)).toBe('um 09:42');
    expect(syncTimeLabel('2026-10-21T07:42:00Z', now)).toBe('am 21.10. um 09:42');
    expect(syncTimeLabel(null, now)).toBeNull();
  });
});
