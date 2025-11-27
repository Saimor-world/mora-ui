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
 * Perform Semantic Search
 * 
 * @param query - The search query string
 * @param limit - Max results (default 10)
 * @param threshold - Minimum similarity score (0-1, default 0.7)
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
        console.error('Semantic Search failed:', error);
        return [];
    }
}
