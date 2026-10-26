'use client';
import { useMutation } from '@tanstack/react-query';
import { moraAgentClient, type AgentMessage } from '@/lib/api/moraAgentClient';
import { useMoraConversation } from './conversationStore';
import { useScopeCompanyId } from '@/lib/demo/demoStore';
import { getDataScopeKey, useDataScopeKey } from '@/lib/store/dataScope';

/**
 * Sends a message through the SAME client the legacy chat/Dock use
 * (lib/api/moraAgentClient → POST /v3/chat). The surface context is added to the
 * request so CORE/MÔRA knows where the user is. No tool execution happens here.
 */
export function useMoraSend(surface: { featureId: string; contextLabel: string; detail?: string | null }) {
  const add = useMoraConversation((s) => s.add);
  // Gleiche Firma wie Heute/Termine/Aufgaben – im Demo also die Demo-Firma, nicht HQ.
  const companyId = useScopeCompanyId();
  const scope = useDataScopeKey();
  return useMutation({
    mutationFn: async (message: string) => {
      const requestScope = scope;
      try {
      if (getDataScopeKey() !== requestScope) throw new Error('Arbeitskontext gewechselt');
      const conversation = useMoraConversation.getState();
      const history = (conversation.scope === requestScope ? conversation.turns : [])
        .filter((t) => t.role !== 'system')
        .slice(-10)
        .map((t): AgentMessage => ({ role: t.role === 'user' ? 'user' : 'assistant', content: t.text }));
      add({ role: 'user', text: message, context: surface.contextLabel }, requestScope);
      const result = await moraAgentClient.chat({
        message,
        history,
        context: {
          route_path: `/os#${surface.featureId}${surface.detail ? `:${surface.detail}` : ''}`,
          pane_id: `os-${surface.featureId}`,
          ...(companyId ? { company_id: companyId } : {}),
        },
      });
      if (!result?.response) throw new Error('MÔRA hat keine Antwort geliefert');
      return { result, requestScope };
      } catch {
        throw Object.assign(new Error('Antwort nicht bestätigt'), { requestScope });
      }
    },
    onSuccess: ({ result, requestScope }) => {
      if (requestScope === getDataScopeKey()) add({ role: 'mora', text: String(result.response) }, requestScope);
    },
    onError: (error: Error & { requestScope?: string }) => {
      if (error.requestScope === getDataScopeKey()) add({ role: 'system', text: 'MÔRAs Antwort konnte nicht bestätigt werden. Bitte prüfe die Verbindung und versuche es erneut.' }, error.requestScope);
    },
  });
}
