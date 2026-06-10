"use client";

import { useState, useEffect, useCallback } from 'react';
import { moraAI, type AIMessage } from '@/lib/ai/localAI';
import { useNavStore } from '@/lib/store/navStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useCompanies } from '@/lib/queries/useCompanies';

/**
 * useLocalAI Hook
 * 
 * Provides easy access to local AI functionality
 * with automatic connection management and fallbacks
 */

export interface UseLocalAIReturn {
    isConnected: boolean;
    isLoading: boolean;
    response: string;
    error: string | null;

    // Actions
    sendMessage: (message: string) => Promise<string>;
    analyzeWorkspace: () => Promise<string>;
    streamMessage: (message: string, onToken: (token: string) => void) => Promise<void>;
    checkConnection: () => Promise<boolean>;
}

export function useLocalAI(): UseLocalAIReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState('');
    const [error, setError] = useState<string | null>(null);

    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const { data: departments = [] } = useDepartments(activeCompanyId);
    const { data: companies = [] } = useCompanies();

    const checkConnection = useCallback(async (): Promise<boolean> => {
        try {
            const connected = await moraAI.checkConnection();
            setIsConnected(connected);
            return connected;
        } catch (e) {
            setIsConnected(false);
            return false;
        }
    }, []);

    // Check connection on mount
    useEffect(() => {
        checkConnection();
    }, [checkConnection]);

    const sendMessage = useCallback(async (message: string): Promise<string> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await moraAI.complete(message);
            setResponse(result);
            return result;
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'AI request failed';
            setError(errorMsg);

            // Fallback response when AI is not available
            if (!isConnected) {
                const fallback = `[Lokale KI nicht verfügbar] ${message}`;
                setResponse(fallback);
                return fallback;
            }
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, [isConnected]);

    const streamMessage = useCallback(async (
        message: string,
        onToken: (token: string) => void
    ): Promise<void> => {
        setIsLoading(true);
        setError(null);
        setResponse('');

        try {
            await moraAI.chat(
                [
                    { role: 'system', content: 'Du bist Mora, die KI-Assistentin von SAIMÔR. Antworte präzise und hilfreich auf Deutsch.' },
                    { role: 'user', content: message }
                ],
                {
                    onToken: (token) => {
                        onToken(token);
                        setResponse(prev => prev + token);
                    },
                    onComplete: (full) => setResponse(full),
                    onError: (err) => setError(err.message)
                }
            );
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Streaming failed';
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const analyzeWorkspace = useCallback(async (): Promise<string> => {
        setIsLoading(true);
        setError(null);

        const safeDepartments = Array.isArray(departments) ? departments : [];
        const safeCompanies = Array.isArray(companies) ? companies : [];
        const deptNames = safeDepartments.map(d => d.name);
        const company = safeCompanies.find(c => c.id === activeCompanyId);

        // Create context for analysis
        const context = {
            departments: deptNames,
            nodeCount: 0, // Would need to aggregate from store
            recentActivity: ['Navigation', 'Department created', 'Node added'].slice(0, 3)
        };

        try {
            if (isConnected) {
                const result = await moraAI.analyzeWorkspace(context);
                setResponse(result);
                return result;
            } else {
                // Fallback analysis when AI is offline
                const fallback = `
**Kontextanalyse (Offline)**

📊 **${company?.name || 'Organisation'}**
- ${deptNames.length} Departments aktiv
- ${deptNames.join(', ') || 'Keine Departments'}

💡 **Empfehlungen:**
1. Lokale KI verbinden für tiefere Analyse
2. Mehr Inhalte in die wichtigsten Bereiche legen
3. MORA danach konkrete nächste Schritte ausarbeiten lassen

*Verbinde Ollama unter localhost:11434 für KI-Features.*
                `.trim();

                setResponse(fallback);
                return fallback;
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Analysis failed';
            setError(errorMsg);
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, [isConnected, departments, companies, activeCompanyId]);

    return {
        isConnected,
        isLoading,
        response,
        error,
        sendMessage,
        analyzeWorkspace,
        streamMessage,
        checkConnection
    };
}

export default useLocalAI;
