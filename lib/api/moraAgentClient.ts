import { corePost, coreGet } from './coreClient';

// Types matching Backend Schema
export interface AgentMessage {
    role: 'user' | 'assistant';
    content: string | any;
}

export interface AgentChatRequest {
    message: string;
    session_id?: string;
    history?: AgentMessage[];
    tenant_id?: string;
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

// Client Class
export const m = {
    chat: async (request: AgentChatRequest): Promise<AgentChatResponse> => {
        return corePost<AgentChatResponse>('/v1/mora/agent/chat', request);
    },

    getTaskStatus: async (taskId: string) => {
        return coreGet(`/v1/mora/agent/task/${taskId}`);
    },

    listTools: async () => {
        return coreGet('/v1/mora/agent/tools');
    }
};

export const moraAgentClient = m;
