import { corePost, coreGet } from './coreClient';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import type { PerceptionBundle } from '@/lib/types/perception';

// Types matching Backend Schema
export interface AgentMessage {
    role: 'user' | 'assistant';
    content: string | any;
}

export interface ChatContext {
    company_id?: string;
    department_id?: string;
    space_id?: string;
    folder_id?: string;
    node_id?: string;
    user_id?: string;
    session_id?: string;
    view_level?: string;
    layer?: string;
    route_path?: string;
    pane_id?: string;
    /** Client-only workspace awareness. CORE treats this as non-authoritative UI context. */
    workspace?: WorkspaceContext;
    /** Real Mora P1: structured perception bundle, included when feature flag is on. */
    perception?: PerceptionBundle;
}

export interface WorkspacePaneContext {
    id: string;
    type: string;
    title: string;
}

export interface WorkspaceContext {
    focused_pane?: WorkspacePaneContext;
    visible_panes: WorkspacePaneContext[];
}

export interface AgentChatRequest {
    message: string;
    session_id?: string;
    history?: AgentMessage[];
    context?: ChatContext;
    tenant_id?: string; // Deprecated: tenant comes from JWT on backend
    max_iterations?: number;
}

export interface ToolUse {
    tool: string;
    input: any;
    result: any;
}

export interface AgentChatResponse {
    response: string;
    session_id: string;
    tool_uses: ToolUse[];
    iterations: number;
    metadata: any;
}

// Backend Chat API Response (matches chat.py ChatResponse)
export interface ChatApiResponse {
    reply: string;
    context_used: any;
    provider: string;
    metadata: any;
    timestamp: string;
}

function mapLayerFromViewLevel(viewLevel?: string): string | undefined {
    if (!viewLevel) return undefined;
    if (viewLevel === 'department') return 'L2';
    if (viewLevel === 'space') return 'L3';
    if (viewLevel === 'folder') return 'L4';
    return 'L1';
}

function mergeChatContext(...parts: Array<ChatContext | undefined>): ChatContext | undefined {
    const merged: ChatContext = {};
    for (const part of parts) {
        if (!part) continue;
        for (const [key, value] of Object.entries(part)) {
            if (value) merged[key as keyof ChatContext] = value;
        }
    }
    return Object.keys(merged).length ? merged : undefined;
}

export function buildChatContext(overrides?: ChatContext): ChatContext | undefined {
    const navState = useNavStore.getState();
    const paneState = usePaneStore.getState();
    const workspacePanes = paneState.panes
        .filter((pane) => !pane.minimized && pane.type !== 'chat' && pane.type !== 'mora-hub')
        .sort((a, b) => b.zIndex - a.zIndex);
    const focusedWorkspacePane = workspacePanes[0];
    const toWorkspacePane = (pane: typeof focusedWorkspacePane): WorkspacePaneContext | undefined => pane
        ? { id: pane.id, type: pane.type, title: pane.title }
        : undefined;
    const routePath = typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search ?? ''}`
        : undefined;
    const viewLevel = navState.viewLevel || undefined;
    return mergeChatContext(
        {
            company_id: navState.activeCompanyId || undefined,
            department_id: navState.activeDepartmentId || undefined,
            space_id: navState.activeSpaceId || undefined,
            folder_id: navState.activeFolderId || undefined,
            node_id: (() => {
                const pane = focusedWorkspacePane;
                return pane?.type === 'document' ? pane.data?.nodeId : undefined;
            })(),
            view_level: viewLevel,
            layer: mapLayerFromViewLevel(viewLevel),
            route_path: routePath,
            workspace: {
                focused_pane: toWorkspacePane(focusedWorkspacePane),
                visible_panes: workspacePanes.slice(0, 12).map((pane) => toWorkspacePane(pane)!),
            },
        },
        overrides
    );
}

// Client Class - Uses actual backend /v3/chat endpoint
export const m = {
    chat: async (request: AgentChatRequest): Promise<AgentChatResponse> => {
        // Transform to match backend ChatRequest schema
        const context = mergeChatContext(
            buildChatContext(),
            request.context,
            request.session_id ? { session_id: request.session_id } : undefined
        );

        const backendRequest = {
            message: request.message,
            context,
            history: request.history || [], // IMPORTANT: Include conversation history for memory
            include_synthesis: true,
            provider_preference: 'auto',
            temperature: 0.7
        };

        const response = await corePost('/v3/chat', backendRequest) as ChatApiResponse;

        // Transform response to match AgentChatResponse schema
        return {
            response: response.reply,
            session_id: request.session_id || 'default',
            tool_uses: [], // Backend chat.py doesn't expose tool_uses yet
            iterations: 1,
            metadata: response.metadata
        };
    },

    listTools: async () => {
        return coreGet('/v3/mora/tools');
    },

    executeTools: async (payload: Record<string, unknown>) => {
        return corePost('/v3/mora/tools/execute', payload);
    },
};

export const moraAgentClient = m;
