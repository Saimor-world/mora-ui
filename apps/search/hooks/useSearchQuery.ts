import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { searchGlobal, searchSemantic } from '@/lib/api/coreClient';
import { useNavStore } from '@/lib/store/navStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useTree } from '@/lib/queries/useTree';
import { getSearchResultSubtitle, mapRawSearchResult, type OpenableSearchResult } from '@/lib/utils/searchOpen';
import { FileText, Building2, Folder } from 'lucide-react';
import type { CoreTreeNode } from '@/lib/types/core';

export type SearchResult = OpenableSearchResult & { source?: 'local' | 'mora' };

function flattenTree(nodes: CoreTreeNode[], path: string[] = []): SearchResult[] {
  const out: SearchResult[] = [];
  for (const node of nodes) {
    const nodePath = [...path, node.name];
    out.push({
      id: node.id,
      type: node.type as SearchResult['type'],
      title: node.name,
      subtitle: nodePath.join(' › '),
      path: nodePath.join(' › '),
      icon: node.type === 'department' ? Building2 : node.type === 'node' ? FileText : Folder,
      source: 'local',
    });
    if (node.children?.length) out.push(...flattenTree(node.children, nodePath));
  }
  return out;
}

export function useSearchQuery(initialQuery = '', accessibleLibrary?: OpenableSearchResult[], allowedDepartments?: ReadonlySet<string>) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'local' | 'mora' | null>(null);
  const [searchHint, setSearchHint] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRequestRef = useRef(0);
  const [resultCompanyId, setResultCompanyId] = useState<string | null>(null);

  const activeCompanyId = useNavStore((s) => s.activeCompanyId);
  const { data: departments = [] } = useDepartments(activeCompanyId);
  const { data: treeData = [] } = useTree(activeCompanyId);

  // Flattened tree nodes for local search — stable reference when query empty
  const localTreeResults = useMemo(
    () => accessibleLibrary ? accessibleLibrary.map(entry => ({ ...entry, source: 'local' as const, icon: entry.type === 'node' ? FileText : entry.type === 'department' ? Building2 : Folder })) : flattenTree(Array.isArray(treeData) ? treeData : []),
    [treeData, accessibleLibrary],
  );

  const buildLocalResults = useCallback((q: string): SearchResult[] => {
    const lq = q.toLowerCase();
    const out: SearchResult[] = [];
    (Array.isArray(departments) ? departments : []).forEach(d => {
      if ((!allowedDepartments || allowedDepartments.has(d.id)) && d.name.toLowerCase().includes(lq))
        out.push({ id: d.id, type: 'department', title: d.name, subtitle: 'Abteilung', icon: Building2, source: 'local' });
    });
    localTreeResults.forEach(r => {
      if (r.title.toLowerCase().includes(lq) || r.subtitle?.toLowerCase().includes(lq))
        out.push(r);
    });
    const deduped = new Map<string, SearchResult>();
    out.forEach(r => { deduped.set(`${r.type}:${r.id}`, r); });
    return Array.from(deduped.values()).slice(0, 10);
  }, [departments, localTreeResults, allowedDepartments]);

  useEffect(() => {
    // Clearing the query or leaving the company also invalidates in-flight replies.
    const reqId = ++searchRequestRef.current;
    setResultCompanyId(activeCompanyId);
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

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const [semanticResults, keywordResponse] = await Promise.all([
          searchSemantic(trimmed, activeCompanyId, 10, 0.55),
          searchGlobal(trimmed, activeCompanyId),
        ]);
        if (reqId !== searchRequestRef.current) return;

        const mapped: SearchResult[] = semanticResults.filter((r: any) => !r.company_id || r.company_id === activeCompanyId).map((r: any) => ({
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
          .filter((result: SearchResult | null) => result && (!result.companyId || result.companyId === activeCompanyId)) as SearchResult[];

        const deduped = new Map<string, SearchResult>();
        [...kwMapped, ...mapped].forEach(r => { if (allowedDepartments && r.departmentId && !allowedDepartments.has(r.departmentId)) return; const k = `${r.type}:${r.id}`; if (!deduped.has(k)) deduped.set(k, r); });
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

    return () => { clearTimeout(timer); ++searchRequestRef.current; };
  }, [query, activeCompanyId, buildLocalResults, allowedDepartments]);

  const current = resultCompanyId === activeCompanyId;
  return { query, setQuery, results: current ? results : [], isSearching: current && isSearching, searchMode: current ? searchMode : null, searchHint: current ? searchHint : null, selectedIndex, setSelectedIndex };
}
