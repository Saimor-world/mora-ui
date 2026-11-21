import { useUniverseFocus, type UniverseTarget } from '@/lib/lea/universeFocus';
import { useOsShellStore, type PostReturn } from '@/lib/os-prototype/shellStore';

/** Bezug eines abgeleiteten Eintrags auf seine Quelle, wie CORE ihn liefert (nur dem Postfach-Inhaber). */
export interface MailSource { kind: 'mail'; mail_id: string }

/** Mailkennung des Eintrags – nur aus CORE `source`, nie aus Titel oder Betreff erraten. */
export function mailSourceId(raw: unknown): string | null {
  const source = (raw as { source?: Partial<MailSource> | null } | null)?.source;
  return source?.kind === 'mail' && typeof source.mail_id === 'string' && source.mail_id ? source.mail_id : null;
}

/** Öffnet die konkrete Originalmail in der Post und merkt sich den Rückweg zum Eintrag. */
export function openOriginalMail(mailId: string, focus?: UniverseTarget | null) {
  const shell = useOsShellStore.getState();
  shell.setPostReturn({ featureId: shell.activeFeatureId, focus: focus ?? null });
  shell.setPostOpenId(mailId);
  shell.setActiveFeature('post');
}

export function returnFromOriginalMail(back: PostReturn) {
  if (back.focus) useUniverseFocus.getState().show(back.focus);
  useOsShellStore.getState().setActiveFeature(back.featureId);
}

export function reconnectMailbox() {
  const shell = useOsShellStore.getState();
  shell.setSettingsSection('sources');
  shell.setActiveFeature('settings');
}

/** Warum das Original nicht da ist – jede Ursache braucht eine andere Rückmeldung. */
export type OriginalProblem = 'reauth' | 'gone' | 'denied' | 'unavailable' | 'failed';

export class OriginalMailError extends Error {
  constructor(readonly problem: OriginalProblem) {
    super(problem);
    this.name = 'OriginalMailError';
  }
}

export function originalProblem(error: unknown): OriginalProblem | null {
  if (!error) return null;
  if (error instanceof OriginalMailError) return error.problem;
  // CoreError (lib/api/http) trägt status und details; hier nur deren Form prüfen.
  const { status, details } = error as { status?: unknown; details?: { code?: unknown } | null };
  if (status === 409 && details?.code === 'mail_reauth_required') return 'reauth';
  if (status === 404) return 'gone';
  if (status === 403) return 'denied';
  return 'failed';
}

export const ORIGINAL_PROBLEM_TEXT: Record<OriginalProblem, string> = {
  reauth: 'Postfach-Verbindung abgelaufen.',
  gone: 'Diese Mail ist im Postfach nicht mehr vorhanden.',
  denied: 'Kein Zugriff auf diese Mail.',
  unavailable: 'Diese Nachricht ist nicht verfügbar.',
  failed: 'Das Original konnte nicht geladen werden.',
};
