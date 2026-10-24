'use client';
import { useDemoStore } from '@/lib/demo/demoStore';
import Link from 'next/link';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Command, LayoutGrid, MoreHorizontal } from 'lucide-react';
import { Button, Divider, Loading, MoraStone, NavItem, Panel, Stack, Status, Text } from '@/components/os-kit';
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
import { OsDock } from './OsDock';
import { useIsSaimorInternal, useActiveCompanyIsDemo, useDemoCompanies } from '@/lib/hooks/useIsSaimorInternal';
import { ShortcutsOverlay } from './ShortcutsOverlay';
import { ContextCapsule, DemoBanner, DemoSwitch, StatusMenu } from './ContextCapsule';
import { ControlCenter } from './ControlCenter';

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
/** Rollen ohne Geschlecht (Marius, 24.10.2026). */
const ROLE_WORD: Record<string, string> = { owner: 'Volle Rechte', admin: 'Admin', manager: 'Leitung', member: 'Team', viewer: 'Nur lesen' };

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
  const closeTray = useCallback(() => setTrayOpen(false), []);
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

  const dockItems = useMemo(() => [...nav.primary, ...nav.secondary].filter((m) => m.id !== 'mora'), [nav]);
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

  const activeDemo = useActiveCompanyIsDemo();
  const demoMode = preview && !userName;
  const { phase, mounted } = usePhase();
  const lookStored = useOsShellStore((s) => s.look);
  const look = mounted ? lookStored : 'kosmos';
  const localCompany = mounted ? readLocalOrg().company : '';
  const sessionOrg = useSessionStore((s) => (s.user as { active_company_name?: string | null } | null)?.active_company_name ?? '');
  const internalUser = useIsSaimorInternal();
  const demoCompanyId = useDemoStore((s) => s.demoCompanyId);
  const demoCompanies = useDemoCompanies(Boolean(demoCompanyId));
  const demoName = demoCompanyId ? demoCompanies.find((c) => c.id === demoCompanyId)?.name : undefined;
  const org = demoMode ? 'Vorschau' : demoName || sessionOrg || localCompany || 'Dein Studio';
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
            <Stack direction="row" gap={3} align="center"><Text variant="title" as="div" className="os-brand">SAIMÔR</Text><ContextCapsule activeId={active.id} navigate={navigate} /></Stack>
            <Stack direction="row" gap={1} align="center">
              <DemoSwitch />
              <Button variant="ghost" size="sm" icon={<Command size={14} />} onClick={() => setPaletteOpen(true)} aria-label="Befehle öffnen">
                <span className="hidden sm:inline">Suchen</span> <span className="os-kbd hidden sm:inline">⌘K</span>
              </Button>
              <NotificationButton open={trayOpen} onToggle={() => setTrayOpen((v) => !v)} />
              <StatusMenu org={org} userName={userName} role={role ? ROLE_WORD[role] ?? null : null} internal={internalUser} coreOk={health.isLoading || online}
                core={internal || preview || (!health.isLoading && !online) ? (health.isLoading ? 'CORE wird geprüft' : online ? 'CORE erreichbar' : internal || preview ? 'CORE nicht erreichbar' : 'Keine Verbindung') : null} />
              <Button size="sm" className="os-shell__mora-toggle" icon={<MoraStone size={18} />} aria-pressed={moraOpen} onClick={() => setMoraOpen(!moraOpen)} data-testid="mora-toggle">
                MÔRA
              </Button>
            </Stack>
          </div>
          <DemoBanner />
          {trayOpen ? <NotificationTray onClose={closeTray} /> : null}
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
          showLegacy={internal || preview}
          items={dockItems}
          mobileItems={nav.mobileBar.filter((m) => m.id !== 'mora')}
          activeId={active.id}
          moraOpen={moraOpen}
          moreActive={moreOpen || nav.mobileMore.some((m) => m.id === active.id)}
          onNavigate={(id) => { if (typeof window !== 'undefined' && window.innerWidth < 900) setMoraOpen(false); navigate(id); }}
          onSearch={() => setPaletteOpen(true)}
          onControl={() => useOsShellStore.getState().setControlOpen(!controlOpen)}
          controlOpen={controlOpen}
          onNotifications={() => setTrayOpen((v) => !v)}
          onMora={() => setMoraOpen(!moraOpen)}
          onMore={() => setMoreOpen((v) => !v)}
        />

        {moreOpen ? (
          <div className="os-dialog-backdrop" style={{ alignItems: 'flex-end', padding: 0 }} onMouseDown={(e) => e.target === e.currentTarget && setMoreOpen(false)}>
            <div className="os-dialog" role="dialog" aria-label="Weitere Bereiche" style={{ width: '100%', borderRadius: 'var(--os-radius-xl) var(--os-radius-xl) 0 0', paddingBottom: 'calc(var(--os-bottom-bar) + var(--os-space-4))' }}>
              <Stack gap={1}>
                {[...nav.mobileMore, ...nav.mobileBar.filter((m) => m.id === 'mora')].map((m) => {
                  const Icon = m.icon;
                  return <NavItem key={m.id} icon={<Icon size={17} />} label={m.title} active={m.id === active.id} onClick={() => navigate(m.id)} />;
                })}
                {internal || preview ? <Link href="/" className="os-nav-item"><LayoutGrid size={16} /> Klassische Oberfläche</Link> : null}
              </Stack>
            </div>
          </div>
        ) : null}
      </div>

      {controlOpen ? <ControlCenter onClose={() => useOsShellStore.getState().setControlOpen(false)} navigate={navigate} online={online} org={org} demo={demoMode || activeDemo} /> : null}
      {shortcutsOpen ? <ShortcutsOverlay items={dockItems} onClose={() => setShortcutsOpen(false)} /> : null}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        features={visible}
        navigate={navigate}
        askMora={askMora}
        searchEnabled={online && !preview}
        demo={preview && !userName}
        showLegacy={internal || preview}
      />
    </div>
  );
}
