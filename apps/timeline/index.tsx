'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Folder, Clock, RefreshCw, Sparkles } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { fetchNodesByCompany } from '@/lib/api/coreClient';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';

interface TimelineItem {
  id: string;
  title: string;
  type: string;
  created_at?: string;
  folder_id?: string;
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Gerade eben';
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  } catch { return ''; }
}

export default function TimelineApp({ paneId }: AppProps) {
  const activeCompanyId = useMoraStore(s => s.activeCompanyId);
  const { openPane } = usePaneStore();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  const load = async () => {
    if (!activeCompanyId) return;
    setIsLoading(true);
    try {
      const nodes = await fetchNodesByCompany(activeCompanyId, { limit: 30 });
      const sorted = [...nodes].sort((a, b) => {
        const ta = a.created_at ?? a.updated_at ?? '';
        const tb = b.created_at ?? b.updated_at ?? '';
        return tb.localeCompare(ta);
      });
      setItems(sorted.map(n => ({ id: n.id, title: n.title || n.name || 'Unbenannt', type: n.type || 'node', created_at: n.created_at ?? n.updated_at, folder_id: n.folder_id })));
      setLoadedAt(Date.now());
    } catch { /* keep last snapshot */ } finally { setIsLoading(false); }
  };

  useEffect(() => { void load(); }, [activeCompanyId]);

  const handleOpen = (item: TimelineItem) => {
    openPane({ id: `doc-${item.id}`, type: 'document', title: item.title, size: { width: 800, height: 600 }, position: { x: 120, y: 80 }, data: { nodeId: item.id } });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-white/30" />
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Zeitverlauf</span>
        </div>
        <button onClick={() => void load()} disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-all disabled:opacity-30">
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!activeCompanyId ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20">
            <Sparkles size={24} className="text-white/10" />
            <p className="text-xs">Kein Organisationskontext aktiv</p>
          </div>
        ) : isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw size={18} className="animate-spin text-white/20" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20">
            <Clock size={24} className="text-white/10" />
            <p className="text-xs">Noch keine Einträge</p>
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {items.map((item, idx) => {
              const Icon = item.type === 'folder' ? Folder : FileText;
              const timeStr = relativeTime(item.created_at);
              return (
                <button key={item.id} onClick={() => handleOpen(item)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all text-left group">
                  <div className="mt-0.5 w-5 h-5 rounded-md bg-white/[0.05] flex items-center justify-center shrink-0">
                    <Icon size={10} className="text-white/35" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-white/65 group-hover:text-white/80 transition-colors block truncate">{item.title}</span>
                    {timeStr && <span className="text-[10px] text-white/20 mt-0.5 block">{timeStr}</span>}
                  </div>
                  {idx === 0 && <span className="text-[9px] text-emerald-400/50 border border-emerald-500/15 rounded-full px-1.5 py-0.5 shrink-0">neu</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loadedAt && (
        <div className="px-4 py-2 border-t border-white/[0.05] flex items-center gap-2 text-[10px] text-white/15">
          <Clock size={9} />
          <span>Zuletzt aktualisiert: {new Date(loadedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}
    </div>
  );
}
