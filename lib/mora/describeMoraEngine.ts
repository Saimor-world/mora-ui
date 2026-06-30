/**
 * Maps CORE's /v3/system/api-management contract into a small "what brain is
 * Môra running on" descriptor for the governance badge — one source of truth,
 * shown in both OS and Desk. Returns null when nothing is selected.
 */

export type EngineResidency = 'local' | 'eu' | 'us' | 'unknown';

export interface MoraEngine {
  provider: string;
  model: string;
  residency: EngineResidency;
  label: string;
}

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: 'Claude',
  gemini: 'Gemini',
  openai: 'OpenAI',
  ollama: 'Lokal (EU)',
};

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function residencyOf(value: unknown): EngineResidency {
  return value === 'local' || value === 'eu' || value === 'us' ? value : 'unknown';
}

export function describeMoraEngine(contract: unknown): MoraEngine | null {
  if (!contract || typeof contract !== 'object') return null;
  const pm = (contract as Record<string, any>).provider_management;
  if (!pm || typeof pm !== 'object') return null;

  const provider = str(pm.field_planner?.selected_provider);
  if (!provider) return null;

  const recent = Array.isArray(pm.field_usage?.recent) ? pm.field_usage.recent : [];
  const lastForProvider = recent.find((r: any) => str(r?.provider) === provider) ?? recent[0];
  const model =
    str(lastForProvider?.model) ||
    str(pm.field_planner?.models?.[provider]) ||
    provider;

  const residency = residencyOf(pm.providers?.[provider]?.residency);
  const providerLabel = PROVIDER_LABEL[provider] ?? provider;

  return {
    provider,
    model,
    residency,
    label: `${providerLabel} · ${model}`,
  };
}
