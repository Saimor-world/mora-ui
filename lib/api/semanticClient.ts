/**
 * Semantic Search API Client
 * Connects to saimor-core Semantic Search endpoints
 */

import { coreGet } from './coreClient';

export interface SearchResult {
    node_id: string;
    score: number;
    content: string;
    metadata: {
        title: string;
        type: string;
        space_id?: string;
        folder_id?: string;
    };
}

export interface SemanticSearchResponse {
    results: SearchResult[];
    query: string;
    total_found: number;
}

/**
 * V12: Mock semantic search results for demo/offline mode
 * Uses simple keyword matching when backend is unavailable
 */
function generateMockResults(query: string, limit: number): SearchResult[] {
    const q = query.toLowerCase();

    // Demo documents that might match
    const mockDocs = [
        { id: 'mock-1', title: 'Q4 Umsatzanalyse 2025', type: 'report', content: 'Quartalsbericht mit Umsatzanalyse und Prognosen für das kommende Jahr.' },
        { id: 'mock-2', title: 'Mitarbeiter Onboarding Guide', type: 'guide', content: 'Leitfaden für neue Mitarbeiter mit allen wichtigen Informationen.' },
        { id: 'mock-3', title: 'Projektplan Website Relaunch', type: 'project', content: 'Detaillierter Projektplan für den Website Relaunch inklusive Zeitplan.' },
        { id: 'mock-4', title: 'Marketing Strategie 2026', type: 'strategy', content: 'Marketingstrategie mit Social Media, Content und Kampagnen.' },
        { id: 'mock-5', title: 'Kundenservice Richtlinien', type: 'policy', content: 'Richtlinien für Kundenservice und Support-Prozesse.' },
        { id: 'mock-6', title: 'Technische Dokumentation API', type: 'docs', content: 'API Dokumentation mit Endpoints, Authentifizierung und Beispielen.' },
        { id: 'mock-7', title: 'Budgetplanung 2026', type: 'finance', content: 'Budgetplanung und Kostenkalkulation für alle Abteilungen.' },
        { id: 'mock-8', title: 'Team Meeting Notes', type: 'notes', content: 'Notizen vom wöchentlichen Team Meeting mit Action Items.' },
    ];

    // Simple keyword matching with fuzzy score
    const results = mockDocs
        .map(doc => {
            const titleMatch = doc.title.toLowerCase().includes(q) ? 0.4 : 0;
            const contentMatch = doc.content.toLowerCase().includes(q) ? 0.3 : 0;
            const typeMatch = doc.type.toLowerCase().includes(q) ? 0.2 : 0;
            const score = titleMatch + contentMatch + typeMatch + Math.random() * 0.1;

            return {
                node_id: doc.id,
                score: Math.min(0.99, score),
                content: doc.content,
                metadata: {
                    title: doc.title,
                    type: doc.type
                }
            };
        })
        .filter(r => r.score > 0.1)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    return results;
}

/**
 * Perform Semantic Search
 *
 * @param query - The search query string
 * @param limit - Max results (default 10)
 * @param threshold - Minimum similarity score (0-1, default 0.7)
 *
 * V12: Falls back to mock results when backend is unavailable
 */
export async function searchSemantic(
    query: string,
    limit = 10,
    threshold = 0.7
): Promise<SearchResult[]> {
    try {
        const params = new URLSearchParams({
            q: query,
            limit: limit.toString(),
            threshold: threshold.toString()
        });

        const data = await coreGet(`/v1/semantic/search?${params.toString()}`);
        return data.results || [];
    } catch (error: any) {
        // V12: Fallback to mock results for demo/offline mode
        console.warn('[SemanticSearch] Backend unavailable, using mock results');
        return generateMockResults(query, limit);
    }
}
