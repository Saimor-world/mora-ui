'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Archive,
  Box,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  Flag,
  Layers,
  Search,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { AppLoader } from '@/lib/apps/AppLoader';
import {
  buildTunnelCatalog,
  getTunnelFeatureFlags,
  TUNNEL_CATEGORY_LABELS,
  TUNNEL_PRODUCT_ISSUES,
  type TunnelCategory,
  type TunnelEntry,
} from '@/lib/tunnel/tunnelCatalog';
import { TunnelComponentPreview } from '@/components/tunnel/TunnelComponentPreview';
import type { TunnelComponentKey } from '@/lib/tunnel/tunnelCatalog';
import { usePaneStore } from '@/lib/store/paneStore';
import { getAppManifest } from '@/lib/apps/appRegistry';

const STATUS_STYLES: Record<TunnelEntry['status'], string> = {
  live: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25',
  gated: 'bg-amber-500/15 text-amber-200 border-amber-400/25',
  orphan: 'bg-violet-500/15 text-violet-200 border-violet-400/25',
  archive: 'bg-slate-500/15 text-slate-200 border-slate-400/25',
  'broken-wire': 'bg-red-500/15 text-red-200 border-red-400/25',
};

function TunnelCard({ entry }: { entry: TunnelEntry }) {
  const [open, setOpen] = useState(false);
  const [loadPreview, setLoadPreview] = useState(false);
  const openPane = usePaneStore((s) => s.openPane);

  const manifest = entry.appId ? getAppManifest(entry.appId) : undefined;

  const tryOpenInOs = () => {
    if (!entry.appId || !manifest) return;
    openPane({
      id: `tunnel-${entry.appId}`,
      type: entry.appId as never,
      title: `[Tunnel] ${manifest.name}`,
      size: manifest.defaultSize,
    });
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            if (v) setLoadPreview(false);
            return !v;
          });
        }}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-white/[0.04] transition-colors"
      >
        <span className="mt-0.5 text-white/40">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-white/90">{entry.title}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_STYLES[entry.status]}`}>
              {entry.status}
            </span>
            {entry.keepVisual && (
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200/80">
                visuell behalten
              </span>
            )}
            {entry.tier && (
              <span className="text-[10px] text-white/35 uppercase tracking-wider">{entry.tier}</span>
            )}
          </div>
          <p className="mt-1 text-xs text-white/50 leading-relaxed">{entry.whyHidden}</p>
          <p className="mt-1 font-mono text-[10px] text-white/30 truncate">{entry.location}</p>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/8 px-4 pb-4 space-y-3">
          {entry.problem && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-100/90">
              <div className="font-medium text-red-200/90 mb-1">Problem</div>
              {entry.problem}
            </div>
          )}
          {entry.solution && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-xs text-emerald-100/90">
              <div className="font-medium text-emerald-200/90 mb-1">LÃ¶sung</div>
              {entry.solution}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(entry.preview === 'app' || entry.preview === 'component') && (
              <button
                type="button"
                onClick={() => setLoadPreview(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100/90 hover:bg-emerald-500/15"
              >
                <Eye size={12} />
                Vorschau laden
              </button>
            )}
            {entry.appId && manifest && (
              <button
                type="button"
                onClick={tryOpenInOs}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
              >
                <ExternalLink size={12} />
                Im HQ Ã¶ffnen
              </button>
            )}
          </div>

          {loadPreview && entry.preview === 'app' && entry.appId && (
            <div className="rounded-xl border border-white/10 overflow-hidden" style={{ height: 420 }}>
              <AppLoader appId={entry.appId} paneId={`tunnel-preview-${entry.appId}`} initialData={{ tunnel: true }} />
            </div>
          )}

          {loadPreview && entry.preview === 'component' && entry.componentKey && (
            <TunnelComponentPreview componentKey={entry.componentKey as TunnelComponentKey} height={320} />
          )}
        </div>
      )}
    </article>
  );
}

const TABS: { id: TunnelCategory | 'product' | 'all'; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Alles', icon: Layers },
  { id: 'gated-shell', label: 'Gated Shell', icon: Eye },
  { id: 'visual', label: 'Visuell', icon: Sparkles },
  { id: 'organic', label: 'Organic', icon: Box },
  { id: 'apps', label: 'Apps/Panes', icon: Archive },
  { id: 'product', label: 'Produkt', icon: Flag },
];

export function TunnelPageClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const catalog = useMemo(() => buildTunnelCatalog(), []);
  const flags = useMemo(() => getTunnelFeatureFlags(), []);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all');
  const [query, setQuery] = useState('');
  const [onlyVisual, setOnlyVisual] = useState(false);
  const [onlyBroken, setOnlyBroken] = useState(false);

  const stats = useMemo(() => {
    const broken = catalog.filter((e) => e.status === 'broken-wire').length;
    const gated = catalog.filter((e) => e.status === 'gated').length;
    const visual = catalog.filter((e) => e.keepVisual).length;
    return { total: catalog.length, broken, gated, visual };
  }, [catalog]);

  const filtered = useMemo(() => {
    if (tab === 'product') return [];
    const q = query.trim().toLowerCase();
    return catalog.filter((e) => {
      if (tab !== 'all' && e.category !== tab) return false;
      if (onlyVisual && !e.keepVisual) return false;
      if (onlyBroken && e.status !== 'broken-wire') return false;
      if (!q) return true;
      const hay = [e.title, e.id, e.whyHidden, e.location, e.problem, e.solution, ...(e.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [catalog, tab, query, onlyVisual, onlyBroken]);

  const productFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TUNNEL_PRODUCT_ISSUES;
    return TUNNEL_PRODUCT_ISSUES.filter((e) =>
      [e.title, e.problem, e.solution, e.whyHidden].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="min-h-full bg-[#030806] text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 pb-32">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-400/60">Dev only</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">SAIMÃ”R Tunnel</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/55 leading-relaxed">
                Museum & Inventar: alles was im Code existiert, aber im HQ versteckt, gated oder
                schlecht verdrahtet ist. Nichts wird gelÃ¶scht â€” du entscheidest was bleibt.
                Vorschauen erst nach Klick auf â€žVorschau ladenâ€œ (verhindert AbstÃ¼rze).
              </p>
              <p className="mt-2 max-w-2xl text-xs text-cyan-200/50 leading-relaxed">
                Larry UI ist ein eigenes, reales Produkt auf dem Server (Port 3000) â€” getrennt von
                SAIMOR HQ. Wird hier nicht angerÃ¼hrt.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/home"
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
              >
                HQ /home
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
              >
                Login
              </Link>
              <span className="self-center rounded-lg bg-emerald-500/10 border border-emerald-400/20 px-3 py-1.5 text-[10px] font-mono text-emerald-200/80">
                CORE â†’ localhost:8081
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'EintrÃ¤ge', value: stats.total },
              { label: 'Broken wire', value: stats.broken, warn: true },
              { label: 'Gated', value: stats.gated },
              { label: 'Visuell markiert', value: stats.visual },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-xl border p-3 ${s.warn ? 'border-red-400/25 bg-red-500/5' : 'border-white/10 bg-white/[0.03]'}`}
              >
                <div className="text-[10px] uppercase tracking-wider text-white/40">{s.label}</div>
                <div className={`text-xl font-semibold ${s.warn ? 'text-red-200' : 'text-white/90'}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {mounted && (
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-mono text-white/40">
            <span>FLAGS perceive={String(flags.perceiveV1)}</span>
            <span>dialogue={String(flags.dialogueV1)}</span>
            <span>live={String(flags.liveV1)}</span>
          </div>
        )}
        </header>

        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchenâ€¦"
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/30"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-white/50 px-2">
            <input type="checkbox" checked={onlyVisual} onChange={(e) => setOnlyVisual(e.target.checked)} />
            Nur â€žvisuell behaltenâ€œ
          </label>
          <label className="flex items-center gap-2 text-xs text-white/50 px-2">
            <input type="checkbox" checked={onlyBroken} onChange={(e) => setOnlyBroken(e.target.checked)} />
            Nur broken-wire
          </label>
        </div>

        <nav className="flex flex-wrap gap-2 mb-6">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                    : 'border-white/10 text-white/50 hover:text-white/80'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </nav>

        {tab === 'product' ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 flex gap-3">
              <AlertTriangle className="shrink-0 text-amber-300" size={20} />
              <div className="text-sm text-amber-100/85 leading-relaxed">
                <strong className="text-amber-100">Punkt 4 â€” Produkt & Flows:</strong> Keine versteckte
                UI, sondern echte LÃ¼cken zwischen WORLD, CORE und INTERFACE. Hier steht das Problem und
                ein konkreter Fix â€” ohne dass du visuelle Arbeit verlierst.
              </div>
            </div>
            {productFiltered.map((entry) => (
              <TunnelCard key={entry.id} entry={entry} />
            ))}
          </section>
        ) : (
          <section className="space-y-3">
            <p className="text-xs text-white/40 mb-2">
              {tab === 'all' ? 'Alle Kategorien' : TUNNEL_CATEGORY_LABELS[tab]} â€” {filtered.length} EintrÃ¤ge
            </p>
            {filtered.length === 0 && (
              <p className="text-sm text-white/40 py-8 text-center">Keine Treffer.</p>
            )}
            {filtered.map((entry) => (
              <TunnelCard key={entry.id} entry={entry} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

