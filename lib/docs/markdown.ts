/** Escaped zuerst, dann Markdown-Untermenge für echte Dokumente (Überschriften, Listen, Tabellen, Links, Bilder, Code). */

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export type DocHeading = { id: string; level: 1 | 2 | 3; text: string };

/** Überschriften aus Markdown für das Inhaltsverzeichnis. */
export function extractHeadings(md: string): DocHeading[] {
  const out: DocHeading[] = [];
  const seen = new Map<string, number>();
  for (const line of md.split(/\r?\n/)) {
    const m = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 1 | 2 | 3;
    const text = m[2].replace(/\*\*|__/g, '').trim();
    let id = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'abschnitt';
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    if (n > 1) id = `${id}-${n}`;
    out.push({ id, level, text });
  }
  return out;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'abschnitt';
}

/** Block-Markdown → HTML. IDs an h1–h3 für TOC-Sprungziele. */
export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html: string = (() => {
    const parts: string[] = [];
    let i = 0;
    const seen = new Map<string, number>();
    const headingId = (raw: string) => {
      let id = slugify(raw.replace(/\*\*|__/g, '').trim());
      const n = (seen.get(id) ?? 0) + 1;
      seen.set(id, n);
      return n > 1 ? `${id}-${n}` : id;
    };
    while (i < lines.length) {
      const line = lines[i];
      // fenced code
      if (line.startsWith('```')) {
        const buf: string[] = [];
        i += 1;
        while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i += 1; }
        i += 1;
        parts.push(`<pre class="ws-md__pre"><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
        continue;
      }
      // table
      if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*\|/.test(lines[i + 1])) {
        const rows: string[][] = [];
        while (i < lines.length && lines[i].includes('|')) {
          const cells = lines[i].split('|').map((c) => c.trim()).filter((_, idx, arr) => !(idx === 0 && arr[0] === '') && !(idx === arr.length - 1 && arr[arr.length - 1] === ''));
          // skip separator row
          if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
          i += 1;
          if (i < lines.length && !lines[i].includes('|')) break;
        }
        if (rows.length) {
          const head = rows[0];
          const body = rows.slice(1);
          parts.push('<table class="ws-md__table"><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
            body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
        }
        continue;
      }
      // headings
      const hm = /^(#{1,3})\s+(.+)$/.exec(line);
      if (hm) {
        const level = hm[1].length;
        const text = hm[2].trim();
        const id = headingId(text);
        parts.push(`<h${level} id="${id}" class="ws-md__h${level}">${inline(text)}</h${level}>`);
        i += 1;
        continue;
      }
      // ul
      if (/^\s*[-*]\s+/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
          i += 1;
        }
        parts.push('<ul class="ws-md__ul">' + items.map((it) => `<li>${inline(it)}</li>`).join('') + '</ul>');
        continue;
      }
      // ol
      if (/^\s*\d+\.\s+/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
          i += 1;
        }
        parts.push('<ol class="ws-md__ol">' + items.map((it) => `<li>${inline(it)}</li>`).join('') + '</ol>');
        continue;
      }
      // image alone
      const im = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line.trim());
      if (im) {
        parts.push(`<figure class="ws-md__fig"><img src="${escapeHtml(im[2])}" alt="${escapeHtml(im[1])}" loading="lazy" /><figcaption>${escapeHtml(im[1])}</figcaption></figure>`);
        i += 1;
        continue;
      }
      // blank
      if (!line.trim()) { i += 1; continue; }
      // paragraph (merge until blank)
      const buf: string[] = [line];
      i += 1;
      while (i < lines.length && lines[i].trim() && !/^(#{1,3})\s|^\s*[-*]\s|^\s*\d+\.\s|^\s*\|/.test(lines[i]) && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i += 1;
      }
      parts.push(`<p class="ws-md__p">${inline(buf.join(' '))}</p>`);
    }
    return parts.join('\n');
  })();
  return html;
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img class="ws-md__img" src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="ws-md__a" href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code class="ws-md__code">$1</code>');
}
