/**
 * AI Client - Flexible LLM Provider Integration
 * Supports: Anthropic Claude, Google Gemini, OpenAI, Ollama
 */

export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatContext {
    departmentId?: string;
    spaceId?: string;
    folderId?: string;
    nodeId?: string;
    nodeTitle?: string;
    nodeType?: string;
    // Sprint Tag 2: Folder Nodes
    folderNodes?: Array<{
        id: string;
        title: string;
        type: string;
    }>;
    // Sprint Tag 1-2: Mindloop-Synthesis Integration
    mindloopSynthesis?: {
        risk_level?: string;
        event_count?: number;
        summary?: string;
        recommendations?: string[];
    };
    // Sprint Tag 3: Mindloop Events
    mindloopEvents?: Array<{
        type: string;
        timestamp: string;
        summary?: string;
    }>;
    // Sprint Tag 4: Relations
    relations?: Array<{
        source: string;
        target: string;
        type: string;
        strength: number;
    }>;
}

export interface AIClientConfig {
    provider: 'anthropic' | 'gemini' | 'openai' | 'ollama';
    apiKey?: string;
    model?: string;
    baseUrl?: string;
}

/**
 * Main send message function - routes to appropriate provider
 */
export async function sendMessage(
    message: string,
    context: ChatContext,
    history: AIMessage[] = [],
    customConfig?: Partial<AIClientConfig>
): Promise<string> {
    const provider = customConfig?.provider || process.env.NEXT_PUBLIC_AI_PROVIDER || 'anthropic';

    const userMessage: AIMessage = { role: 'user', content: message };
    const messages = [...history, userMessage];

    try {
        // Use Next.js API route as proxy (prevents CORS issues)
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages,
                context,
                provider
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get AI response');
        }

        const data = await response.json();
        return data.content;
    } catch (error: any) {
        console.error('AI Client Error:', error);
        if (error.message?.includes('API key not valid') || error.message?.includes('400')) {
            throw new Error(`Gemini API Key Invalid. Please check NEXT_PUBLIC_GEMINI_API_KEY in .env`);
        }
        throw new Error(`Failed to get AI response: ${error.message}`);
    }
}
