import type { Block } from './docBlocks';

/**
 * Randzettel von MÔRA: leise Hinweise zu Stellen im Text, die noch offen sind. Heute regelbasiert (lokal,
 * ohne Modellaufruf): Platzhalter wie „fehlt noch“, „TODO“, „??“ oder „[offen]“. Ein Zettel je Stelle.
 */
export interface Hint { blockId: string; text: string; quote: string }

const OPEN = /(fehlt noch|fehlt\b|todo\b|\?\?|\[offen\]|noch klären|tbd\b)/i;

export function findHints(blocks: Block[], max = 6): Hint[] {
  const out: Hint[] = [];
  for (const b of blocks) {
    const plain = b.text.replace(/[*_]/g, '');
    const m = plain.match(OPEN);
    if (!m || m.index === undefined) continue;
    const sentence = (plain.match(/[^.!?]*[.!?]?/g) ?? [plain]).find((s) => OPEN.test(s))?.trim() || plain;
    const quote = sentence.length > 64 ? `${sentence.slice(0, 61).trimEnd()} …` : sentence;
    out.push({ blockId: b.id, quote, text: 'Das ist noch offen. Soll ich nachsehen, was wir dazu schon wissen?' });
    if (out.length >= max) break;
  }
  return out;
}
