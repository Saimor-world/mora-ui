import { parseBlocks, serializeBlocks, htmlToInline, inlineToHtml } from '@/features/werkstatt/model/docBlocks';
import { parseWeek, serializeWeek, setCell, addRow, isoWeek, mondayOf, weekRange } from '@/features/werkstatt/model/weekSheet';
import { arrangeBoard } from '@/features/werkstatt/model/board';
import { findHints } from '@/features/werkstatt/model/hints';
import { coverStage, cameraTo, worldFor } from '@/features/werkstatt/model/stage';
import { layoutBook } from '@/features/werkstatt/model/layout';
import type { WorkTask } from '@/lib/universe/deptWork';

describe('Dokument als Blöcke', () => {
  it('liest Überschriften, Absätze und Listen und schreibt sie zurück', () => {
    const md = '# Wochenplan\n\nErster Absatz\nzweite Zeile.\n\n## Einkauf\n\n- Milch\n- Hafermilch\n\n1. Erst\n';
    const b = parseBlocks(md);
    expect(b.map((x) => x.kind)).toEqual(['h1', 'p', 'h2', 'li', 'li', 'oli']);
    expect(b[1].text).toBe('Erster Absatz zweite Zeile.');
    expect(parseBlocks(serializeBlocks(b)).map((x) => [x.kind, x.text])).toEqual(b.map((x) => [x.kind, x.text]));
  });
  it('fett und kursiv überleben die Bearbeitung auf dem Papier', () => {
    expect(inlineToHtml('a **b** _c_ <x>')).toBe('a <strong>b</strong> <em>c</em> &lt;x&gt;');
    expect(htmlToInline('a <strong>b</strong> <em>c</em>&nbsp;d<br>e')).toBe('a **b** _c_ d e');
  });
});

describe('Seiten', () => {
  it('ein 40-Seiten-Dokument ergibt 40 Seiten (20 Doppelseiten), verlustfrei', () => {
    const blocks = Array.from({ length: 400 }, (_, i) => ({ id: `b${i}`, kind: 'p' as const, text: 'x'.repeat(59) }));
    const L = layoutBook(blocks, (_k, t) => Math.ceil(t.length / 10) * 10, 600, 20);
    expect(L.pages).toHaveLength(40);
    expect(Math.ceil(L.pages.length / 2)).toBe(20);
    expect(L.pieces).toHaveLength(400);
  });
});

describe('Wochenblatt', () => {
  const md = '# Wochenplan KW 46\n\n| | Mo | Di | Mi | Do | Fr | Sa | So |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| Theke | Lea früh | Nina | | | | alle | zu |\n| Küche | Teig | | | | | | |\n\n## Offen\n\n- Schichten Dezember\n';
  it('liest Zeilen und Tage', () => {
    const w = parseWeek(md);
    expect(w.title).toBe('Wochenplan KW 46');
    expect(w.rows.map((r) => r.label)).toEqual(['Theke', 'Küche']);
    expect(w.rows[0].cells).toEqual(['Lea früh', 'Nina', '', '', '', 'alle', 'zu']);
    expect(w.open).toEqual(['Schichten Dezember']);
  });
  it('von Hand eintragen bleibt nach dem Speichern erhalten', () => {
    const w = addRow(setCell(parseWeek(md), 1, 2, 'Kürbis | suppe'), 'Einkauf');
    const back = parseWeek(serializeWeek(w));
    expect(back.rows[1].cells[2]).toBe('Kürbis / suppe');
    expect(back.rows[2]).toEqual({ label: 'Einkauf', cells: ['', '', '', '', '', '', ''] });
  });
  it('Wochen rechnen', () => {
    expect(mondayOf('2026-11-12')).toBe('2026-11-09');
    expect(isoWeek('2026-11-09')).toBe(46);
    expect(weekRange('2026-11-09')).toBe('9.–15. November');
  });
});

const task = (i: number, due: string | null, overdue = false): WorkTask => ({
  id: `t${i}`, title: `Aufgabe ${i}`, status: 'backlog', done: false, due, overdue, dueToday: false, folderId: null, assignee: null, raw: { id: `t${i}`, title: '', status: 'backlog' },
});
describe('Aufgabenbrett', () => {
  it('40 Aufgaben: vorne Blätter zu sechs Karten, der Rest liegt als Stapel „Später“', () => {
    const tasks = [
      ...Array.from({ length: 6 }, (_, i) => task(i, '2026-11-0' + (i + 1), true)),
      ...Array.from({ length: 16 }, (_, i) => task(10 + i, `2026-11-${String(11 + (i % 12)).padStart(2, '0')}`)),
      ...Array.from({ length: 10 }, (_, i) => task(40 + i, '2026-12-20')),
      ...Array.from({ length: 8 }, (_, i) => task(60 + i, null)),
    ];
    const b = arrangeBoard(tasks, '2026-11-10');
    expect(b.open).toBe(40);
    expect(b.overdue).toBe(6);
    expect(b.pages.every((p) => p.length <= 6)).toBe(true);
    expect(b.pages.flat()).toHaveLength(22);
    expect(b.later).toHaveLength(18);
    // Überfälliges zuerst, dann nach Datum
    expect(b.pages[0].slice(0, 6).every((t) => t.overdue)).toBe(true);
    const dues = b.pages.flat().filter((t) => !t.overdue).map((t) => t.due ?? '');
    expect([...dues].sort()).toEqual(dues);
  });
});

describe('Randzettel', () => {
  it('findet offene Stellen', () => {
    const h = findHints(parseBlocks('# A\n\nDie Lieferzeit vom Stadtrand-Hof fehlt noch. Rest.\n\nAlles gut.'));
    expect(h).toHaveLength(1);
    expect(h[0].quote).toBe('Die Lieferzeit vom Stadtrand-Hof fehlt noch.');
  });
});

describe('Bühne und Kamera', () => {
  it('cover: 1440×900 schneidet nur seitlich', () => {
    const s = coverStage(1440, 900);
    expect(s.k).toBeCloseTo(900 / 1080);
    expect(s.y).toBe(0);
    expect(s.x).toBeLessThan(0);
  });
  it('fährt auf ein Objekt zu, ohne zu verkleinern', () => {
    const c = cameraTo({ x: 100, y: 100, w: 200, h: 100 }, 1000, 800, 0.8);
    expect(c.scale).toBe(4);
    expect(c.tx + 200 * c.scale).toBe(500);
  });
  it('Welt folgt der Tageszeit des Docks', () => {
    expect(worldFor('flow')).toBe('morgennebel');
    expect(worldFor('night')).toBe('nacht');
  });
});

describe('layoutBook – Seiten wie im Buch', () => {
  // 10 Zeichen = 1 Zeile = 10 Einheiten; Seite = 100 Einheiten (10 Zeilen).
  const measure = (_k: string, t: string) => Math.ceil(t.length / 10) * 10;
  it('füllt Seiten bis zur Zeile und teilt Absätze an Wortgrenzen', () => {
    const words = Array.from({ length: 60 }, (_, i) => `w${String(i).padStart(3, '0')}`); // 4 Zeichen + Leerzeichen
    const blocks = [{ id: 'a', kind: 'p' as const, text: words.slice(0, 14).join(' ') }, { id: 'b', kind: 'p' as const, text: words.join(' ') }];
    const L = layoutBook(blocks, measure, 100, 20);
    const used = L.pages.map((pg) => pg.reduce((s, i) => s + measure('p', L.pieces[i].text), 0));
    expect(used[0]).toBeGreaterThanOrEqual(90); // erste Seite voll, nicht halb leer
    expect(used.every((u) => u <= 100)).toBe(true);
    const bParts = L.pieces.filter((p) => p.blockId === 'b');
    expect(bParts.length).toBeGreaterThan(1);
    expect(bParts.map((p) => p.text).join(' ')).toBe(blocks[1].text); // verlustfrei
    expect(bParts.slice(0, -1).every((p) => !p.last)).toBe(true);
  });
  it('Überschrift bleibt nicht allein unten auf der Seite', () => {
    const blocks = [{ id: 'a', kind: 'p' as const, text: 'x'.repeat(85) }, { id: 'h', kind: 'h2' as const, text: 'Kapitel' }, { id: 'c', kind: 'p' as const, text: 'y '.repeat(30).trim() }];
    const L = layoutBook(blocks, measure, 100, 20);
    const hPage = L.pages.findIndex((pg) => pg.some((i) => L.pieces[i].blockId === 'h'));
    expect(hPage).toBe(1);
  });
  it('lässt keine einzelne Zeile am Seitenanfang oder -ende stehen', () => {
    const words = Array.from({ length: 21 }, (_, i) => `w${String(i).padStart(3, '0')}`); // 21 Wörter = 11 Zeilen
    const L = layoutBook([{ id: 'p', kind: 'p', text: words.join(' ') }], measure, 100, 20);
    const parts = L.pieces.map((p) => measure('p', p.text));
    expect(parts.length).toBe(2);
    expect(Math.min(...parts)).toBeGreaterThanOrEqual(20);
  });
  it('teilt nicht mitten in **fett**', () => {
    const text = 'aaaa bbbb cccc **dddd eeee ffff gggg** hhhh iiii jjjj kkkk llll mmmm nnnn oooo pppp';
    const L = layoutBook([{ id: 'p', kind: 'p', text: 'z'.repeat(70) }, { id: 'q', kind: 'p', text }], measure, 100, 20);
    for (const p of L.pieces.filter((x) => x.blockId === 'q')) expect((p.text.match(/\*\*/g) ?? []).length % 2).toBe(0);
  });
});

import { roomStage } from '@/features/werkstatt/model/stage';
describe('Raumbühne', () => {
  it('4:3 (1024×768): Regal (x 20) und Pult (x 1720) beide im Bild, Höhe vom Rand gedeckt', () => {
    const s = roomStage(coverStage(1024, 768));
    expect(s.x + 20 * s.k).toBeGreaterThanOrEqual(-0.5);
    expect(s.x + 1720 * s.k).toBeLessThanOrEqual(1024.5);
    expect(-s.y / s.k).toBeLessThanOrEqual(200);
  });
  it('16:9 bleibt cover', () => {
    const c = coverStage(1920, 1080);
    expect(roomStage(c)).toEqual(c);
  });
});
