/**
 * Names, never email addresses (stylebook 22.10.2026, Bauauftrag part 9).
 *
 * An email address or its local part is not a name: "Guten Tag, lea.k@…" reads like a
 * system message. When no real name is stored, the name stays empty: callers greet
 * neutrally ("Guten Abend"), never with a gendered role word (Marius, 24.10.2026).
 */
export function realName(name?: string | null, email?: string | null): string {
  const raw = String(name ?? '').trim();
  if (!raw || raw.includes('@')) return '';
  // Only an unedited local part ("lea") is not a name; a capitalised entry ("Marius" for
  // marius@…) is a name the person typed and stays (Marius was greeted without a name).
  const local = String(email ?? '').split('@')[0]?.trim();
  if (local && raw === local && raw === raw.toLowerCase()) return '';
  return raw;
}

export function displayName(user: { name?: string | null; email?: string | null; role?: string | null } | null | undefined): string {
  return realName(user?.name, user?.email);
}

/** First word of a real name, or '' when there is none (callers then greet without a name). */
export function firstName(user: { name?: string | null; email?: string | null } | null | undefined): string {
  return realName(user?.name, user?.email).split(/\s+/)[0] || '';
}
