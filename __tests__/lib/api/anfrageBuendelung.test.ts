/**
 * Gleiche Anfrage, gleicher Moment — eine Leitung.
 *
 * Beim Start des OS gehen 43 Anfragen an CORE, aber nur 25 verschiedene.
 * 18 sind Doppelungen: Zwei Komponenten fragen dasselbe, wenige
 * Millisekunden auseinander, weil sie nichts voneinander wissen.
 *
 *   users/me/content        2408 ms, 2412 ms
 *   integrations/overview   2395 ms, 2420 ms
 *   mycelium/overview       2768 ms, 2880 ms
 *
 * Jede kostet rund 400 ms und einen Platz in der Warteschlange des
 * Browsers, der nur sechs gleichzeitige Verbindungen zu einem Host
 * zulaesst. Die spaeteren Anfragen warteten dadurch bis zu 16 Sekunden —
 * nicht weil der Server langsam ist, sondern weil vor ihnen dreissig
 * andere standen.
 *
 * Laeuft dieselbe Leseanfrage schon, wird ihre Zusage geteilt statt eine
 * zweite geschickt. Nur fuer GET: Ein zweites POST ist eine zweite
 * Absicht, kein Duplikat.
 */

import { buendele, _leereBuendelung } from '@/lib/api/anfrageBuendelung';

beforeEach(() => _leereBuendelung());

describe('Buendelung laufender Anfragen', () => {
  it('schickt bei gleichzeitig gleicher Anfrage nur eine los', async () => {
    let laeufe = 0;
    const holen = () => { laeufe++; return new Promise(r => setTimeout(() => r('inhalt'), 20)); };

    const [a, b, c] = await Promise.all([
      buendele('/v3/companies', holen),
      buendele('/v3/companies', holen),
      buendele('/v3/companies', holen),
    ]);

    expect(laeufe).toBe(1);
    expect([a, b, c]).toEqual(['inhalt', 'inhalt', 'inhalt']);
  });

  it('haelt verschiedene Anfragen auseinander', async () => {
    let laeufe = 0;
    const holen = () => { laeufe++; return Promise.resolve('x'); };

    await Promise.all([
      buendele('/v3/companies', holen),
      buendele('/v3/tree', holen),
    ]);

    expect(laeufe).toBe(2);
  });

  it('buendelt nicht ueber die Zeit hinweg', async () => {
    // Kein Zwischenspeicher: Wer spaeter fragt, bekommt frische Daten.
    // Sonst wuerde aus einer Beschleunigung eine stille Veraltung.
    let laeufe = 0;
    const holen = () => { laeufe++; return Promise.resolve('x'); };

    await buendele('/v3/companies', holen);
    await buendele('/v3/companies', holen);

    expect(laeufe).toBe(2);
  });

  it('gibt den Platz auch nach einem Fehlschlag frei', async () => {
    // Bliebe die gescheiterte Zusage stehen, bekaeme jeder spaetere
    // Aufrufer denselben Fehler — dauerhaft.
    let laeufe = 0;
    const kaputt = () => { laeufe++; return Promise.reject(new Error('weg')); };

    await expect(buendele('/v3/x', kaputt)).rejects.toThrow('weg');
    await expect(buendele('/v3/x', kaputt)).rejects.toThrow('weg');

    expect(laeufe).toBe(2);
  });

  it('reicht den Fehlschlag an alle Wartenden weiter', async () => {
    const kaputt = () => new Promise((_, ab) => setTimeout(() => ab(new Error('weg')), 10));

    const ergebnisse = await Promise.allSettled([
      buendele('/v3/y', kaputt),
      buendele('/v3/y', kaputt),
    ]);

    expect(ergebnisse.every(e => e.status === 'rejected')).toBe(true);
  });
});
