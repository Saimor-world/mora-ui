/**
 * Abstracted chat datasource hook
 * Allows switching between 'objects' and 'semantic' sources without changing UI code
 */

import { useQuery } from '@tanstack/react-query';
import { getChatSource } from '../config';
import { api } from '../api';

export interface ChatDataResult {
  /**
   * Search through data based on query
   */
  search: (query: string) => Promise<SearchResult[]>;

  /**
   * Get count/statistics
   */
  getStats: () => Promise<ChatStats>;

  /**
   * List all items (paginated)
   */
  list: (limit?: number) => Promise<ListResult[]>;

  /**
   * Get data source name
   */
  source: 'objects' | 'semantic';
}

export interface SearchResult {
  id: string;
  title: string;
  type: string;
  tags?: string[];
  relevance?: number;
  snippet?: string;
}

export interface ChatStats {
  total: number;
  byType: Record<string, number>;
}

export interface ListResult {
  id: string;
  title: string;
  type: string;
}

/**
 * Hook to get chat data from configured source
 * Source is controlled by NEXT_PUBLIC_CHAT_SOURCE env var
 */
export function useChatData(): ChatDataResult {
  const source = getChatSource();

  // Fetch objects data (used by both sources)
  const { data: objectsData } = useQuery({
    queryKey: ['chat-objects'],
    queryFn: async () => {
      const result = await api.getObjects();
      return result.objects || [];
    },
    staleTime: 30000, // 30 seconds
  });

  const objects = objectsData || [];

  /**
   * Search implementation
   */
  const search = async (query: string): Promise<SearchResult[]> => {
    if (source === 'semantic') {
      // Semantic search via Core API
      try {
        const result = await api.semanticSearch(query, 10);
        return (result.results || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          tags: item.tags,
          relevance: item.score,
          snippet: item.snippet,
        }));
      } catch (error) {
        console.warn('Semantic search failed, falling back to objects:', error);
        // Fallback to objects search
        return searchObjects(query);
      }
    } else {
      // Simple object search (current implementation)
      return searchObjects(query);
    }
  };

  /**
   * Simple keyword search through objects
   */
  const searchObjects = (query: string): SearchResult[] => {
    const lowerQuery = query.toLowerCase();
    const searchTerms = lowerQuery
      .replace(/such|find|zeig|mir|alle|nach|für/g, '')
      .trim()
      .split(' ')
      .filter((t) => t.length > 2);

    if (searchTerms.length === 0) {
      return objects.slice(0, 5).map(objToSearchResult);
    }

    const matches = objects.filter((obj) => {
      const searchText = `${obj.title} ${obj.tags?.join(' ')} ${obj.type} ${obj.path || ''} ${obj.spaceId}`.toLowerCase();
      return searchTerms.some((term) => searchText.includes(term));
    });

    return matches.slice(0, 10).map(objToSearchResult);
  };

  /**
   * Get statistics
   */
  const getStats = async (): Promise<ChatStats> => {
    const typeCounts = objects.reduce((acc, obj) => {
      acc[obj.type] = (acc[obj.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: objects.length,
      byType: typeCounts,
    };
  };

  /**
   * List items
   */
  const list = async (limit: number = 10): Promise<ListResult[]> => {
    return objects.slice(0, limit).map((obj) => ({
      id: obj.id,
      title: obj.title,
      type: obj.type,
    }));
  };

  return {
    search,
    getStats,
    list,
    source,
  };
}

/**
 * Helper to convert object to search result
 */
function objToSearchResult(obj: any): SearchResult {
  return {
    id: obj.id,
    title: obj.title,
    type: obj.type,
    tags: obj.tags,
  };
}
