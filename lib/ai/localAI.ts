/**
 * Mora Local AI Client
 * 
 * Interface for connecting to local LLMs (Ollama, LM Studio, etc.)
 * Ready for tomorrow's integration
 */

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIStreamCallback {
    onToken?: (token: string) => void;
    onComplete?: (fullResponse: string) => void;
    onError?: (error: Error) => void;
}

export interface LocalAIConfig {
    provider: 'ollama' | 'lmstudio' | 'openai-compatible';
    baseUrl: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
}

// Default configuration - can be overridden via Settings
const DEFAULT_CONFIG: LocalAIConfig = {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2:latest',
    temperature: 0.7,
    maxTokens: 2048
};

class MoraAIClient {
    private config: LocalAIConfig;
    private isConnected: boolean = false;

    constructor(config: Partial<LocalAIConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Load configuration from localStorage or environment
     */
    loadConfig(): void {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('saimor_ai_config');
            if (saved) {
                try {
                    this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
                } catch (e) {
                    console.error('[MoraAI] Failed to parse config:', e);
                }
            }
        }
    }

    /**
     * Save current configuration
     */
    saveConfig(config: Partial<LocalAIConfig>): void {
        this.config = { ...this.config, ...config };
        if (typeof window !== 'undefined') {
            localStorage.setItem('saimor_ai_config', JSON.stringify(this.config));
        }
    }

    /**
     * Check if local AI is available
     */
    async checkConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/tags`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            this.isConnected = response.ok;
            return this.isConnected;
        } catch (error) {
            console.log('[MoraAI] Local AI not available:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Get available models from local AI
     */
    async getAvailableModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/tags`);
            if (!response.ok) return [];

            const data = await response.json();
            return data.models?.map((m: any) => m.name) || [];
        } catch (error) {
            console.error('[MoraAI] Failed to get models:', error);
            return [];
        }
    }

    /**
     * Send a chat message and get a response
     */
    async chat(
        messages: AIMessage[],
        callbacks?: AIStreamCallback
    ): Promise<string> {
        const endpoint = this.config.provider === 'ollama'
            ? `${this.config.baseUrl}/api/chat`
            : `${this.config.baseUrl}/v1/chat/completions`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.model,
                    messages,
                    stream: !!callbacks?.onToken,
                    options: {
                        temperature: this.config.temperature,
                        num_predict: this.config.maxTokens
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`AI request failed: ${response.status}`);
            }

            // Handle streaming response
            if (callbacks?.onToken && response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullResponse = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const json = JSON.parse(line);
                            const token = json.message?.content || json.response || '';
                            if (token) {
                                fullResponse += token;
                                callbacks.onToken(token);
                            }
                        } catch (e) {
                            // Skip non-JSON lines
                        }
                    }
                }

                callbacks.onComplete?.(fullResponse);
                return fullResponse;
            }

            // Handle non-streaming response
            const data = await response.json();
            const content = data.message?.content || data.choices?.[0]?.message?.content || '';
            callbacks?.onComplete?.(content);
            return content;

        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown AI error');
            callbacks?.onError?.(err);
            throw err;
        }
    }

    /**
     * Simple completion for quick tasks
     */
    async complete(prompt: string): Promise<string> {
        return this.chat([
            { role: 'system', content: 'Du bist Mora, der lokale KI-Kern von SAIMOR. Antworte auf Deutsch, klar, ehrlich und handlungsorientiert. Erfinde keine Daten und nenne fehlende Informationen offen.' },
            { role: 'user', content: prompt }
        ]);
    }

    /**
     * Analyze workspace content
     */
    async analyzeWorkspace(context: {
        departments: string[];
        nodeCount: number;
        recentActivity: string[];
    }): Promise<string> {
        const prompt = `Analysiere diesen Firmenkontext:
- Departments: ${context.departments.join(', ')}
- Nodes: ${context.nodeCount}
- Letzte Aktivität: ${context.recentActivity.slice(0, 5).join(', ')}

Gib eine kurze Zusammenfassung und 2-3 konkrete nächste Schritte.`;

        return this.complete(prompt);
    }

    /**
     * Get configuration
     */
    getConfig(): LocalAIConfig {
        return { ...this.config };
    }

    /**
     * Check if connected
     */
    get connected(): boolean {
        return this.isConnected;
    }
}

// Singleton instance
export const moraAI = new MoraAIClient();

// Export for use in components
export default moraAI;
