import { isSemanticEnabled } from './semantic';
import { getCoreApiUrl, getJwtToken, getAuthHeader } from '../config';

export type MindloopItem = {
  id: string;
  type: 'semantic' | 'awareness' | 'system' | 'anomaly' | 'opportunity' | string;
  title?: string;
  summary?: string;
  severity?: number;
  timestamp?: string;
  tags?: string[];
  entity_id?: string;
  related_ids?: string[];
};

export type MindloopSynthesisSummary = {
  total?: number;
  highest_severity?: number;
  breakdown?: Record<string, number>;
};

export type MindloopSynthesisResponse = {
  items: MindloopItem[];
  summary?: MindloopSynthesisSummary;
};

export async function getMindloopSynthesis(signal?: AbortSignal): Promise<MindloopSynthesisResponse | null> {
  if (!isSemanticEnabled()) return null;

  const baseUrl = getCoreApiUrl();
  if (!baseUrl) return null;

  const token = getJwtToken();
  const authHeaderName = getAuthHeader();

  const url = `${baseUrl}/v1/mindloop/synthesis`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers[authHeaderName] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { method: 'GET', headers, signal });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as any;
    const items = Array.isArray(data.items) ? data.items : [];
    const summary = data.summary && typeof data.summary === 'object' ? data.summary : undefined;
    return { items, summary };
  } catch (error) {
    console.error('Mindloop synthesis fetch failed', error);
    return null;
  }
}
