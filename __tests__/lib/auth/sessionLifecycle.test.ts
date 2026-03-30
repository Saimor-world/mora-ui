import { getSessionTier, formatAbsenceText } from '@/lib/auth/sessionLifecycle';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('getSessionTier', () => {
    const now = Date.now();

    it('returns "sofort" for activity within 4 hours', () => {
        expect(getSessionTier(new Date(now - 1 * HOUR).toISOString(), now)).toBe('sofort');
        expect(getSessionTier(new Date(now - 3.9 * HOUR).toISOString(), now)).toBe('sofort');
    });

    it('returns "erwachen" for activity between 4–24 hours', () => {
        expect(getSessionTier(new Date(now - 5 * HOUR).toISOString(), now)).toBe('erwachen');
        expect(getSessionTier(new Date(now - 23 * HOUR).toISOString(), now)).toBe('erwachen');
    });

    it('returns "erkennung" for activity between 24–72 hours', () => {
        expect(getSessionTier(new Date(now - 25 * HOUR).toISOString(), now)).toBe('erkennung');
        expect(getSessionTier(new Date(now - 2 * DAY).toISOString(), now)).toBe('erkennung');
        expect(getSessionTier(new Date(now - 71 * HOUR).toISOString(), now)).toBe('erkennung');
    });

    it('returns "neustart" for activity beyond 72 hours', () => {
        expect(getSessionTier(new Date(now - 73 * HOUR).toISOString(), now)).toBe('neustart');
        expect(getSessionTier(new Date(now - 7 * DAY).toISOString(), now)).toBe('neustart');
    });

    it('returns "neustart" for null/undefined/invalid input', () => {
        expect(getSessionTier(null)).toBe('neustart');
        expect(getSessionTier(undefined)).toBe('neustart');
        expect(getSessionTier('not-a-date')).toBe('neustart');
        expect(getSessionTier('')).toBe('neustart');
    });

    it('handles exact boundary values', () => {
        // Exactly 4h → still sofort (<=)
        expect(getSessionTier(new Date(now - 4 * HOUR).toISOString(), now)).toBe('sofort');
        // 4h + 1ms → erwachen
        expect(getSessionTier(new Date(now - 4 * HOUR - 1).toISOString(), now)).toBe('erwachen');
        // Exactly 24h → still erwachen
        expect(getSessionTier(new Date(now - 24 * HOUR).toISOString(), now)).toBe('erwachen');
        // Exactly 72h → still erkennung
        expect(getSessionTier(new Date(now - 72 * HOUR).toISOString(), now)).toBe('erkennung');
    });
});

describe('formatAbsenceText', () => {
    const now = Date.now();

    it('returns German time text for various durations', () => {
        expect(formatAbsenceText(new Date(now - 2 * HOUR).toISOString())).toBe('2 Stunden abwesend');
        expect(formatAbsenceText(new Date(now - 1 * HOUR).toISOString())).toBe('1 Stunde abwesend');
        expect(formatAbsenceText(new Date(now - 2 * DAY).toISOString())).toBe('2 Tage abwesend');
        expect(formatAbsenceText(new Date(now - 1 * DAY).toISOString())).toBe('1 Tag abwesend');
    });

    it('returns "Gerade aktiv" for very recent activity', () => {
        expect(formatAbsenceText(new Date(now - 2 * 60 * 1000).toISOString())).toBe('Gerade aktiv');
    });

    it('returns empty string for null/undefined/invalid', () => {
        expect(formatAbsenceText(null)).toBe('');
        expect(formatAbsenceText(undefined)).toBe('');
        expect(formatAbsenceText('garbage')).toBe('');
    });
});

describe('isSessionResumeStale removed', () => {
    it('is no longer exported (replaced by getSessionTier)', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('@/lib/auth/sessionLifecycle');
        expect(mod.isSessionResumeStale).toBeUndefined();
    });
});
