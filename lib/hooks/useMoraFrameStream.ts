'use client';

/**
 * useMoraFrameStream — typed SSE consumer for /v3/chat/stream when
 * mora.dialogue.v1 is on. Each `data: <json>` line is parsed into a
 * MoraFrame; unknown kinds are silently ignored (forward-compat with
 * legacy text tokens).
 *
 * Sibling to useMoraStream (which keeps the legacy free-text path).
 * The chat picks one based on the feature flag.
 *
 * Per spec §4.1.
 */
import { useCallback, useRef, useState } from 'react';
import { getCoreBaseUrl } from '@/lib/api/coreClient';
import { useRuntimeSession } from '@/lib/auth/runtimeSession';
import { parseFrame, type MoraFrame } from '@/lib/types/moraFrame';

export interface UseMoraFrameStreamReturn {
  isStreaming: boolean;
  frames: MoraFrame[];
  error: string | null;
  send: (message: string, opts?: { context?: Record<string, unknown>; history?: { role: string; content: string }[] }) => Promise<MoraFrameStreamResult>;
  reset: () => void;
}

export type MoraFrameStreamResult = {
  frames: MoraFrame[];
  error: string | null;
  aborted: boolean;
};

const AUTH_COOKIE = 'mora_auth_token';
const SESSION_COOKIE = 'mora_session';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  if (!value) return null;
  const [, raw] = value.split('=');
  try { return decodeURIComponent(raw); } catch { return raw; }
}

function resolveToken(session: any): string {
  return (
    session?.accessToken ?? session?.token ??
    session?.user?.accessToken ?? session?.user?.token ??
    readCookie(AUTH_COOKIE) ?? readCookie('saimor_auth') ?? ''
  );
}

export function useMoraFrameStream(): UseMoraFrameStreamReturn {
  const { data: session } = useRuntimeSession();
  const [isStreaming, setIsStreaming] = useState(false);
  const [frames, setFrames] = useState<MoraFrame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setFrames([]);
    setError(null);
  }, []);

  const send = useCallback(async (
    message: string,
    opts?: { context?: Record<string, unknown>; history?: { role: string; content: string }[] }
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const captured: MoraFrame[] = [];
    const result = (error: string | null = null, aborted = false): MoraFrameStreamResult => ({ frames: [...captured], error, aborted });
    const fail = (message: string): MoraFrameStreamResult => {
      setError(message);
      return result(message);
    };

    setIsStreaming(true);
    setFrames([]);
    setError(null);

    const token = resolveToken(session as any);
    const hasSession = !!readCookie(SESSION_COOKIE);
    if (!token && !hasSession) {
      setIsStreaming(false);
      return fail('Nicht angemeldet.');
    }

    const baseUrl = getCoreBaseUrl();
    const url = `${baseUrl}/v3/chat/stream`;
    const body = JSON.stringify({
      message,
      context: opts?.context ?? null,
      history: opts?.history ?? [],
      include_synthesis: true,
      dialogue_v1: true,  // signals CORE to emit typed frames; ignored by legacy CORE
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        return fail(response.status === 401 || response.status === 403
          ? 'Nicht autorisiert. Bitte neu anmelden.'
          : `Stream request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        return fail('ReadableStream not supported');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (controller.signal.aborted) return result(null, true);
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          const line = chunk.replace(/^data:\s?/, '').trim();
          if (!line || line === '[DONE]') continue;
          if (line === '[ERROR]') return fail('Stream error from server');
          let parsed: unknown;
          try {
            parsed = JSON.parse(line);
          } catch {
            // malformed JSON line → ignore (legacy text token)
            continue;
          }
          if (parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string') return fail(parsed.error);
          const frame = parseFrame(parsed);
          if (frame) {
            captured.push(frame);
            setFrames([...captured]);
          }
          // unknown kind → ignore (forward-compat)
        }
      }
      return captured.length ? result() : fail('MÔRA hat keine Antwort geliefert.');
    } catch (e: any) {
      if (e?.name === 'AbortError') return result(null, true);
      return fail(e?.message ?? 'Stream failed');
    } finally {
      if (abortRef.current === controller) setIsStreaming(false);
    }
  }, [session]);

  return { isStreaming, frames, error, send, reset };
}
