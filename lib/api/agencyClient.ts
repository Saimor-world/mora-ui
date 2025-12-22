import { corePost } from "./coreClient";

export interface AgentAction {
    thought: string;
    action: 'navigate' | 'explain' | 'search' | 'open';
    target?: string;
    reason?: string;
    message?: string;
    meta?: any;
}

export async function askMora(intent: string, context: any): Promise<AgentAction> {
    return corePost('/v1/agency/think', { intent, context });
}
