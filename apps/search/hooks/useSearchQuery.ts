import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { searchGlobal, searchSemantic } from '@/lib/api/coreClient';
import { useMoraStore } from '@/lib/store/moraState';
import { getSearchResultSubtitle, mapRawSearchResult, type OpenableSearchResult } from '@/lib/utils/searchOpen';
import { FileText, Building2, Folder } from 'lucide-react';

export type SearchResult = OpenableSearchResult & { source?: 'local' | 'mora' };

export function useSearchQuery(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'local' | 'mora' | null>(null);
  const [searchHint, setSearchHint] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRequestRef = useRef(0);

  const { departments, spacesByDepartment, nodesByCompany, activeCompanyId } = useMoraStore((s) => ({
    departments: s.departments,
    spacesByDepartment: s.spacesByDepartment,
    nodesByCompany: s.nodesByCompany,
    activeCompanyId: s.activeCompanyId,
  }));

  const allSpaces = useMemo(() => Object.values(spacesByDepartment).flat(), [spacesByDepartment]);
  const allNodes = useMemo(
    () => (activeCompanyId && nodesByCompany[activeCompanyId]) ? nodesByCompany[activeCompanyId] : [],
    [activeCompanyId, nodesByCompany],
  );

  const buildLocalResults = useCallback((q: string): SearchResult[] => {
    const lq = q.toLowerCase();
    const out: SearchResult[] = [];
    departments.forEach(d => {
      if (d.name.toLowerCase().includes(lq))
        out.push({ id: d.id, type: 'department', title: d.name, subtitle: 'Department', icon: Building2, source: 'local' });
    });
    allSpaces.forEach(s => {
      if (s.name.toLowerCase().includes(lq))
        out.push({ id: s.id, type: 'space', title: s.name, subtitle: 'Space', icon: Folder, source: 'local' });
    });
    allNodes.forEach(n => {
      if (n.title?.toLowerCase().includes(lq) || n.content?.toLowerCase().includes(lq))
        out.push({ id: n.id, type: 'node', title: n.title || 'Untitled', subtitle: n.content?.substring(0, 50) || 'Element', icon: FileText, source: 'local' });
    });
    return out.slice(0, 10);
  }, [departments, allSpaces, allNodes]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchMode(null);
      setSearchHint(null);
      setIsSearching(false);
      return;
    }

    const trimmed = query.trim();
    const localResults = buildLocalResults(trimmed);
    setResults(localResults);
    setSearchMode('local');
    setSearchHint(localResults.length > 0 ? 'Lokal' : null);
    setSelectedIndex(0);

    if (!activeCompanyId || trimmed.length < 2) {
      setIsSearching(false);
      return;
    }

    const reqId = ++searchRequestRef.current;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const [semanticResults, keywordResponse] = await Promise.all([
          searchSemantic(trimmed, activeCompanyId, 10, 0.55),
          searchGlobal(trimmed, activeCompanyId),
        ]);
        if (reqId !== searchRequestRef.current) return;

        const mapped: SearchResult[] = semanticResults.map((r: any) => ({
          id: r.node_id,
          type: 'node' as const,
          title: r.metadata?.title || 'Untitled',
          path: r.scope_path || r.path,
          subtitle: getSearchResultSubtitle({ path: r.scope_path || r.path, type: 'node' }, r.content?.substring(0, 80)),
          icon: FileText,
          source: 'mora' as const,
          score: r.score,
          companyId: r.company_id || activeCompanyId,
          nodeId: r.node_id,
          folderId: r.folder_id || r.metadata?.folder_id,
          departmentId: r.department_id,
          spaceId: r.space_id || r.metadata?.space_id,
        }));

        const kwMapped = ((keywordResponse as any)?.results || [])
          .map((raw: any) => { const m = mapRawSearchResult(raw); return m ? { ...m, source: 'mora' as const } : null; })
          .filter(Boolean) as SearchResult[];

        const deduped = new Map<string, SearchResult>();
        [...kwMapped, ...mapped].forEach(r => { const k = `${r.type}:${r.id}`; if (!deduped.has(k)) deduped.set(k, r); });
        const merged = Array.from(deduped.values());

        if (merged.length > 0) {
          setResults(merged);
          setSearchMode(mapped.length > 0 ? 'mora' : 'local');
          setSearchHint(mapped.length > 0 && kwMapped.length > 0 ? 'Mora + Treffer' : mapped.length > 0 ? 'Mora' : 'Treffer');
        } else {
          setSearchHint(localResults.length > 0 ? 'Lokal' : null);
        }
      } catch {
        if (reqId !== searchRequestRef.current) return;
        setSearchHint(localResults.length > 0 ? 'Lokal · Semantic offline' : 'Semantic offline');
      } finally {
        if (reqId === searchRequestRef.current) setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, activeCompanyId, buildLocalResults]);

  return { query, setQuery, results, isSearching, searchMode, searchHint, selectedIndex, setSelectedIndex };
}
