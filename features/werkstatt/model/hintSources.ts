import type { SemanticSearchResult } from '@/lib/api/searchClient';

export type RoomDocument = { id: string; name: string };
export type Passage = { id: string; title: string; quote: string };

export function roomPassages(rows: SemanticSearchResult[], docs: readonly RoomDocument[], sourceId: string, company: string): Passage[] {
  const allowed = new Map(docs.map(doc => [doc.id, doc.name]));
  const passages: Passage[] = [];
  for (const row of rows) {
    const title = allowed.get(row.node_id);
    if (!title || row.node_id === sourceId || (row.company_id && row.company_id !== company)) continue;
    if (typeof row.content !== 'string' || !row.content.trim()) continue;
    if (passages.some(p => p.id === row.node_id)) continue;
    passages.push({ id: row.node_id, title, quote: row.content.trim() });
    if (passages.length === 3) break;
  }
  return passages;
}

export function localPassages(query: string, docs: readonly RoomDocument[], sourceId: string, read: (id: string) => { content: string } | null): Passage[] {
  const ignored = new Set(['fehlt', 'noch', 'klären', 'offen', 'todo', 'wird', 'sind', 'eine', 'einer', 'einen', 'dieser', 'bitte']);
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\d-]{4,}/gu) ?? [])].filter(term => !ignored.has(term));
  const candidates = docs.filter(doc => doc.id !== sourceId).flatMap(doc => {
    const lines = read(doc.id)?.content.split(/\n+/) ?? [];
    const ranked = lines.map(line => ({ line, score: terms.filter(term => line.toLowerCase().includes(term)).length }))
      .filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    const hit = ranked[0];
    return hit ? [{ id: doc.id, title: doc.name, quote: hit.line.trim(), score: hit.score }] : [];
  });
  return candidates.sort((a, b) => b.score - a.score).slice(0, 3);
}
