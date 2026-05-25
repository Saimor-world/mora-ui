'use client';
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, Sparkles } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { useNavStore } from '@/lib/store/navStore';
import { useCompanies } from '@/lib/queries/useCompanies';
import { usePaneStore } from '@/lib/store/paneStore';
import { openSearchResult } from '@/lib/utils/searchOpen';
import { AmbiguityChoiceSurface } from '@/components/ui/AmbiguityChoiceSurface';
import { useSearchQuery } from './hooks/useSearchQuery';

export default function SearchApp({ paneId, initialData }: AppProps) {
  const { removePane, openPane } = usePaneStore();
  const activeCompanyId = useNavStore((s) => s.activeCompanyId);
  const navigateToDepartment = useNavStore((s) => s.navigateToDepartment);
  const navigateToSpace = useNavStore((s) => s.navigateToSpace);
  const { data: companies = [] } = useCompanies();

  const safeCompanies = Array.isArray(companies) ? companies : [];
  const activeCompanyName = safeCompanies.find(c => c.id === activeCompanyId)?.name ?? null;

  const { query, setQuery, results, isSearching, searchMode, searchHint, selectedIndex, setSelectedIndex } =
    useSearchQuery(typeof initialData?.query === 'string' ? initialData.query : '');

  const inputRef = useRef<HTMLInputElement>(null);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
    try {
      const saved = localStorage.getItem('saimor_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved).slice(0, 5));
    } catch {}
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setSelectedIndex(i => Math.min(i < 0 ? 0 : i + 1, results.length - 1)); break;
      case 'ArrowUp':  e.preventDefault(); setSelectedIndex(i => i < 0 ? 0 : Math.max(i - 1, 0)); break;
      case 'Enter':    if (results[selectedIndex]) void handleResultClick(results[selectedIndex]); break;
      case 'Escape':   setQuery(''); break;
    }
  };

  const handleResultClick = async (result: any) => {
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('saimor_recent_searches', JSON.stringify(newRecent));

    switch (result.type) {
      case 'department': navigateToDepartment(result.departmentId || result.id); removePane(paneId); break;
      case 'space':      navigateToSpace(result.spaceId || result.id); removePane(paneId); break;
      default:
        await openSearchResult(result, openPane, { companyId: activeCompanyId || result.companyId });
        removePane(paneId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Input */}
      <div className="p-4 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suche nach Elementen, Bereichen..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          {activeCompanyName ? (
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-200/85">Kontext: {activeCompanyName}</span>
          ) : (
            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-100/85">Organisationskontext fehlt</span>
          )}
        </div>
        {(searchHint || isSearching) && (
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            {searchHint && (
              <span className={`px-2 py-0.5 rounded-full border ${searchMode === 'mora' ? 'border-violet-500/30 bg-violet-500/10 text-violet-300' : 'border-white/10 bg-white/5 text-white/55'}`}>
                {searchHint}
              </span>
            )}
            {isSearching && <span className="text-white/35">Semantische Suche läuft…</span>}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-2">
        {query ? (
          <AnimatePresence mode="wait">
            {isSearching && results.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Sparkles className="text-violet-400" size={24} />
                </motion.div>
              </div>
            ) : results.length > 0 ? (
              <AmbiguityChoiceSurface
                query={query}
                results={results}
                selectedIndex={selectedIndex}
                onPick={(r) => void handleResultClick(r)}
                onReview={() => openPane({ id: paneId, type: 'search', title: 'Suche', size: { width: 960, height: 720 }, data: { query } })}
                tone={results.length > 1 ? 'amber' : 'cyan'}
                body={results.length > 1 ? 'Mehrere plausible Treffer. Wähle einen Eintrag.' : 'Ein klarer Treffer. Du kannst ihn direkt öffnen.'}
              />
            ) : (
              <div className="text-center py-8 text-white/40">
                <Search size={32} className="mx-auto mb-2 opacity-50" />
                <p>Kein klarer Treffer für &quot;{query}&quot;</p>
              </div>
            )}
          </AnimatePresence>
        ) : recentSearches.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40 uppercase tracking-wider"><Clock size={12} />Zuletzt gesucht</div>
            <div className="space-y-1">
              {recentSearches.map((s, i) => (
                <button key={i} onClick={() => setQuery(s)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all">
                  <Clock size={14} className="text-white/30" />
                  <span className="text-sm text-white/70">{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center pb-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-400/15 flex items-center justify-center">
              <Search size={24} className="text-indigo-300/60" />
            </div>
            <div>
              <p className="text-sm text-white/55 font-medium mb-1">Suche überall in Saimor</p>
              <p className="text-[11px] text-white/28 leading-relaxed">
                Dokumente, Ordner, Bereiche und mehr — Mora findet es semantisch.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {(['Bericht', 'Ordner', 'Protokoll', 'Strategie'] as const).map((hint) => (
                <button
                  key={hint}
                  onClick={() => setQuery(hint)}
                  className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/45 hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-indigo-200/80 transition-all"
                >
                  {hint}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Search size={12} className="text-violet-400" />
          <span>{searchMode === 'mora' ? 'Lokal + Mora-Semantik' : 'Lokale Suche'}{activeCompanyName ? ` · ${activeCompanyName}` : ''}</span>
        </div>
      </div>
    </div>
  );
}
