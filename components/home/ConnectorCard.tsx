'use client';

import type { ConnectorStatus } from '@/lib/connectors';

interface ConnectorCardProps {
  connector: ConnectorStatus;
  onSetup: (connector: ConnectorStatus) => void;
  onSync?: (connector: ConnectorStatus) => void;
  isSyncing?: boolean;
}

const STATUS_STYLES: Record<
  ConnectorStatus['state'],
  { color: string; bgColor: string; label: string }
> = {
  connected: { color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', label: 'Verbunden' },
  syncing: { color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', label: 'Synchronisiert...' },
  disconnected: { color: 'text-muted-foreground', bgColor: 'bg-muted/30 border-border', label: 'Nicht verbunden' },
  error: { color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', label: 'Fehler' },
};

export default function ConnectorCard({
  connector,
  onSetup,
  onSync,
  isSyncing = false,
}: ConnectorCardProps) {
  const status = STATUS_STYLES[connector.state];
  const isFirstTime = !connector.lastSyncAt && !connector.objectCount;
  const isConnected = connector.state === 'connected';

  return (
    <div
      className={`p-4 rounded-2xl border-2 shadow-sm mora-transition flex flex-col gap-4 ${status.bgColor} ${
        isConnected ? 'hover:shadow-md' : 'hover:bg-card/80'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl" aria-hidden>
            {getIcon(connector.type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{connector.label}</p>
              {connector.mode === 'mock' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/20 text-primary">
                  Demo
                </span>
              )}
            </div>
            <p className={`text-xs font-medium ${status.color}`}>
              {status.label}
            </p>
          </div>
        </div>
        <button
          onClick={() => onSetup(connector)}
          disabled={isSyncing}
          className={`text-xs px-3 py-1.5 rounded-full mora-transition ${
            isSyncing
              ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed'
              : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          {connector.state === 'connected' ? 'Konfigurieren' : 'Verbinden'}
        </button>
      </div>

      {/* Stats */}
      <div className={`text-xs space-y-1 ${isFirstTime ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
        <div className="flex items-center justify-between">
          <span>Zuletzt synchronisiert:</span>
          <span className={isFirstTime ? 'italic' : 'font-medium'}>
            {connector.lastSyncAt ? formatTime(connector.lastSyncAt) : 'Noch nie'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Objekte:</span>
          <span className={isFirstTime ? 'italic' : 'font-medium'}>
            {typeof connector.objectCount === 'number' ? connector.objectCount : '–'}
          </span>
        </div>
      </div>

      {/* Sync Button */}
      {connector.state === 'connected' && onSync && (
        <button
          onClick={() => !isSyncing && onSync(connector)}
          disabled={isSyncing}
          aria-busy={isSyncing}
          className={`text-xs px-3 py-1.5 rounded-lg mora-transition font-medium ${
            isSyncing
              ? 'bg-primary/5 text-primary/50 cursor-wait'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
        >
          {isSyncing ? '⏳ Synchronisiert...' : '🔄 Synchronisieren'}
        </button>
      )}
    </div>
  );
}

function getIcon(type: ConnectorStatus['type']) {
  switch (type) {
    case 'email':
      return '📧';
    case 'filesystem':
      return '📁';
    case 'notion':
      return '🧠';
    case 'github':
      return '🐙';
    case 'n8n':
      return '🌀';
    default:
      return '🔗';
  }
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '–';
  }
  return date.toLocaleString();
}
