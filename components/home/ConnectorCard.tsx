'use client';

import type { Connector } from '@/lib/connectors';

interface ConnectorCardProps {
  connector: Connector;
  onSetup: (connector: Connector) => void;
  onSync?: (connector: Connector) => void;
  isSyncing?: boolean;
}

const STATUS_COLORS: Record<Connector['status'], string> = {
  connected: 'text-green-500',
  connecting: 'text-amber-500',
  not_connected: 'text-muted-foreground',
  error: 'text-red-500',
};

const STATUS_LABELS: Record<Connector['status'], string> = {
  connected: '🟢 Verbunden',
  connecting: '🟡 Verbindet...',
  not_connected: '🔴 Nicht verbunden',
  error: '🔴 Fehler',
};

export default function ConnectorCard({ connector, onSetup, onSync, isSyncing = false }: ConnectorCardProps) {
  return (
    <div className="p-4 rounded-2xl border border-border bg-card/70 hover:bg-card shadow-sm mora-transition flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getIcon(connector.type)}</div>
          <div>
            <p className="text-sm font-medium">{connector.name}</p>
            <p className={`text-xs ${STATUS_COLORS[connector.status]}`}>
              {STATUS_LABELS[connector.status]}
            </p>
          </div>
        </div>
        <button
          onClick={() => onSetup(connector)}
          className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 mora-transition"
        >
          {connector.status === 'connected' ? 'Konfigurieren' : 'Verbinden'}
        </button>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <div>Zuletzt: {connector.lastSync ? new Date(connector.lastSync).toLocaleString() : '—'}</div>
        <div>Objekte: {connector.objectCount ?? '—'}</div>
      </div>

      {connector.status === 'connected' && onSync && (
        <button
          onClick={() => !isSyncing && onSync(connector)}
          disabled={isSyncing}
          aria-busy={isSyncing}
          className={`text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 mora-transition ${
            isSyncing ? 'opacity-70 pointer-events-none' : ''
          }`}
        >
          {isSyncing ? 'Synchronisiert...' : 'Synchronisieren'}
        </button>
      )}
    </div>
  );
}

function getIcon(type: Connector['type']) {
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
