'use client';
/** ISO-Datum (YYYY-MM-DD) → „24.10.2026“; alles andere bleibt unverändert. */
export function formatDeDate(iso?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso ?? '');
}
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppWindow, Building2, CornerDownLeft, FileText, Search, Sparkles } from 'lucide-react';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { Stack, Text, cx } from '@/components/os-kit';
import type { FeatureManifest } from '@/features/types';
import { LEGACY_APP_PLACEMENT, legacyAppName, openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { searchGlobal } from '@/lib/api/searchClient';
import { useWorld } from '@/lib/lea/useWorld';
import { CalendarDays, CheckCircle2, Folder } from 'lucide-react';
import { useScopeCompanyId } from '@/lib/demo/demoStore';
import { useDataScopeKey } from '@/lib/store/dataScope';

interface Item {
  id: string;
  group: 'Bereiche' | 'MÔRA' | 'Planeten' | 'Ordner' | 'Heute' | 'Dokumente' | 'Klassische Apps' | 'Inhalte';
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
  /** Klassische Apps nur für SAIMÔR-intern. */
  showLegacy?: boolean;
}

/**
 * Command palette = the prototype's Spotlight: features (from manifests),
 * every legacy app, "ask MÔRA", and CORE keyword search (same searchClient the
 * legacy Spotlight/Search app use).
 */
export function CommandPalette({ open, onClose, features, navigate, askMora, searchEnabled, demo = false, showLegacy = false }: CommandPaletteProps) {
  const company = useScopeCompanyId();
  const scope = useDataScopeKey();
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQ(''); setIndex(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);

  const trimmed = q.trim();
  const search = useQuery({
    queryKey: ['os', 'palette-search', scope, trimmed],
    queryFn: () => searchGlobal(trimmed, company!),
    enabled: open && searchEnabled && Boolean(company) && trimmed.length >= 2,
    staleTime: 30_000,
  });

  const world = useWorld();
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
    if (!demo) {
      // Leas echte Planeten, Ordner und Einträge (Finder = Universe) und der Tag.
      const focus = (planetId: string) => { useOsShellStore.getState().setUniverseFocus(planetId); navigate('universe'); };
      for (const p of world.finder) {
        if (match(p.name)) out.push({ id: `p-${p.id}`, group: 'Planeten', label: p.name, hint: 'Planet im Universe', icon: <Building2 size={15} />, run: () => focus(p.id) });
        if (!n) continue;
        for (const m of p.moons) {
          if (match(m.name)) out.push({ id: `m-${m.id}`, group: 'Ordner', label: m.name, hint: `Ordner in ${p.name}`, icon: <Folder size={15} />, run: () => focus(p.id) });
          for (const st of m.stars) if (match(st.name, st.hint)) out.push({ id: `st-${st.id}`, group: 'Ordner', label: st.name, hint: `${p.name} › ${m.name}${st.hint ? ` · ${st.hint}` : ''}`, icon: st.kind === 'event' ? <CalendarDays size={15} /> : <FileText size={15} />, run: () => (st.kind === 'event' ? focus(p.id) : openLegacyApp('document', { nodeId: st.id })) });
        }
      }
      for (const t of world.day.open) {
        if (n && match(t.task.title)) out.push({ id: `t-${t.task.id}`, group: 'Heute', label: t.task.title, hint: t.overdue ? 'Aufgabe · überfällig' : `Aufgabe · ${t.meta}`, icon: <CheckCircle2 size={15} />, run: () => world.tasksPlanetId && focus(world.tasksPlanetId) });
      }
      for (const e of world.events) {
        if (n && match(e.title)) out.push({ id: `e-${e.id}`, group: 'Heute', label: e.title, hint: `Termin · ${formatDeDate(e.date)}${e.time ? ` · ${e.time}` : ''}`, icon: <CalendarDays size={15} />, run: () => navigate('post') });
      }
    }
    if (trimmed) {
      out.push({ id: 'ask', group: 'MÔRA', label: `MÔRA fragen: „${trimmed}“`, icon: <Sparkles size={15} />, run: () => askMora(trimmed) });
    }
    for (const e of showLegacy ? LEGACY_APP_PLACEMENT : []) {
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
  }, [features, trimmed, search.data, navigate, askMora, demo, showLegacy, world.finder, world.day.open, world.events, world.tasksPlanetId]);

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
        {!trimmed && demo ? (
          <div className="os-palette-home" data-testid="palette-home">
            <div>
              <Text variant="eyebrow" className="mb-2">Schnellsuche</Text>
              <div className="os-palette-home__chips">
                {['Alle Dateien', 'Budget', 'Onboarding', 'Kampagne'].map((c) => (
                  <button key={c} type="button" onClick={() => (c === 'Alle Dateien' ? (navigate('knowledge'), onClose()) : setQ(c))}>{c}</button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
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
