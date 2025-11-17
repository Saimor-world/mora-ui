import type { MoraNode } from '../mycelium/model';

export type SemanticContext = {
  nodeId: string;
  summary?: string;
  neighbors?: Array<{ id: string; weight?: number }>;
  tags?: string[];
};

export type SemanticRequest = {
  prompt: string;
  selection?: {
    id: string;
    label?: string;
    type?: string;
    space?: string;
  };
};

export type SemanticSource = {
  id?: string;
  title?: string;
  url?: string;
  snippet?: string;
};

export type SemanticResponse = {
  answer: string;
  sources?: SemanticSource[];
};

export type SemanticEvent = {
  event_id: string;
  entity_id: string;
  signal_type: 'hint' | 'opportunity' | 'anomaly';
  severity: number; // 0.0-1.0
  message: string;
  related_objects: string[];
  timestamp: string;
};

export type SemanticEventsResponse = {
  events: SemanticEvent[];
};

export function isSemanticEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_SEMANTIC === 'true';
}

export async function fetchSemanticContext(
  nodeId: string,
  signal?: AbortSignal
): Promise<SemanticContext | null> {
  if (!isSemanticEnabled()) {
    return null;
  }
  const baseUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
  if (!baseUrl) {
    return null;
  }
  const response = await fetch(`${baseUrl}/v1/semantic/context/${encodeURIComponent(nodeId)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as any;
  return {
    nodeId,
    summary: typeof data.summary === 'string' ? data.summary : undefined,
    neighbors: Array.isArray(data.neighbors)
      ? data.neighbors.map((neighbor: any) => ({
          id: neighbor.id,
          weight: neighbor.weight,
        }))
      : undefined,
    tags: Array.isArray(data.tags) ? data.tags : undefined,
  };
}

export function buildSemanticPrompt(node?: MoraNode): string | null {
  if (!node) return null;
  return `Kontext fuer ${node.label} (${node.type})${node.tags?.length ? ` - Tags: ${node.tags.join(', ')}` : ''}`;
}

export async function getSemanticAnswer(
  request: SemanticRequest,
  signal?: AbortSignal
): Promise<SemanticResponse | null> {
  if (!isSemanticEnabled()) return null;
  const baseUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
  if (!baseUrl) return null;

  const url = `${baseUrl}/v1/semantic/answer`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const token = process.env.NEXT_PUBLIC_JWT_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal,
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as any;
    const answer = typeof data.answer === 'string' ? data.answer : null;
    if (!answer) return null;
    const sources = Array.isArray(data.sources)
      ? data.sources.map((src: any) => ({
          id: src.id,
          title: src.title,
          url: src.url,
          snippet: src.snippet,
        }))
      : undefined;
    return { answer, sources };
  } catch (error) {
    console.error('Semantic answer failed', error);
    return null;
  }
}

export async function getSemanticEvents(
  signal?: AbortSignal,
  limit: number = 10
): Promise<SemanticEventsResponse | null> {
  if (!isSemanticEnabled()) return null;
  const baseUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
  if (!baseUrl) return null;

  const url = `${baseUrl}/v1/semantic/events?limit=${limit}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const token = process.env.NEXT_PUBLIC_JWT_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as any;
    if (!Array.isArray(data.events)) {
      return { events: [] };
    }
    const events: SemanticEvent[] = data.events.map((evt: any) => ({
      event_id: evt.event_id || evt.id || '',
      entity_id: evt.entity_id || '',
      signal_type: evt.signal_type || 'hint',
      severity: typeof evt.severity === 'number' ? evt.severity : 0.5,
      message: evt.message || '',
      related_objects: Array.isArray(evt.related_objects) ? evt.related_objects : [],
      timestamp: evt.timestamp || new Date().toISOString(),
    }));
    return { events };
  } catch (error) {
    console.error('Semantic events failed', error);
    return null;
  }
}
