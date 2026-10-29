const FIKTIV_TAG_RE = /\s*(?:\[fiktiv[^\]]*\]|\(fiktiv\))\s*/gi;
const FIKTIV_COMMA_RE = /\(\s*fiktiv\s*,\s*/gi;

/** Removes literal "[FIKTIV]" / "(FIKTIV)" / "(fiktiv)" markers from displayed titles; the .fiktiv-badge carries the demo notice. */
export function stripFiktiv(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(FIKTIV_COMMA_RE, '(')
    .replace(FIKTIV_TAG_RE, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function hasFiktivMarker(value?: string | null): boolean {
  if (!value) return false;
  return /\[fiktiv|\(fiktiv/i.test(value);
}
