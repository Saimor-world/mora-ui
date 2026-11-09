/** Escaped zuerst, dann die kleine Markdown-Untermenge, die die Dokument-App seit jeher kann (Überschriften, fett, kursiv, Code, Zeilen). */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderMarkdown(md: string): string {
  return escapeHtml(md)
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white/90 mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-white/90 mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="text-white/70">$1</em>')
    .replace(/`(.*?)`/gim, '<code class="px-1 py-0.5 rounded bg-white/10 text-emerald-400 font-mono text-sm">$1</code>')
    .replace(/\n/gim, '<br />');
}
