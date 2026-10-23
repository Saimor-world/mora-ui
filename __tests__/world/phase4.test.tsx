import { parseDayCommand, type CommandContext } from '@/lib/lea/moraCommands';
import { thoughtDe } from '@/features/mora/ui/AgentFeed';

// Beispiel-Daten, keine echten Kundinnen.
const ctx: CommandContext = {
  tasks: [
    { id: 't1', title: 'Herbstrot nachbestellen', status: 'open' },
    { id: 't2', title: 'Steuerberater anrufen', status: 'open' },
    { id: 't3', title: 'Pinsel reinigen', status: 'done' },
  ],
  todayEvents: [
    { id: 'e1', title: 'Gel-Modellage – Michelle', date: '2026-10-23', time: '10:00' },
    { id: 'e2', title: 'Auffüllen – Sarah', date: '2026-10-23', time: '13:00' },
  ],
  planets: [{ id: 'p1', name: 'Termine' }, { id: 'p2', name: 'Material & Farben' }, { id: 'p3', name: 'Aufgaben' }],
};

describe('parseDayCommand', () => {
  it('hakt eine Aufgabe per Satz ab', () => {
    expect(parseDayCommand('hak Herbstrot ab', ctx)).toMatchObject({ kind: 'done', task: { id: 't1' } });
  });
  it('erkennt „ist da“ über den Namen im Termin', () => {
    expect(parseDayCommand('Michelle ist da', ctx)).toMatchObject({ kind: 'arrived', event: { id: 'e1' } });
  });
  it('springt mit @Bereich', () => {
    expect(parseDayCommand('@Material', ctx)).toMatchObject({ kind: 'jump', planetId: 'p2' });
  });
  it('lässt freie Fragen an den Stream durch', () => {
    expect(parseDayCommand('Wie war die Woche?', ctx)).toBeNull();
  });
  it('meldet unbekannte Ziele ehrlich', () => {
    expect(parseDayCommand('@Lager', ctx)).toMatchObject({ kind: 'unknown-target' });
  });
});

describe('thoughtDe', () => {
  it('übersetzt englische CORE-Logs, lässt Deutsches stehen', () => {
    expect(thoughtDe('Scanning index for exact match')).toMatch(/Sucht/);
    expect(thoughtDe('Neue Datei in Material erkannt')).toBe('Neue Datei in Material erkannt');
  });
});
