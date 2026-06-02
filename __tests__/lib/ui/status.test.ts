import {
  TONES,
  STATUS_TONES,
  priorityFromSeverity,
  toneForPriority,
  toneForActionStatus,
  actionStatusLabel,
} from '@/lib/ui/status';

describe('TONES palette', () => {
  it('defines every tone with text/dot/border/bg/icon/label', () => {
    for (const tone of STATUS_TONES) {
      const t = TONES[tone];
      expect(typeof t.text).toBe('string');
      expect(typeof t.dot).toBe('string');
      expect(typeof t.border).toBe('string');
      expect(typeof t.bg).toBe('string');
      expect(t.icon).toBeTruthy();
      expect(typeof t.label).toBe('string');
    }
  });
});

describe('priorityFromSeverity (preserves existing thresholds)', () => {
  it('maps severity bands', () => {
    expect(priorityFromSeverity(0.9)).toBe('urgent');
    expect(priorityFromSeverity(0.86)).toBe('urgent');
    expect(priorityFromSeverity(0.7)).toBe('high');
    expect(priorityFromSeverity(0.66)).toBe('high');
    expect(priorityFromSeverity(0.5)).toBe('normal');
    expect(priorityFromSeverity(0.33)).toBe('normal');
    expect(priorityFromSeverity(0.1)).toBe('low');
  });
  it('defaults non-numbers to normal', () => {
    expect(priorityFromSeverity(undefined)).toBe('normal');
    expect(priorityFromSeverity(null)).toBe('normal');
  });
});

describe('toneForPriority', () => {
  it('maps priority → tone', () => {
    expect(toneForPriority('urgent')).toBe('critical');
    expect(toneForPriority('high')).toBe('warning');
    expect(toneForPriority('normal')).toBe('info');
    expect(toneForPriority('low')).toBe('neutral');
  });
  it('falls back to neutral for unknown', () => {
    expect(toneForPriority('whatever' as any)).toBe('neutral');
  });
});

describe('toneForActionStatus + actionStatusLabel', () => {
  it('maps action status → tone', () => {
    expect(toneForActionStatus('done')).toBe('success');
    expect(toneForActionStatus('failed')).toBe('critical');
    expect(toneForActionStatus('rejected')).toBe('neutral');
    expect(toneForActionStatus('expired')).toBe('neutral');
    expect(toneForActionStatus('running')).toBe('info');
    expect(toneForActionStatus('proposed')).toBe('info');
    expect(toneForActionStatus('pending_confirmation')).toBe('warning');
  });
  it('keeps the existing German labels', () => {
    expect(actionStatusLabel('done')).toBe('Abgeschlossen');
    expect(actionStatusLabel('failed')).toBe('Fehlgeschlagen');
    expect(actionStatusLabel('rejected')).toBe('Verworfen');
    expect(actionStatusLabel('pending_confirmation')).toBe('Wartet auf Bestätigung');
  });
  it('falls back gracefully for unknown status', () => {
    expect(toneForActionStatus('weird' as any)).toBe('neutral');
    expect(actionStatusLabel('weird' as any)).toBe('weird');
  });
});
