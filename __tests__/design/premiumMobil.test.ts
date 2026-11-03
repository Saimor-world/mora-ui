/** Premium-Runde 4 · Handy: Dock-Werte voll lesbar (2×2), Heute-Liste ohne Erklärsätze. */
import fs from 'fs';
import path from 'path';
import { deriveLiveAttention } from '@/features/home/cockpit/coreAdapter';

const css = fs.readFileSync(path.resolve(__dirname, '../../components/os-shell/bridge-concept.css'), 'utf8');

describe('HQ Premium mobil', () => {
  it('Handy-Dock ist ein 2×2-Raster ohne Abschneiden der Werte', () => {
    const layer = css.split('/* Runde 4 · Premium')[1] ?? '';
    expect(layer).toMatch(/grid-template-columns:repeat\(2,1fr\)/);
    expect(layer).toMatch(/text-overflow:clip/);
  });

  it('Heute-Liste erklärt nichts, nur Name, Zahl, Zeit', () => {
    const snap: any = {
      mail: { unread_count: 4870 },
      calendar: { events: [{ id: 'e', title: 'Review', time: '14:00' }] },
      tasks: { due_today: [{ id: 't', title: 'Amt' }] },
    };
    const { items } = (deriveLiveAttention as any)(snap, () => {});
    const text = items.map((i: any) => `${i.title} ${i.detail}`).join(' | ');
    expect(text).toContain('4870 neue E-Mails');
    expect(text).not.toMatch(/eingetroffen|Firmenkalender|zur Erledigung|Krankmeldung/);
  });
});
