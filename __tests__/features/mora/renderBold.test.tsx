import React from 'react';
import { render } from '@testing-library/react';
import { renderBold } from '@/features/mora/ui/MoraConsole';
import { formatDeDate } from '@/components/os-shell/CommandPalette';
import { daySentence } from '@/lib/lea/day';

describe('MÔRA-Antwort und Suche', () => {
  it('setzt **fett** um, ohne Sternchen', () => {
    const { container } = render(<p>{renderBold('• **10:00 Uhr:** Sophie')}</p>);
    expect(container.textContent).toBe('• 10:00 Uhr: Sophie');
    expect(container.querySelector('strong')?.textContent).toBe('10:00 Uhr:');
  });
  it('formatiert ISO-Datum deutsch', () => {
    expect(formatDeDate('2026-10-24')).toBe('24.10.2026');
    expect(formatDeDate('morgen')).toBe('morgen');
  });
  it('ein laufender Termin ist nicht vorbei', () => {
    const now = new Date(2026, 9, 24, 15, 35);
    const day = { today: [{ id: 'a', title: 'Maniküre – Jana', date: '2026-10-24', time: '15:30' }], next: null, minutesToNext: null, onlyToday: [] } as never;
    expect(daySentence(day, now)).not.toContain('vorbei');
  });
});
