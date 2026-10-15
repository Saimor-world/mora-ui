/** A greeting is a person's short name, never a full email address.
 * Data from legacy profiles can contain the email instead of displayName.
 * Keep the raw address in the profile; only this presentation is shortened.
 */
export function todayGreetingName(name: string | null | undefined, email?: string | null): string | null {
  const value = (name?.trim() || email?.trim() || '').trim();
  if (!value) return null;
  // A full email as fallback is not a first name. Greet using its local part.
  if (/^[^\s@]+@[^\s@]+$/.test(value)) {
    return value.slice(0, value.indexOf('@')) || null;
  }
  return value.split(/\s+/u)[0] || null;
}
