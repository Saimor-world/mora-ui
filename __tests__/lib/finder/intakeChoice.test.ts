import { toIntakeChoiceResult } from '@/lib/finder/intakeChoice';

describe('toIntakeChoiceResult', () => {
  it('uses the folder id and folder type when a target folder is present', () => {
    const out = toIntakeChoiceResult({ target_folder_id: 'f1', label: 'Angebote' } as any, 0);
    expect(out.id).toBe('f1');
    expect(out.type).toBe('folder');
    expect(out.title).toBe('Angebote');
  });

  it('falls back to a prefixed id when no destination ids exist', () => {
    expect(toIntakeChoiceResult({} as any, 2).id).toBe('intake-choice-2');
    expect(toIntakeChoiceResult({} as any, 2, 'finder-intake-choice').id).toBe('finder-intake-choice-2');
  });

  it('passes route metadata through onto the result', () => {
    const candidate: any = {
      target_space_id: 's1',
      destination: { folder_name: 'Verträge' },
      route_explanation: { headline: 'Passt' },
      route_reason: 'weil',
      route_signals: ['sig'],
      route_confidence_label: 'hoch',
      route_confidence_score: 0.9,
    };
    const out = toIntakeChoiceResult(candidate, 0);
    expect(out.route_destination).toEqual({ folder_name: 'Verträge' });
    expect(out.route_explanation).toEqual({ headline: 'Passt' });
    expect(out.route_reason).toBe('weil');
    expect(out.route_signals).toEqual(['sig']);
    expect(out.route_confidence_label).toBe('hoch');
    expect(out.route_confidence_score).toBe(0.9);
    expect(out.type).toBe('space'); // space id present, no folder id
  });
});
