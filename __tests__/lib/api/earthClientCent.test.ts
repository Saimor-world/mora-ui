import { centAusEingabe } from '@/lib/api/earthClient';

/**
 * Geld aus einem Eingabefeld.
 *
 * `Math.round(parseFloat(x) * 100)` sieht harmlos aus und ist die uebliche
 * Loesung — aber `parseFloat('120.55') * 100` ergibt 12054.999999999998.
 * Hier wird deshalb gar nicht erst gerechnet, sondern getrennt.
 */
describe('centAusEingabe', () => {
  it('nimmt Komma und Punkt gleichermassen', () => {
    expect(centAusEingabe('120,50')).toBe(12050);
    expect(centAusEingabe('120.50')).toBe(12050);
  });

  it('faellt nicht auf Gleitkomma herein', () => {
    // Die Faelle, bei denen parseFloat * 100 danebenliegt.
    expect(centAusEingabe('120,55')).toBe(12055);
    expect(centAusEingabe('1,15')).toBe(115);
    expect(centAusEingabe('8,29')).toBe(829);
    expect(centAusEingabe('1234567,89')).toBe(123456789);
  });

  it('ergaenzt fehlende Nachkommastellen', () => {
    expect(centAusEingabe('120')).toBe(12000);
    expect(centAusEingabe('120,5')).toBe(12050);
    expect(centAusEingabe('120,')).toBe(12000);
  });

  it('vertraegt Leerzeichen', () => {
    expect(centAusEingabe('  120,50 ')).toBe(12050);
    expect(centAusEingabe('1 20,50')).toBe(12050);
  });

  it('gibt null statt einer stillen Null zurueck', () => {
    // Eine 0 wuerde behaupten, der Posten habe nichts gekostet.
    expect(centAusEingabe('')).toBeNull();
    expect(centAusEingabe('abc')).toBeNull();
    expect(centAusEingabe('12,345')).toBeNull();
    expect(centAusEingabe('-5')).toBeNull();
    expect(centAusEingabe('1,2,3')).toBeNull();
  });

  it('liefert immer Ganzzahlen', () => {
    for (const eingabe of ['0', '0,01', '99999,99', '7,07']) {
      const cent = centAusEingabe(eingabe)!;
      expect(Number.isInteger(cent)).toBe(true);
    }
  });
});
