'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { AppProps } from './types';

// AppSkeleton: minimal pulse placeholder while JS chunk loads
function AppSkeleton() {
  return <div className="w-full h-full animate-pulse bg-white/5 rounded-lg" />;
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
  canvas:          dynamic(() => import('@/apps/canvas'),        { ssr: false, loading: () => <AppSkeleton /> }),
  apps:            dynamic(() => import('@/apps/apps'),          { ssr: false, loading: () => <AppSkeleton /> }),
};

// ─── AppLoader ───────────────────────────────────────────────────────────────

interface AppLoaderProps extends AppProps {
  appId: string;
}

export function AppLoader({ appId, paneId, initialData, onClose, onNavigate }: AppLoaderProps) {
  const App = APP_MAP[appId];
  if (!App) {
    return (
      <div className="p-4 text-sm text-red-400 font-mono">
        {`App "${appId}" not found`}
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
