'use client';
import Link from 'next/link';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Command, LayoutGrid, MoreHorizontal } from 'lucide-react';
import { Button, Divider, Loading, MoraStone, NavItem, Panel, Stack, Status, Text } from '@/components/os-kit';
import { OsAtmosphere } from './OsAtmosphere';
import { osCssVariables } from '@/lib/design/osTokens';
import { FEATURE_MANIFESTS, getFeature, navigationModel, resolveFeatureId, visibleFeatures } from '@/features/registry';
import type { FeatureManifest, FeatureSurfaceProps } from '@/features/types';
import { MoraConsole } from '@/features/mora/ui/MoraConsole';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { enabledFeatureFlags } from '@/lib/os-prototype/flags';
import { useCoreHealth } from '@/lib/os-prototype/useCoreHealth';
import { useSessionStore } from '@/lib/store/sessionStore';
import { CommandPalette } from './CommandPalette';
import { FeatureBoundary } from './FeatureBoundary';
import { NotificationButton, NotificationTray } from './NotificationTray';

const lazyCache = new Map<string, React.LazyExoticComponent<React.ComponentType<FeatureSurfaceProps>>>();
function lazyFor(m: FeatureManifest) {
  let c = lazyCache.get(m.id);
  if (!c) { c = React.lazy(m.load); lazyCache.set(m.id, c); }
  return c;
}

function readHash(): string | null {
  if (typeof window === 'undefined') return null;
  return window.location.hash.replace(/^#/, '').split(':')[0] || null;
}

/**
 * OS prototype shell. Knows only: navigation model (from manifests),
 * MÔRA panel, command palette, notification tray. Features render inside.
 */
export function OsShell({ preview }: { preview: boolean }) {
  const role = useSessionStore((s) => s.user?.role ?? null);
  const userName = useSessionStore((s) => s.user?.name ?? null);
  const flags = useMemo(() => enabledFeatureFlags(), []);
  const ctx = useMemo(() => ({ role, flags, preview }), [role, flags, preview]);
  const nav = useMemo(() => navigationModel(ctx), [ctx]);
  const visible = useMemo(() => visibleFeatures(ctx), [ctx]);

  const activeFeatureId = useOsShellStore((s) => s.activeFeatureId);
  const setActiveFeature = useOsShellStore((s) => s.setActiveFeature);
  const moraOpen = useOsShellStore((s) => s.moraOpen);
  const setMoraOpen = useOsShellStore((s) => s.setMoraOpen);
  const paletteOpen = useOsShellStore((s) => s.paletteOpen);
  const setPaletteOpen = useOsShellStore((s) => s.setPaletteOpen);
  const [trayOpen, setTrayOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const health = useCoreHealth();

  const navigate = useCallback((id: string) => {
    const resolved = resolveFeatureId(id, ctx);
    setActiveFeature(resolved);
    setMoreOpen(false);
    if (typeof window !== 'undefined' && window.location.hash !== `#${resolved}`) {
      window.history.replaceState(null, '', `#${resolved}`);
    }
  }, [ctx, setActiveFeature]);

  useEffect(() => {
    setActiveFeature(resolveFeatureId(readHash(), ctx));
    const onHash = () => setActiveFeature(resolveFeatureId(readHash(), ctx));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [ctx, setActiveFeature]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); setMoraOpen(!useOsShellStore.getState().moraOpen); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen, setMoraOpen]);

  const active = getFeature(activeFeatureId) || FEATURE_MANIFESTS[0];
  const ActiveSurface = lazyFor(active);
  const online = health.data?.state === 'online';
  const atmosphere = active.atmosphere ?? 'calm';

  const askMora = (text: string) => {
    useOsShellStore.getState().setMoraDraft(text);
    setMoraOpen(true);
    if (active.id !== 'mora' && typeof window !== 'undefined' && window.innerWidth < 900) setMoreOpen(false);
  };

  return (
    <div className="os-root relative" style={osCssVariables() as React.CSSProperties} data-testid="os-shell" data-active-feature={active.id} data-atmosphere={atmosphere}>
      {preview ? (
        <div className="os-preview-banner" role="note" data-testid="os-preview-banner">
          Lokale Vorschau ohne CORE-Sitzung · keine echten Daten · nur auf localhost aktiv
        </div>
      ) : null}
      <div className="os-shell" data-place={active.id} style={preview ? { height: 'calc(100dvh - 30px)' } : undefined}>
        <OsAtmosphere mode={atmosphere} />

        <nav className="os-shell__rail" aria-label="Hauptnavigation">
          <div className="px-3 pb-6">
            <Text variant="title" as="div" className="os-brand">SAIMÔR</Text>
            <Text variant="meta" className="mt-1">Klarheit im Wandel.</Text>
          </div>
          {nav.primary.map((m) => {
            const Icon = m.icon;
            return <NavItem key={m.id} icon={m.id === 'mora' ? <MoraStone size={20} /> : <Icon size={17} />} label={m.title} active={m.id === active.id} onClick={() => navigate(m.id)} data-feature={m.id} />;
          })}
          <div className="my-3 px-3"><Divider /></div>
          {nav.secondary.map((m) => {
            const Icon = m.icon;
            return <NavItem key={m.id} icon={<Icon size={16} />} label={m.title} active={m.id === active.id} onClick={() => navigate(m.id)} data-feature={m.id} />;
          })}
          <div className="mt-auto flex flex-col gap-3 px-3">
            <Status tone={online ? 'safe' : 'warning'}>{health.isLoading ? 'CORE wird geprüft' : online ? 'CORE erreichbar' : 'CORE nicht erreichbar'}</Status>
            <Link href="/" className="os-text-meta os-tone-faint hover:underline" data-testid="legacy-shell-link">
              <LayoutGrid size={12} className="mr-1 inline" />Klassische Oberfläche (Universe)
            </Link>
            {userName ? <Text variant="meta">{userName}</Text> : null}
          </div>
        </nav>

        <main className="os-shell__main" id="os-main">
          <div className="os-shell__topbar">
            <Text variant="eyebrow">{active.title}</Text>
            <Stack direction="row" gap={1} align="center">
              <Button variant="ghost" size="sm" icon={<Command size={14} />} onClick={() => setPaletteOpen(true)} aria-label="Befehle öffnen">
                <span className="hidden sm:inline">Suchen</span> <span className="os-kbd hidden sm:inline">⌘K</span>
              </Button>
              <NotificationButton open={trayOpen} onToggle={() => setTrayOpen((v) => !v)} />
              <Button size="sm" icon={<MoraStone size={18} />} aria-pressed={moraOpen} onClick={() => setMoraOpen(!moraOpen)} data-testid="mora-toggle">
                MÔRA
              </Button>
            </Stack>
          </div>
          {trayOpen ? <NotificationTray onClose={() => setTrayOpen(false)} /> : null}
          <div className="os-shell__content">
            <FeatureBoundary featureId={active.id}>
              <Suspense fallback={<Loading label={`${active.title} wird geladen`} lines={5} />}>
                <ActiveSurface navigate={navigate} preview={preview} />
              </Suspense>
            </FeatureBoundary>
          </div>
        </main>

        {moraOpen && active.id !== 'mora' ? (
          <Panel label="MÔRA" className="os-shell__mora">
            <MoraConsole variant="panel" navigate={navigate} onClose={() => setMoraOpen(false)} />
          </Panel>
        ) : null}

        <nav className="os-shell__bottom" aria-label="Navigation mobil" style={{ gridTemplateColumns: `repeat(${nav.mobileBar.length + 1}, 1fr)` }}>
          {nav.mobileBar.map((m) => {
            const Icon = m.icon;
            const isMora = m.id === 'mora';
            return (
              <NavItem
                key={m.id}
                compact
                icon={isMora ? <MoraStone size={24} /> : <Icon size={18} />}
                label={m.title}
                active={isMora ? moraOpen : m.id === active.id && !moraOpen}
                onClick={() => (isMora ? setMoraOpen(!moraOpen) : (setMoraOpen(false), navigate(m.id)))}
              />
            );
          })}
          <NavItem compact icon={<MoreHorizontal size={18} />} label="Mehr" active={moreOpen || nav.mobileMore.some((m) => m.id === active.id)} onClick={() => setMoreOpen((v) => !v)} />
        </nav>

        {moreOpen ? (
          <div className="os-dialog-backdrop" style={{ alignItems: 'flex-end', padding: 0 }} onMouseDown={(e) => e.target === e.currentTarget && setMoreOpen(false)}>
            <div className="os-dialog" role="dialog" aria-label="Weitere Bereiche" style={{ width: '100%', borderRadius: 'var(--os-radius-xl) var(--os-radius-xl) 0 0', paddingBottom: 'calc(var(--os-bottom-bar) + var(--os-space-4))' }}>
              <Stack gap={1}>
                {nav.mobileMore.map((m) => {
                  const Icon = m.icon;
                  return <NavItem key={m.id} icon={<Icon size={17} />} label={m.title} active={m.id === active.id} onClick={() => navigate(m.id)} />;
                })}
                <Link href="/" className="os-nav-item"><LayoutGrid size={16} /> Klassische Oberfläche</Link>
              </Stack>
            </div>
          </div>
        ) : null}
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        features={visible}
        navigate={navigate}
        askMora={askMora}
        searchEnabled={online && !preview}
      />
    </div>
  );
}
