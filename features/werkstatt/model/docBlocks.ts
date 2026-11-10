/**
 * Ein Dokument als Folge von Blöcken (Überschrift, Absatz, Listenpunkt). Das Buch blättert Blöcke in Seiten,
 * bearbeitet wird je Block direkt auf dem Papier; gespeichert wird wieder Markdown (dieselbe Node-API wie bisher).
 */
export type BlockKind = 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'oli' | 'quote';
export interface Block { id: string; kind: BlockKind; text: string }

let seq = 0;
const nid = () => `b${(seq++).toString(36)}`;

export function parseBlocks(md: string): Block[] {
  const out: Block[] = [];
  const lines = (md || '').replace(/\r\n?/g, '\n').split('\n');
  let para: string[] = [];
  const flush = () => { if (para.length) { out.push({ id: nid(), kind: 'p', text: para.join(' ').trim() }); para = []; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flush(); out.push({ id: nid(), kind: (['h1', 'h2', 'h3'] as const)[m[1].length - 1], text: m[2].trim() }); continue; }
    if ((m = line.match(/^\s*[-*•]\s+(?:\[[ xX]\]\s+)?(.*)$/))) { flush(); out.push({ id: nid(), kind: 'li', text: m[1].trim() }); continue; }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flush(); out.push({ id: nid(), kind: 'oli', text: m[1].trim() }); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flush(); out.push({ id: nid(), kind: 'quote', text: m[1].trim() }); continue; }
    para.push(line.trim());
  }
  flush();
  return out.filter((b) => b.text.length > 0 || b.kind === 'p');
}

const PREFIX: Record<BlockKind, string> = { h1: '# ', h2: '## ', h3: '### ', p: '', li: '- ', oli: '1. ', quote: '> ' };
export function serializeBlocks(blocks: Block[]): string {
  let s = '';
  blocks.forEach((b, i) => {
    const prev = blocks[i - 1];
    const tight = prev && (b.kind === 'li' || b.kind === 'oli') && prev.kind === b.kind;
    s += (i === 0 ? '' : tight ? '\n' : '\n\n') + PREFIX[b.kind] + b.text;
  });
  return s + (blocks.length ? '\n' : '');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Inline-Markdown (fett, kursiv) → sicheres HTML. Alles andere bleibt Text. */
export function inlineToHtml(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, '$1<em>$2</em>');
}

/** Bearbeitetes HTML eines Blocks zurück in Inline-Markdown (nur fett/kursiv, Rest als Text). */
export function htmlToInline(html: string): string {
  const s = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<(strong|b)(\s[^>]*)?>/gi, '**').replace(/<\/(strong|b)>/gi, '**')
    .replace(/<(em|i)(\s[^>]*)?>/gi, '_').replace(/<\/(em|i)>/gi, '_')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  return s.replace(/\*\*\*\*/g, '').replace(/__/g, '').replace(/\s+/g, ' ').trim();
}
