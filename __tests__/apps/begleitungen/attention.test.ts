import {
  computeAttentionSignals,
  filterNeedsAttention,
} from '@/apps/begleitungen/begleitungenClient';
import type { KlientinMitAttention } from '@/apps/begleitungen/types';

function createKlientin(overrides: Partial<{
  begleitungStatus: 'aktiv' | 'pausiert' | 'abgeschlossen';
  letzteSessionDatum: string | null;
  endDatum: string | null;
}>): KlientinMitAttention {
  return {
    klientin: {
      id: 'kl-test',
      name: 'Test Client',
      erstelltAm: '2026-01-01T00:00:00Z',
    },
    begleitung: {
      id: 'bgl-test',
      klientinId: 'kl-test',
      angebotId: 'a-1',
      status: overrides.begleitungStatus ?? 'aktiv',
      startDatum: '2026-08-01',
      endDatum: overrides.endDatum ?? undefined,
      erstelltAm: '2026-08-01T00:00:00Z',
    },
    angebot: {
      id: 'a-1',
      name: 'Test Programm',
      typ: 'programm',
    },
    letzteSession: overrides.letzteSessionDatum
      ? {
          id: 'sess-test',
          begleitungId: 'bgl-test',
          datum: overrides.letzteSessionDatum,
          status: 'durchgeführt',
          erstelltAm: overrides.letzteSessionDatum,
        }
      : undefined,
    sessionCount: 3,
  };
}

describe('computeAttentionSignals', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-01T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('flags clients with no session in the last 14 days', () => {
    const klientin = createKlientin({
      begleitungStatus: 'aktiv',
      letzteSessionDatum: '2026-09-10T10:00:00Z',
    });

    const result = computeAttentionSignals([klientin]);

    expect(result[0].attention).toBeDefined();
    expect(result[0].attention?.typ).toBe('keine_session');
    expect(result[0].attention?.tage).toBe(21);
    expect(result[0].attention?.dringlichkeit).toBe('mittel');
  });

  it('does not flag clients with recent sessions', () => {
    const klientin = createKlientin({
      begleitungStatus: 'aktiv',
      letzteSessionDatum: '2026-09-25T10:00:00Z',
    });

    const result = computeAttentionSignals([klientin]);

    expect(result[0].attention).toBeUndefined();
  });

  it('flags programs ending within 14 days', () => {
    const klientin = createKlientin({
      begleitungStatus: 'aktiv',
      letzteSessionDatum: '2026-09-28T10:00:00Z',
      endDatum: '2026-10-10',
    });

    const result = computeAttentionSignals([klientin]);

    expect(result[0].attention).toBeDefined();
    expect(result[0].attention?.typ).toBe('endet_bald');
    expect(result[0].attention?.tage).toBeGreaterThanOrEqual(8);
    expect(result[0].attention?.tage).toBeLessThanOrEqual(9);
  });

  it('flags overdue programs', () => {
    const klientin = createKlientin({
      begleitungStatus: 'aktiv',
      letzteSessionDatum: '2026-09-28T10:00:00Z',
      endDatum: '2026-09-25',
    });

    const result = computeAttentionSignals([klientin]);

    expect(result[0].attention).toBeDefined();
    expect(result[0].attention?.typ).toBe('ueberfallig');
    expect(result[0].attention?.dringlichkeit).toBe('hoch');
  });

  it('does not flag paused clients', () => {
    const klientin = createKlientin({
      begleitungStatus: 'pausiert',
      letzteSessionDatum: '2026-08-01T10:00:00Z',
    });

    const result = computeAttentionSignals([klientin]);

    expect(result[0].attention).toBeUndefined();
  });

  it('does not flag completed clients', () => {
    const klientin = createKlientin({
      begleitungStatus: 'abgeschlossen',
      letzteSessionDatum: '2026-08-01T10:00:00Z',
    });

    const result = computeAttentionSignals([klientin]);

    expect(result[0].attention).toBeUndefined();
  });
});

describe('filterNeedsAttention', () => {
  it('returns only clients with attention signals', () => {
    const withAttention: KlientinMitAttention = {
      ...createKlientin({}),
      attention: { typ: 'keine_session', nachricht: 'Test', dringlichkeit: 'mittel', tage: 15 },
    };
    const withoutAttention = createKlientin({});

    const result = filterNeedsAttention([withAttention, withoutAttention]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(withAttention);
  });

  it('returns empty array when no clients need attention', () => {
    const klientin = createKlientin({});

    const result = filterNeedsAttention([klientin]);

    expect(result).toHaveLength(0);
  });
});
