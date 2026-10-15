import type { SourceEntry } from './useSources';

/**
 * Evidence about a connector only; says nothing about whether a legacy UI
 * implementation itself is working. Do not manufacture an app "health" state.
 */
export const SOURCE_DEPENDENT_APPS: Readonly<Record<string, string>> = {
  mail: 'mail',
  calendar: 'calendar',
};

export type ConnectionEvidence =
  | 'no_session'
  | 'checking'
  | 'unavailable'
  | 'connected'
  | 'available'
  | 'setup_required'
  | 'not_listed';

export function assessSourceConnection(
  group: string,
  state: { hasSession: boolean; isLoading: boolean; isError: boolean; isSuccess: boolean; connections?: SourceEntry[] },
): ConnectionEvidence {
  if (!state.hasSession) return 'no_session';
  if (state.isLoading || !state.isSuccess && !state.isError) return 'checking';
  if (state.isError) return 'unavailable';
  const matches = (state.connections || []).filter((source) => source.group === group);
  if (matches.some((source) => source.status === 'connected')) return 'connected';
  if (matches.some((source) => source.status === 'available')) return 'available';
  if (matches.some((source) => source.status === 'setup_required')) return 'setup_required';
  return 'not_listed';
}

export type AppPrimaryAction = 'sources' | 'feature' | 'legacy';

/** When a CORE-backed app is not confirmed connected, sources come first.
 * A feature placement alone must never hide missing connection evidence.
 */
export function appPrimaryAction(feature: string | undefined, evidence: ConnectionEvidence | null): AppPrimaryAction {
  if (evidence !== null && evidence !== 'connected') return 'sources';
  return feature ? 'feature' : 'legacy';
}

export const CONNECTION_EVIDENCE_LABEL: Record<ConnectionEvidence, string> = {
  no_session: 'CORE-Sitzung erforderlich',
  checking: 'Quelle wird bei CORE geprüft',
  unavailable: 'Quellenstatus nicht abrufbar',
  connected: 'Quelle laut CORE verbunden',
  available: 'Quelle kann angedockt werden',
  setup_required: 'Server-Einrichtung erforderlich',
  not_listed: 'Quelle von CORE nicht gemeldet',
};
