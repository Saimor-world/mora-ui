import type { OpenFlowLagebild, OpenFlowSignal, OpenFlowPriority } from '@/lib/openflow/types';

const PRIORITY_LABEL: Record<OpenFlowPriority, string> = {
  urgent: 'dringend',
  high: 'wichtig',
  normal: 'normal',
  low: 'niedrig',
};

function line(signal: OpenFlowSignal): string {
  const prio = PRIORITY_LABEL[signal.priority] ?? signal.priority;
  const summary = signal.summary?.trim() ? ` — ${signal.summary.trim()}` : '';
  return `- [${prio}] ${signal.title}${summary}`;
}

/**
 * Turns the live Lagebild into a German transcript for POST /v3/mora/field.
 * It hands Môra the raw signals and asks her to read them; the field system
 * prompt (CORE) already instructs her to answer in placeCard/connect grammar.
 * Returns '' when there is nothing to interpret.
 */
export function describeLagebild(
  lagebild: Pick<OpenFlowLagebild, 'changed' | 'attention' | 'nextSteps'>,
): string {
  const { changed, attention, nextSteps } = lagebild;
  if (changed.length === 0 && attention.length === 0 && nextSteps.length === 0) return '';

  const parts: string[] = [
    'Das ist meine aktuelle Lage. Forme daraus ein Lagefeld mit deiner Deutung — was bedeutet das zusammen, worauf soll ich schauen, was wären gesperrte nächste Schritte?',
  ];

  if (changed.length > 0) {
    parts.push('', 'Signale:', ...changed.slice(0, 6).map(line));
  }

  const changedIds = new Set(changed.map((s) => s.id));
  const openPoints = attention.filter((s) => !changedIds.has(s.id)).slice(0, 4);
  if (openPoints.length > 0) {
    parts.push('', 'Offene Punkte:', ...openPoints.map((s) => `- ${s.title}`));
  }

  const steps = nextSteps.flatMap((s) =>
    s.suggestedActions.slice(0, 1).map((a) => `- ${a.label} (zu: ${s.title})`),
  ).slice(0, 4);
  if (steps.length > 0) {
    parts.push('', 'Mögliche nächste Schritte:', ...steps);
  }

  return parts.join('\n');
}
