/**
 * Seiten aus gemessenen Stücken: so viele, wie auf eine Seite passen. Überschriften bleiben nie allein
 * unten auf einer Seite stehen (sie wandern mit dem folgenden Stück). Ein Stück, das höher ist als eine Seite,
 * bekommt eine eigene Seite (und wird abgeschnitten gezeigt – darum teilt splitSentences lange Absätze vorher).
 */
export interface Piece { h: number; keepWithNext?: boolean }

export function paginate(pieces: Piece[], pageHeight: number): number[][] {
  const pages: number[][] = [];
  let cur: number[] = [];
  let used = 0;
  for (let i = 0; i < pieces.length; i++) {
    const h = Math.max(0, pieces[i].h);
    if (cur.length && used + h > pageHeight) {
      // Überschriften am Seitenende mitnehmen.
      const carry: number[] = [];
      while (cur.length > 1 && pieces[cur[cur.length - 1]].keepWithNext) carry.unshift(cur.pop() as number);
      pages.push(cur);
      cur = carry;
      used = carry.reduce((s, k) => s + Math.max(0, pieces[k].h), 0);
    }
    cur.push(i);
    used += h;
  }
  if (cur.length || !pages.length) pages.push(cur);
  return pages;
}

/** Auf welcher Doppelseite liegt Seite p (0-basiert)? Linke Seite ist immer gerade. */
export const spreadOf = (page: number) => Math.floor(Math.max(0, page) / 2);
