'use client';
import Link from 'next/link';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Command, LayoutGrid, MoreHorizontal } from 'lucide-react';
import { Button, Divider, Loading, MoraStone, NavItem, Panel, Stack, Text } from '@/components/os-kit';
import { OsAtmosphere } from './OsAtmosphere';
import { osCssVariables, osPhaseVariables } from '@/lib/design/osTokens';
import { usePhase } from '@/lib/os-prototype/usePhase';
import { OsOnboarding } from './OsOnboarding';
import { OsSessionBoot } from './OsSessionBoot';
import { readLocalOrg } from '@/lib/os-prototype/onboarding';
import { AmbientPlayer } from './AmbientPlayer';
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
import { OsDock, PHONE_DOCK_IDS } from './OsDock';
import { ShortcutsOverlay } from './ShortcutsOverlay';
import { ControlCenter } from './ControlCenter';
import { useIsSaimorInternal } from '@/lib/hooks/useIsSaimorInternal';

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
  const internal = useIsSaimorInternal();
  const ctx = useMemo(() => ({ role, flags, preview, internal }), [role, flags, preview, internal]);
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
    const onHash = () => { setActiveFeature(resolveFeatureId(readHash(), ctx)); setMoreOpen(false); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [ctx, setActiveFeature]);

  // "Mehr" is a phone sheet; on the computer every place is in the rail.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const computer = window.matchMedia('(min-width: 768px)');
    const onChange = () => { if (computer.matches) setMoreOpen(false); };
    computer.addEventListener?.('change', onChange);
    return () => computer.removeEventListener?.('change', onChange);
  }, []);

  const dockItems = useMemo(() => [...nav.primary, ...nav.secondary].filter((m) => m.id !== 'mora'), [nav]);
  // Phone: what does not fit into the five dock slots is reached through "Mehr".
  const moreItems = useMemo(() => dockItems.filter((m) => !(PHONE_DOCK_IDS as readonly string[]).includes(m.id)), [dockItems]);
  const shortcutsOpen = useOsShellStore((s) => s.shortcutsOpen);
  const setShortcutsOpen = useOsShellStore((s) => s.setShortcutsOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); setMoraOpen(!useOsShellStore.getState().moraOpen); return; }
      // V1.4 Dock-Kürzel: nur ohne Modifier und nicht beim Schreiben.
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); const st0 = useOsShellStore.getState(); st0.setFocusUntil(st0.focusUntil ? null : Date.now() + 25 * 60_000); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const st = useOsShellStore.getState();
      if (st.paletteOpen) return;
      if (e.key === '?') { e.preventDefault(); setShortcutsOpen(!st.shortcutsOpen); return; }
      if (e.key === 'Escape' && st.shortcutsOpen) { setShortcutsOpen(false); return; }
      if (e.key === 'Escape' && st.controlOpen) { st.setControlOpen(false); return; }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); st.setControlOpen(!st.controlOpen); return; }
      if (/^[1-9]$/.test(e.key)) { const m = dockItems[Number(e.key) - 1]; if (m) { e.preventDefault(); navigate(m.id); } return; }
      if (e.key.toLowerCase() === 'm') { e.preventDefault(); setMoraOpen(!st.moraOpen); return; }
      if (e.key.toLowerCase() === 'u' && dockItems.some((m) => m.id === 'universe')) { e.preventDefault(); navigate('universe'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen, setMoraOpen, setShortcutsOpen, dockItems, navigate]);

  const active = getFeature(activeFeatureId) || FEATURE_MANIFESTS[0];
  const ActiveSurface = lazyFor(active);
  const online = health.data?.state === 'online';
  const atmosphere = active.atmosphere ?? 'calm';

  const demoMode = preview && !userName;
  const { phase, mounted } = usePhase();
  const lookStored = useOsShellStore((s) => s.look);
  const look = mounted ? lookStored : 'kosmos';
  const localCompany = mounted ? readLocalOrg().company : '';
  const org = demoMode ? 'Simple Coffee Group' : localCompany || 'Deine Organisation';
  const controlOpen = useOsShellStore((s) => s.controlOpen);

  const askMora = (text: string) => {
    useOsShellStore.getState().setMoraDraft(text);
    setMoraOpen(true);
    if (active.id !== 'mora' && typeof window !== 'undefined' && window.innerWidth < 900) setMoreOpen(false);
  };

  return (
    <div className="os-root relative" style={{ ...osCssVariables(), ...osPhaseVariables(phase, look) } as React.CSSProperties} data-testid="os-shell" data-active-feature={active.id} data-atmosphere={atmosphere} data-look={look} data-phase={phase}>
      <AmbientPlayer phase={phase} />
      {!preview ? <OsSessionBoot /> : null}
      <OsOnboarding live={Boolean(userName)} navigate={navigate} />
      {preview ? (
        <div className="os-preview-banner" role="note" data-testid="os-preview-banner">
          Lokale Vorschau ohne CORE-Sitzung · keine echten Daten · nur auf localhost aktiv
        </div>
      ) : null}
      <div className="os-shell" data-place={active.id} style={preview ? { height: 'calc(100dvh - 30px)' } : undefined}>
        <OsAtmosphere mode={atmosphere} look={look} />

        <main className="os-shell__main" id="os-main">
          <div className="os-shell__topbar">
            <Stack direction="row" gap={3} align="center"><Text variant="title" as="div" className="os-brand">SAIMÔR</Text><Text variant="eyebrow">{active.title}</Text></Stack>
            {/* Lea-Look: keine CORE-Plakette, keine E-Mail/Rolle, keine Uhr, keine Kapsel – der Kopf bleibt ruhig. */}
            <Stack direction="row" gap={1} align="center">
              <Button variant="ghost" size="sm" icon={<Command size={14} />} onClick={() => setPaletteOpen(true)} aria-label="Befehle öffnen">
                <span className="hidden sm:inline">Suchen</span> <span className="os-kbd hidden sm:inline">⌘K</span>
              </Button>
              <NotificationButton open={trayOpen} onToggle={() => setTrayOpen((v) => !v)} />
              <Button variant="ghost" size="sm" className="sb-phone-only" icon={<MoreHorizontal size={16} />} aria-expanded={moreOpen} aria-haspopup="dialog" onClick={() => setMoreOpen((v) => !v)} data-testid="os-more">
                Mehr
              </Button>
              <Button size="sm" className="sb-desktop-only" icon={<MoraStone size={18} />} aria-pressed={moraOpen} onClick={() => setMoraOpen(!moraOpen)} data-testid="mora-toggle">
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

        <OsDock
          items={dockItems}
          activeId={active.id}
          moraOpen={moraOpen}
          onNavigate={(id) => { if (typeof window !== 'undefined' && window.innerWidth < 900) setMoraOpen(false); navigate(id); }}
          onSearch={() => setPaletteOpen(true)}
          onControl={() => useOsShellStore.getState().setControlOpen(!controlOpen)}
          controlOpen={controlOpen}
          onNotifications={() => setTrayOpen((v) => !v)}
          onMora={() => setMoraOpen(!moraOpen)}
        />

        {moreOpen ? (
          <div className="os-dialog-backdrop" style={{ alignItems: 'flex-end', padding: 0 }} onMouseDown={(e) => e.target === e.currentTarget && setMoreOpen(false)}>
            <div className="os-dialog" role="dialog" aria-label="Weitere Bereiche" data-testid="os-more-sheet" style={{ width: '100%', borderRadius: 'var(--sb-radius-focus) var(--sb-radius-focus) 0 0', paddingBottom: 'calc(var(--os-dock-space) + var(--sb-space-2))' }}>
              <Stack gap={1}>
                {moreItems.map((m) => {
                  const Icon = m.icon;
                  return <NavItem key={m.id} icon={<Icon size={17} />} label={m.title} active={m.id === active.id} onClick={() => navigate(m.id)} />;
                })}
                <Link href="/" className="os-nav-item"><LayoutGrid size={16} /> Klassische Oberfläche</Link>
              </Stack>
            </div>
          </div>
        ) : null}
      </div>

      {controlOpen ? <ControlCenter onClose={() => useOsShellStore.getState().setControlOpen(false)} navigate={navigate} online={online} org={org} demo={demoMode} /> : null}
      {shortcutsOpen ? <ShortcutsOverlay items={dockItems} onClose={() => setShortcutsOpen(false)} /> : null}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        features={visible}
        navigate={navigate}
        askMora={askMora}
        searchEnabled={online && !preview}
        demo={preview && !userName}
      />
    </div>
  );
}
