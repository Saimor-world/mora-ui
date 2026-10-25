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
  const local = String(email ?? '').split('@')[0]?.trim().toLowerCase();
  if (local && raw.toLowerCase() === local) return '';
  return raw;
}

export function displayName(user: { name?: string | null; email?: string | null; role?: string | null } | null | undefined): string {
  return realName(user?.name, user?.email);
}

/** First word of a real name, or '' when there is none (callers then greet without a name). */
export function firstName(user: { name?: string | null; email?: string | null } | null | undefined): string {
  return realName(user?.name, user?.email).split(/\s+/)[0] || '';
}
