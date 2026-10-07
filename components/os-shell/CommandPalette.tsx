'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppWindow, Building2, CornerDownLeft, FileText, Search, Sparkles } from 'lucide-react';
import { DEMO_DEPARTMENTS, demoAllDocuments } from '@/lib/os-prototype/demoPack';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { Stack, Text, cx } from '@/components/os-kit';
import type { FeatureManifest } from '@/features/types';
import { LEGACY_APP_PLACEMENT, legacyAppName, openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { searchGlobal } from '@/lib/api/searchClient';

interface Item {
  id: string;
  group: 'Bereiche' | 'MÔRA' | 'Planeten' | 'Dokumente' | 'Klassische Apps' | 'Inhalte';
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

function norm(v: string) { return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  features: FeatureManifest[];
  navigate: (id: string) => void;
  askMora: (text: string) => void;
  searchEnabled: boolean;
  /** Lokale Vorschau: Planeten und Dokumente aus dem Demo-Paket (Beispiel). */
  demo?: boolean;
}

/**
 * Command palette = the prototype's Spotlight: features (from manifests),
 * every legacy app, "ask MÔRA", and CORE keyword search (same searchClient the
 * legacy Spotlight/Search app use).
 */
export function CommandPalette({ open, onClose, features, navigate, askMora, searchEnabled, demo = false }: CommandPaletteProps) {
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQ(''); setIndex(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);

  const trimmed = q.trim();
  const search = useQuery({
    queryKey: ['os', 'palette-search', trimmed],
    queryFn: () => searchGlobal(trimmed),
    enabled: open && searchEnabled && trimmed.length >= 2,
    staleTime: 30_000,
  });

  const items = useMemo<Item[]>(() => {
    const n = norm(trimmed);
    const match = (...values: Array<string | undefined>) => !n || values.some((v) => v && norm(v).includes(n));
    const out: Item[] = [];
    for (const f of features) {
      if (match(f.title, f.description, ...(f.keywords || []))) {
        const Icon = f.icon;
        out.push({ id: `f-${f.id}`, group: 'Bereiche', label: f.title, hint: f.description, icon: <Icon size={15} />, run: () => navigate(f.id) });
      }
    }
    if (demo) {
      for (const d of DEMO_DEPARTMENTS) {
        if (n ? match(d.name, d.description) : out.length < 12) {
          out.push({ id: `p-${d.id}`, group: 'Planeten', label: d.name, hint: `Beispiel · Planet im Universe · ${d.description}`, icon: <Building2 size={15} />,
            run: () => { useOsShellStore.getState().setUniverseFocus(d.id); navigate('universe'); } });
        }
      }
      if (n) {
        for (const doc of demoAllDocuments()) {
          if (match(doc.name, doc.summary, doc.department, ...doc.tags)) {
            out.push({ id: `d-${doc.name}`, group: 'Dokumente', label: doc.name, hint: `Beispiel · ${doc.department} · ${doc.summary}`, icon: <FileText size={15} />,
              run: () => { useOsShellStore.getState().setKnowledgeQuery(doc.name); navigate('knowledge'); } });
          }
        }
      }
    }
    if (trimmed) {
      out.push({ id: 'ask', group: 'MÔRA', label: `MÔRA fragen: „${trimmed}“`, icon: <Sparkles size={15} />, run: () => askMora(trimmed) });
    }
    for (const e of LEGACY_APP_PLACEMENT) {
      const name = legacyAppName(e.appId);
      if (n && match(name, e.appId, e.note)) {
        out.push({ id: `l-${e.appId}`, group: 'Klassische Apps', label: name, hint: e.note, icon: <AppWindow size={15} />, run: () => openLegacyApp(e.appId) });
      }
    }
    for (const r of (search.data?.results || []).slice(0, 6)) {
      const title = r?.title || r?.name || r?.filename || 'Treffer';
      const nodeId = r?.node_id || r?.id;
      out.push({ id: `s-${nodeId || title}`, group: 'Inhalte', label: String(title), hint: r?.type, icon: <FileText size={15} />, run: () => nodeId && openLegacyApp('document', { nodeId }) });
    }
    return out;
  }, [features, trimmed, search.data, navigate, askMora, demo]);

  useEffect(() => { setIndex(0); }, [trimmed]);
  if (!open) return null;

  const choose = (item?: Item) => { if (!item) return; item.run(); onClose(); };
  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <div className="os-dialog-backdrop" style={{ alignItems: 'flex-start', paddingTop: '12vh' }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Befehle" className="os-dialog" style={{ padding: 0, width: 'min(620px, 100%)' }}>
        <div className="flex items-center gap-3 px-5" style={{ borderBottom: '1px solid var(--os-hairline)' }}>
          <Search size={16} className="os-tone-faint" />
          <input
            ref={inputRef}
            aria-label="Suchen oder Befehl"
            className="os-palette-input h-14 flex-1 bg-transparent os-text-body os-tone-default outline-none"
            placeholder="Ort, Planet, Dokument, App – oder MÔRA fragen…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
              if (e.key === 'Enter') { e.preventDefault(); choose(items[index]); }
            }}
          />
          <span className="os-kbd">esc</span>
        </div>
        <div className="max-h-[56vh] overflow-y-auto p-2" role="listbox" aria-label="Ergebnisse">
          {groups.map((g) => (
            <div key={g} className="py-1">
              <Text variant="eyebrow" className="px-3 py-2">{g}</Text>
              {items.filter((i) => i.group === g).map((item) => {
                const active = items[index]?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setIndex(items.indexOf(item))}
                    onClick={() => choose(item)}
                    className={cx('os-nav-item', 'h-auto py-2')}
                    style={active ? { background: 'var(--os-surface-hover)', color: 'var(--os-text)' } : undefined}
                  >
                    <span aria-hidden>{item.icon}</span>
                    <Stack gap={0} className="min-w-0 flex-1">
                      <span className="truncate">{item.label}</span>
                      {item.hint ? <span className="os-text-meta os-tone-faint truncate">{item.hint}</span> : null}
                    </Stack>
                    {active ? <CornerDownLeft size={13} className="os-tone-faint" /> : null}
                  </button>
                );
              })}
            </div>
          ))}
          {searchEnabled && search.isFetching ? <Text variant="meta" className="px-3 py-2">Suche in CORE…</Text> : null}
          {!searchEnabled && trimmed.length >= 2 ? <Text variant="meta" className="px-3 py-2">Inhaltssuche braucht eine CORE-Verbindung.</Text> : null}
        </div>
      </div>
    </div>
  );
}
