import { owlFlyDelayMs } from '@/features/today/ui/OwlCard';

describe('Nightwatch-Eule Einflug', () => {
  const morning = new Date('2026-10-27T07:10:00');
  it('kritisch fliegt sofort, auch nachmittags und wiederholt', () => {
    expect(owlFlyDelayMs({ level: 'critical', fly_in_delay_seconds: 300 }, new Date('2026-10-27T15:00:00'), true)).toBe(0);
  });
  it('ruhig: 5 Minuten nach erstem Morgen-Öffnen, einmal pro Tag', () => {
    expect(owlFlyDelayMs({ level: 'ok', fly_in_delay_seconds: 300 }, morning, false)).toBe(300_000);
    expect(owlFlyDelayMs({ level: 'ok', fly_in_delay_seconds: 300 }, morning, true)).toBeNull();
    expect(owlFlyDelayMs({ level: 'warning', fly_in_delay_seconds: 300 }, new Date('2026-10-27T13:00:00'), false)).toBeNull();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PlanetInfoLine } from '@/components/world/WorldUniverse';

describe('Planeten-Zeile', () => {
  it('zeigt echte neue Mails, nie 0', () => {
    const base = { open: 2, overdue: 0, folders: 0, activity: 0, texture: 0 } as any;
    const { rerender } = render(<PlanetInfoLine traits={{ ...base, newMails: 3 }} phone={false} />);
    expect(screen.getByTestId('world-planet-info').textContent).toContain('3 neue Mails');
    rerender(<PlanetInfoLine traits={{ ...base, newMails: 0 }} phone={false} />);
    expect(screen.getByTestId('world-planet-info').textContent).not.toContain('Mail');
  });
});
