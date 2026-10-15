'use client';
import { useMutation } from '@tanstack/react-query';
import { moraAgentClient, type AgentMessage } from '@/lib/api/moraAgentClient';
import { useMoraConversation } from './conversationStore';

/**
 * Sends a message through the SAME client the legacy chat/Dock use
 * (lib/api/moraAgentClient → POST /v3/chat). The surface context is added to the
 * request so CORE/MÔRA knows where the user is. No tool execution happens here.
 */
export function useMoraSend(surface: { featureId: string; contextLabel: string; detail?: string | null }) {
  const add = useMoraConversation((s) => s.add);
  return useMutation({
    mutationFn: async (message: string) => {
      const history = useMoraConversation.getState().turns
        .filter((t) => t.role !== 'system')
        .slice(-10)
        .map((t): AgentMessage => ({ role: t.role === 'user' ? 'user' : 'assistant', content: t.text }));
      add({ role: 'user', text: message, context: surface.contextLabel });
      const result = await moraAgentClient.chat({
        message,
        history,
        context: {
          route_path: `/os#${surface.featureId}${surface.detail ? `:${surface.detail}` : ''}`,
          pane_id: `os-${surface.featureId}`,
        },
      });
      if (!result?.response) throw new Error('MÔRA hat keine Antwort geliefert');
      return result;
    },
    onSuccess: (result) => {
      add({ role: 'mora', text: String(result.response) });
    },
    onError: () => {
      add({ role: 'system', text: 'MÔRA ist gerade nicht erreichbar (CORE /v3/chat). Deine Nachricht wurde nicht verarbeitet.' });
    },
  });
}
