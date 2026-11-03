/**
 * Premium-Runde 4: das Deck schweigt. Keine „MÔRA fragen“-Knöpfe pro Instrument,
 * keine erklärenden Leer-Sätze, keine Vorschlags-Chips – ein Weg zu MÔRA ist das Feld in der Mitte.
 * Und: jede Bewegung des Premium-Layers respektiert prefers-reduced-motion.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('HQ Premium: visuelle Ruhe', () => {
  const bridge = read('components/os-shell/BridgeConcept.tsx');

  it('Instrumente haben keinen eigenen „MÔRA fragen“-Knopf', () => {
    expect(bridge).not.toMatch(/>MÔRA fragen</);
  });

  it('leere Instrumente zeigen keinen Erklärsatz', () => {
    expect(bridge).not.toMatch(/bridge__inst-empty/);
    expect(bridge).not.toMatch(/Heute keine Schichten im Plan|Keine offenen Aufgaben|Keine Mails im Eingang/);
  });

  it('keine Vorschlags-Chips unter dem MÔRA-Feld', () => {
    expect(bridge).not.toMatch(/bridge__chips/);
  });

  it('Premium-Layer existiert und hält reduced-motion ein', () => {
    const css = read('components/os-shell/bridge-concept.css');
    const layer = css.split('/* Runde 4 · Premium')[1];
    expect(layer).toBeDefined();
    expect(layer).toMatch(/@media \(prefers-reduced-motion: ?reduce\)/);
    expect(layer).not.toMatch(/\.webp/);
  });
});
