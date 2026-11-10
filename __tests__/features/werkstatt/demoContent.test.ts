import fs from 'fs';
import path from 'path';
import { parseBlocks } from '@/features/werkstatt/model/docBlocks';

/** Das Demo-Handbuch im Buch am Pult: echter Inhalt, die geforderten Kapitel, kein Satz doppelt. */
const md = fs.readFileSync(path.join(process.cwd(), 'lib/demo/morgenrot/betriebshandbuch.md'), 'utf8');

describe('Betriebshandbuch Café Morgenrot (Demo)', () => {
  it('hat die Kapitel Öffnen, Kasse, Hygiene, Lieferungen, Schließen', () => {
    const h2 = parseBlocks(md).filter((b) => b.kind === 'h2').map((b) => b.text);
    expect(h2).toEqual(['Öffnen', 'Kasse', 'Hygiene', 'Lieferungen', 'Schließen']);
  });
  it('wiederholt keinen Satz', () => {
    const sentences = parseBlocks(md).filter((b) => b.kind === 'p').flatMap((b) => b.text.match(/[^.!?]+[.!?]/g) ?? [])
      .map((s) => s.trim().toLowerCase()).filter((s) => s.length > 12);
    expect(sentences.length).toBeGreaterThan(50);
    expect(sentences.length - new Set(sentences).size).toBe(0);
  });
});
