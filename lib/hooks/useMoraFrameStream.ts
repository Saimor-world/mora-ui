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
  send: (message: string, opts?: { context?: Record<string, unknown>; history?: { role: string; content: string }[] }) => Promise<void>;
  reset: () => void;
}

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

    setIsStreaming(true);
    setError(null);

    const token = resolveToken(session as any);
    const hasSession = !!readCookie(SESSION_COOKIE);
    if (!token && !hasSession) {
      setError('Nicht angemeldet.');
      setIsStreaming(false);
      return;
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
        setError(`Stream request failed: ${response.status}`);
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError('ReadableStream not supported');
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          const line = chunk.replace(/^data:\s?/, '').trim();
          if (!line || line === '[DONE]' || line === '[ERROR]') continue;
          try {
            const parsed = JSON.parse(line);
            const frame = parseFrame(parsed);
            if (frame) {
              setFrames((prev) => [...prev, frame]);
            }
            // unknown kind → ignore (forward-compat)
          } catch {
            // malformed JSON line → ignore (legacy text token)
          }
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message ?? 'Stream failed');
    } finally {
      setIsStreaming(false);
    }
  }, [session]);

  return { isStreaming, frames, error, send, reset };
}
