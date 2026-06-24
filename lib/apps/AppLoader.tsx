'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';
import type { AppProps } from './types';
import { ShieldAlert } from 'lucide-react';
import { getAppManifest } from './appRegistry';
import { useSessionStore } from '@/lib/store/sessionStore';

function AppSkeleton() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[24px] border border-emerald-300/[0.08] bg-[radial-gradient(circle_at_20%_16%,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(34,211,238,0.12),transparent_32%),linear-gradient(145deg,rgba(3,20,17,0.92),rgba(1,8,8,0.96))]">
      <div className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-emerald-300/12 blur-3xl" />
      <div className="absolute right-8 top-1/2 h-px w-72 bg-gradient-to-r from-transparent via-cyan-100/24 to-transparent" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.035)_0_1px,transparent_1px_34px)] opacity-20" />

      <div className="relative flex w-full max-w-sm flex-col items-center px-8 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200/16 bg-emerald-500/10 shadow-[0_0_44px_rgba(16,185,129,0.13)]">
          <div className="absolute inset-0 rounded-2xl bg-emerald-300/10 animate-pulse" />
          <Sparkles size={19} className="relative text-emerald-100/80" />
        </div>
        <div className="mt-5 h-3 w-44 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-300/0 via-emerald-200/70 to-cyan-200/0 animate-[mora-loader_1.4s_ease-in-out_infinite]" />
        </div>
        <div className="mt-4 text-[10px] uppercase tracking-[0.24em] text-emerald-100/42">
          App wird aufgebaut
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/42">
          Interface, Datenkontext und Interaktionen werden synchronisiert.
        </p>
      </div>
    </div>
  );
}

// ─── App Map ─────────────────────────────────────────────────────────────────
//
// UPGRADE PATH (Option C — iframe isolation):
// Replace each `dynamic(() => import(...))` entry with IframeAppLoader(appId).
// The AppProps interface remains stable — apps need zero changes.
// The only file to update is this APP_MAP.
//
const APP_MAP: Record<string, React.ComponentType<AppProps>> = {
  finder:          dynamic(() => import('@/apps/finder'),        { ssr: false, loading: () => <AppSkeleton /> }),
  scanner:         dynamic(() => import('@/apps/scanner'),       { ssr: false, loading: () => <AppSkeleton /> }),
  chat:            dynamic(() => import('@/apps/chat'),          { ssr: false, loading: () => <AppSkeleton /> }),
  settings:        dynamic(() => import('@/apps/settings'),      { ssr: false, loading: () => <AppSkeleton /> }),
  team:            dynamic(() => import('@/apps/team'),          { ssr: false, loading: () => <AppSkeleton /> }),
  terminal:        dynamic(() => import('@/apps/terminal'),      { ssr: false, loading: () => <AppSkeleton /> }),
  document:        dynamic(() => import('@/apps/document'),      { ssr: false, loading: () => <AppSkeleton /> }),
  search:          dynamic(() => import('@/apps/search'),        { ssr: false, loading: () => <AppSkeleton /> }),
  calendar:        dynamic(() => import('@/apps/calendar'),      { ssr: false, loading: () => <AppSkeleton /> }),
  notes:           dynamic(() => import('@/apps/notes'),         { ssr: false, loading: () => <AppSkeleton /> }),
  users:           dynamic(() => import('@/apps/users'),         { ssr: false, loading: () => <AppSkeleton /> }),
  'work-session':  dynamic(() => import('@/apps/work-session'),  { ssr: false, loading: () => <AppSkeleton /> }),
  tasks:           dynamic(() => import('@/apps/tasks'),         { ssr: false, loading: () => <AppSkeleton /> }),
  timeline:        dynamic(() => import('@/apps/timeline'),      { ssr: false, loading: () => <AppSkeleton /> }),
  nightwatch:      dynamic(() => import('@/apps/nightwatch'),    { ssr: false, loading: () => <AppSkeleton /> }),
  codex:           dynamic(() => import('@/apps/codex'),         { ssr: false, loading: () => <AppSkeleton /> }),
  canvas:          dynamic(() => import('@/apps/canvas'),        { ssr: false, loading: () => <AppSkeleton /> }),
  grid:            dynamic(() => import('@/apps/grid'),          { ssr: false, loading: () => <AppSkeleton /> }),
  apps:            dynamic(() => import('@/apps/apps'),          { ssr: false, loading: () => <AppSkeleton /> }),
  'meine-dateien': dynamic(() => import('@/apps/meine-dateien'), { ssr: false, loading: () => <AppSkeleton /> }),
  'action-center':    dynamic(() => import('@/apps/action-center'),    { ssr: false, loading: () => <AppSkeleton /> }),
  'integrations':     dynamic(() => import('@/apps/integrations'),     { ssr: false, loading: () => <AppSkeleton /> }),
  'mail':             dynamic(() => import('@/apps/mail'),             { ssr: false, loading: () => <AppSkeleton /> }),
  'feeds':            dynamic(() => import('@/apps/feeds'),            { ssr: false, loading: () => <AppSkeleton /> }),
  'website-dossier':  dynamic(() => import('@/apps/website-dossier'), { ssr: false, loading: () => <AppSkeleton /> }),
};

/** Sorted list of all app ids registered in APP_MAP. Used by tests to guard registry consistency. */
export const APP_IDS: string[] = Object.keys(APP_MAP).sort();

// ─── AppLoader ───────────────────────────────────────────────────────────────

interface AppLoaderProps extends AppProps {
  appId: string;
}

export function AppLoader({ appId, paneId, initialData, onClose, onNavigate }: AppLoaderProps) {
  const App = APP_MAP[appId];
  const role = useSessionStore((state) => state.user?.role);
  const manifest = getAppManifest(appId);
  if (!App) {
    return (
      <div className="p-4 text-sm text-red-400 font-mono">
        {`App "${appId}" not found`}
      </div>
    );
  }
  if (manifest?.requiresRole && (!role || !manifest.requiresRole.includes(role))) {
    return (
      <div className="app-state app-state--denied" role="alert" data-testid={`app-access-denied-${appId}`}>
        <div className="app-state__icon"><ShieldAlert size={24} /></div>
        <p className="app-state__eyebrow">Geschützter Systembereich</p>
        <h3>{manifest.name}</h3>
        <p>Diese App ist für deine aktuelle Rolle nicht freigegeben.</p>
      </div>
    );
  }
  return (
    <App
      paneId={paneId}
      initialData={initialData}
      onClose={onClose}
      onNavigate={onNavigate}
    />
  );
}
