/**
 * Autonomous Cognition Client - Frontend Integration for Mora's Proactive Intelligence
 * 
 * This client connects to the new /v3/autonomous/* endpoints and exposes
 * Mora's proactive intelligence capabilities to the frontend.
 */

import { coreGet, corePost } from './coreClient';
import { useNavStore } from '@/lib/store/navStore';

export interface ProactiveSuggestion {
    type: 'action' | 'optimization' | 'insight';
    target?: string;
    message: string;
    suggested_action?: {
        action: string;
        tool_name?: string;
        params?: Record<string, any>;
    };
}

export interface EnrichmentResult {
    success: boolean;
    node_id?: string;
    metadata?: {
        tags: string[];
        summary: string;
        category: string;
        importance: number;
        suggested_connections: string[];
    };
    error?: string;
}

export interface SynthesisResult {
    success: boolean;
    synthesis?: string;
    source_count?: number;
    error?: string;
}

export interface CognitionStatus {
    active: boolean;
    queue_length: number;
    is_running: boolean;
    capabilities: string[];
    timestamp: string;
}

/**
 * Get proactive suggestions from Mora.
 * These are AI-generated insights based on workspace analysis.
 */
export async function getProactiveSuggestions(): Promise<ProactiveSuggestion[]> {
    try {
        const response = await coreGet('/v3/autonomous/suggestions', { isOptional: true });
        if (response?.suggestions) {
            return response.suggestions;
        }
    } catch (error) {
        console.warn('[Cognition] Failed to get suggestions:', error);
    }
    return [];
}

/**
 * Trigger workspace analysis.
 * Runs pattern detection, suggestion generation, and risk analysis.
 */
export async function triggerWorkspaceAnalysis(deep: boolean = false): Promise<any> {
    try {
        const response = await corePost('/v3/autonomous/analyze', { deep });
        return response;
    } catch (error) {
        console.warn('[Cognition] Analysis failed:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Manually enrich a node with LLM-generated metadata.
 */
export async function enrichContent(
    nodeId: string,
    title: string,
    content: string
): Promise<EnrichmentResult> {
    try {
        const response = await corePost('/v3/autonomous/enrich', {
            node_id: nodeId,
            title,
            content
        });
        return response;
    } catch (error) {
        console.warn('[Cognition] Enrichment failed:', error);
        return { success: false, node_id: nodeId, error: String(error) };
    }
}

/**
 * Synthesize context around a node.
 * Creates a unified understanding by connecting related content.
 */
export async function synthesizeContext(nodeId: string): Promise<SynthesisResult> {
    try {
        const response = await corePost('/v3/autonomous/synthesize', {
            node_id: nodeId
        });
        return response;
    } catch (error) {
        console.warn('[Cognition] Synthesis failed:', error);
        return { success: false, error: String(error) };
    }
}


/**
 * Agentic Loop Types (Backend Mirror)
 */
export interface AgentToolResult {
    iteration: number;
    tool: string;
    params: Record<string, any>;
    success: boolean;
    result: any;
    error?: string;
}

export interface AgentIteration {
    iteration: number;
    state: string; // "S0_IDLE" | "S1_PERCEIVE" | ... | "S7_ABORT"
    llm_thought?: string;
    action_type?: string;
    tool_name?: string;
    tool_params?: Record<string, any>;
    tool_result?: AgentToolResult;
    requires_confirmation?: boolean;
}

export interface AgentPendingConfirmation {
    tool_name: string;
    tool_params: Record<string, any>;
    reason: string;
    risk_level: string; // "write" | "secrets"
    what_will_change: string;
    confirmation_token?: string;
    action_id?: string;
}

export interface AgentResponse {
    success: boolean;
    final_state: string;
    final_message: string;
    iterations: AgentIteration[];
    tools_executed: AgentToolResult[];
    pending_confirmations: AgentPendingConfirmation[];
    mode: string;
    transparency_note: string;
    /** Present when the agent created a work-session plan (Core 6d53ddd) */
    work_session_plan?: { plan_id: string; session_id?: string; title?: string; summary?: string; state?: string; stats?: Record<string, any> };
}

/**
 * Execute Mora Agentic Loop (Multi-Turn Tool Execution)
 * 
 * @param intent User's natural language request
 * @param viewContext Optional context about what user is seeing
 */
export async function executeAgenticLoop(
    intent: string,
    viewContext?: { level: string; entityId?: string; entityType?: string; companyId?: string },
    workSession?: { planId?: string; sessionId?: string }
): Promise<AgentResponse> {
    try {
        const allowToolExecution = process.env.NEXT_PUBLIC_ALLOW_TOOL_EXECUTION !== 'false';
        // Sprint 2: forward active workspace context for Mora awareness
        const navState = useNavStore.getState();
        const response = await corePost('/v3/cognition/agent', {
            intent,
            view_level: viewContext?.level,
            active_entity_id: viewContext?.entityId,
            active_entity_type: viewContext?.entityType,
            company_id: viewContext?.companyId,
            active_company_id: viewContext?.companyId ?? navState.activeCompanyId,
            active_department_id: navState.activeDepartmentId,
            plan_id: workSession?.planId,
            session_id: workSession?.sessionId,
            allow_tool_execution: allowToolExecution,
            max_iterations: 10
        });
        return response;
    } catch (error) {
        console.warn('[Cognition] Agentic loop failed:', error);
        throw error;
    }
}

/**
 * Get autonomous cognition system status.
 */
export async function getCognitionStatus(): Promise<CognitionStatus | null> {
    try {
        const response = await coreGet('/v3/autonomous/status', { isOptional: true });
        return response;
    } catch (error) {
        console.warn('[Cognition] Status check failed:', error);
        return null;
    }
}
