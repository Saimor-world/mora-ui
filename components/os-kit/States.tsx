import React from 'react';
import { AlertTriangle, CloudOff, Lock, PlugZap, ServerCrash, Sparkle, Inbox, FlaskConical } from 'lucide-react';
import type { CoreFailureKind } from '@/lib/os-prototype/coreFailure';
import { Text } from './Typography';
import { Button } from './Button';
import { cx } from './cx';

export type OsStateKind =
  | 'loading' | 'empty' | 'error' | 'offline' | 'backend_unavailable'
  | 'permission_denied' | 'not_configured' | 'feature_unavailable';

const COPY: Record<Exclude<OsStateKind, 'loading'>, { title: string; copy: string; tone?: 'warning' | 'critical'; icon: React.ReactNode }> = {
  empty: { title: 'Noch nichts hier', copy: 'Sobald es etwas gibt, erscheint es an dieser Stelle.', icon: <Inbox size={18} /> },
  error: { title: 'Das hat nicht geklappt', copy: 'Beim Laden ist ein Fehler aufgetreten.', tone: 'critical', icon: <AlertTriangle size={18} /> },
  offline: { title: 'Keine Verbindung zu CORE', copy: 'CORE ist gerade nicht erreichbar. Angezeigt wird nichts, was nicht belegt ist.', tone: 'warning', icon: <CloudOff size={18} /> },
  backend_unavailable: { title: 'Im CORE noch nicht verfügbar', copy: 'Dieser Datenvertrag ist auf dem laufenden CORE-Build nicht vorhanden.', tone: 'warning', icon: <ServerCrash size={18} /> },
  permission_denied: { title: 'Kein Zugriff', copy: 'Für deine Rolle ist dieser Bereich nicht freigegeben.', tone: 'critical', icon: <Lock size={18} /> },
  not_configured: { title: 'Noch nicht eingerichtet', copy: 'Diese Quelle ist noch nicht verbunden.', icon: <PlugZap size={18} /> },
  feature_unavailable: { title: 'In dieser Version nicht aktiv', copy: 'Die Funktion ist hinter einem Feature-Flag oder noch im Labor.', icon: <FlaskConical size={18} /> },
};

export interface StateViewProps {
  kind: OsStateKind;
  title?: string;
  copy?: string;
  compact?: boolean;
  action?: { label: string; onClick: () => void };
  detail?: string;
}

export function StateView({ kind, title, copy, compact, action, detail }: StateViewProps) {
  if (kind === 'loading') return <Loading label={title} />;
  const base = COPY[kind];
  return (
    <div
      role={kind === 'error' || kind === 'permission_denied' ? 'alert' : 'status'}
      data-state={kind}
      className={cx('os-state', compact && 'os-state--compact', base.tone && `os-state--${base.tone}`)}
    >
      <span className="os-state__icon" aria-hidden>{base.icon}</span>
      <Text variant="body" tone="default" className="font-medium">{title || base.title}</Text>
      <Text variant="meta" tone="muted">{copy || base.copy}</Text>
      {detail ? <Text variant="meta" tone="faint">{detail}</Text> : null}
      {action ? <Button size="sm" className="mt-2" onClick={action.onClick}>{action.label}</Button> : null}
    </div>
  );
}

export function Loading({ label = 'Wird geladen', lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div role="status" aria-live="polite" data-state="loading" className="flex flex-col gap-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="os-skeleton" style={{ height: 14, width: `${92 - i * 18}%` }} />
      ))}
    </div>
  );
}

export function Empty(props: Omit<StateViewProps, 'kind'>) {
  return <StateView kind="empty" {...props} />;
}

export function ErrorState(props: Omit<StateViewProps, 'kind'>) {
  return <StateView kind="error" {...props} />;
}

/** Map a classified CORE failure onto the shared state vocabulary. */
export function stateForFailure(kind: CoreFailureKind): OsStateKind {
  switch (kind) {
    case 'offline': return 'offline';
    case 'unauthenticated': return 'permission_denied';
    case 'denied': return 'permission_denied';
    case 'contract_missing': return 'backend_unavailable';
    default: return 'error';
  }
}

export function FailureState({ kind, compact, subject, onRetry }: { kind: CoreFailureKind; compact?: boolean; subject?: string; onRetry?: () => void }) {
  const state = stateForFailure(kind);
  const copy = kind === 'unauthenticated'
    ? 'Keine bestätigte CORE-Sitzung. Melde dich an, um echte Daten zu sehen.'
    : undefined;
  return (
    <StateView
      kind={state}
      compact={compact}
      title={kind === 'unauthenticated' ? 'Nicht angemeldet' : undefined}
      copy={copy}
      detail={subject}
      action={onRetry && (kind === 'offline' || kind === 'backend_error') ? { label: 'Erneut versuchen', onClick: onRetry } : undefined}
    />
  );
}

export function SampleTag() {
  return <span className="os-sample-tag" title="Lokale Vorschau – keine echten Daten"><Sparkle size={9} className="mr-1 inline" />Beispiel</span>;
}
