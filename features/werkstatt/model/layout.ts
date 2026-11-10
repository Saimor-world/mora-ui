import type { Block } from './docBlocks';

/**
 * Satz eines Dokuments in Buchseiten. Absätze werden an Wortgrenzen auf Zeilengenauigkeit geteilt (wie im Buch),
 * Überschriften bleiben bei ihrem nächsten Absatz. `measure` liefert die Höhe eines Stücks in derselben Einheit wie
 * `pageH` – im Browser misst eine unsichtbare Seite, im Test reicht eine Zeichenzählung.
 */
export interface Piece { key: string; blockId: string; part: number; kind: Block['kind']; text: string; last: boolean }
export type Measure = (kind: Block['kind'], text: string, cont: boolean, open: boolean) => number;
export interface BookLayout { pieces: Piece[]; pages: number[][] }

const HEADINGS = new Set<Block['kind']>(['h1', 'h2', 'h3']);
const SPLITTABLE = new Set<Block['kind']>(['p', 'li', 'oli', 'quote']);
/** Inline-Markdown darf nicht mitten in **fett** oder _kursiv_ geteilt werden. */
const balanced = (s: string) => (s.match(/\*\*/g)?.length ?? 0) % 2 === 0 && (s.replace(/\*\*/g, '').match(/_/g)?.length ?? 0) % 2 === 0;

export function layoutBook(blocks: Block[], measure: Measure, pageH: number, minH: number): BookLayout {
  const pieces: Piece[] = [];
  const pages: number[][] = [[]];
  let used = 0;
  const newPage = () => { if (pages[pages.length - 1].length) pages.push([]); used = 0; };
  const push = (p: Piece, h: number) => { pieces.push(p); pages[pages.length - 1].push(pieces.length - 1); used += h; };

  blocks.forEach((b, bi) => {
    if (HEADINGS.has(b.kind)) {
      const h = measure(b.kind, b.text, false, false);
      const next = blocks[bi + 1];
      const follow = next ? Math.min(minH, measure(next.kind, next.text, false, false)) : 0;
      if (used > 0 && used + h + follow > pageH) newPage();
      push({ key: `${b.id}:0`, blockId: b.id, part: 0, kind: b.kind, text: b.text, last: true }, h);
      return;
    }
    let rest = b.text;
    let part = 0;
    for (let guard = 0; guard < 400; guard++) {
      const cont = part > 0;
      const h = measure(b.kind, rest, cont, false);
      if (used + h <= pageH) { push({ key: `${b.id}:${part}`, blockId: b.id, part, kind: b.kind, text: rest, last: true }, h); return; }
      const room = pageH - used;
      if (SPLITTABLE.has(b.kind) && room >= minH) {
        const words = rest.split(' ');
        let lo = 0, hi = words.length - 1; // größtes k (1..n-1), dessen Vorderteil passt
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (measure(b.kind, words.slice(0, mid).join(' '), cont, true) <= room) lo = mid; else hi = mid - 1;
        }
        let k = lo;
        while (k > 0 && !balanced(words.slice(0, k).join(' '))) k--;
        if (k > 0) {
          const head = words.slice(0, k).join(' ');
          push({ key: `${b.id}:${part}`, blockId: b.id, part, kind: b.kind, text: head, last: false }, measure(b.kind, head, cont, true));
          newPage();
          rest = words.slice(k).join(' ');
          part++;
          continue;
        }
      }
      if (used === 0) { push({ key: `${b.id}:${part}`, blockId: b.id, part, kind: b.kind, text: rest, last: true }, h); newPage(); return; }
      newPage();
    }
  });
  if (pages.length > 1 && !pages[pages.length - 1].length) pages.pop();
  return { pieces, pages };
}

/** Text eines Blocks aus seinen (ggf. bearbeiteten) Stücken – geteilt wurde nur an Leerzeichen. */
export const joinParts = (parts: string[]) => parts.join(' ').replace(/\s+/g, ' ').trim();
