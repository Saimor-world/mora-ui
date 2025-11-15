'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getConfig, isDiagnosticsEnabled } from '@/lib/config';
import { healthCheck } from '@/lib/api';
import { showToast } from '@/lib/toast';

interface HealthStatus {
  overall: 'ok' | 'warning' | 'error' | 'loading';
  coreApi: { status: string; message?: string };
  db?: { status: string };
  qdrant?: { status: string };
  llm?: { status: string };
  timestamp?: string;
}

interface AdapterInfo {
  name: string;
  adapter: 'mock' | 'real' | 'degraded' | 'offline';
  status?: string;
  timestamp?: string;
}

interface DiagnosticsLogEntry {
  timestamp: string;
  status: string;
  latency_ms: number | null;
  environment: string;
  details: Record<string, string | undefined>;
}

const DEV_EXPORT_ENABLED = process.env.NODE_ENV !== 'production';

export default function DiagnosticsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [health, setHealth] = useState<HealthStatus>({
    overall: 'loading',
    coreApi: { status: 'loading' },
  });
  const [logEntry, setLogEntry] = useState<DiagnosticsLogEntry | null>(null);
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [adaptersLoading, setAdaptersLoading] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const badgePulseTimeout = useRef<number | null>(null);
  const [settledPulse, setSettledPulse] = useState(false);
  const settleTimeoutRef = useRef<number | null>(null);
  const lastOverallRef = useRef<HealthStatus['overall']>('loading');
  const lastBadgeState = useRef<{ overall: HealthStatus['overall']; adapterAlert: boolean }>({
    overall: 'loading',
    adapterAlert: false,
  });

  const config = getConfig();
  const enabled = isDiagnosticsEnabled();
  const environment = process.env.NODE_ENV || 'development';

  const checkAdapters = useCallback(async () => {
    setAdaptersLoading(true);
    try {
      const response = await fetch(`${config.coreApiUrl}/v1/system/adapters`, {
        headers: {
          Authorization: `Bearer ${config.jwtToken}`,
        },
      });

      if (!response.ok) {
        console.warn('[Diagnostics] /v1/system/adapters not available:', response.status);
        setAdapters([]);
        return;
      }

      const data = await response.json();
      const adapterList: AdapterInfo[] = [];

      if (Array.isArray(data.adapters)) {
        data.adapters.forEach((item: any) => {
          let adapterType: 'mock' | 'real' | 'degraded' | 'offline' = 'offline';

          if (item.adapter === 'mock') adapterType = 'mock';
          else if (item.adapter === 'real') adapterType = 'real';
          else if (item.adapter === 'degraded' || item.status === 'degraded') adapterType = 'degraded';
          else adapterType = 'offline';

          adapterList.push({
            name: item.name || item.key || item.module || 'Unknown',
            adapter: adapterType,
            status: item.status,
            timestamp: item.timestamp,
          });
        });
      }

      setAdapters(adapterList);
    } catch (error) {
      console.warn('[Diagnostics] Failed to fetch adapters:', error);
      setAdapters([]);
    } finally {
      setAdaptersLoading(false);
    }
  }, [config.coreApiUrl, config.jwtToken]);

  const checkHealth = useCallback(async () => {
    setHealth((prev) => ({ ...prev, overall: 'loading' }));
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      const result = await healthCheck();
      const latency = typeof performance !== 'undefined'
        ? Math.round(performance.now() - start)
        : Math.round(Date.now() - (start as number));

      // Treat 'ok', 'online', 'healthy' as success
      const isHealthy = ['ok', 'online', 'healthy'].includes(result.status.toLowerCase());
      const overall =
        isHealthy
          ? 'ok'
          : result.status === 'unreachable'
          ? 'error'
          : 'warning';

      setLogEntry({
        timestamp: result.timestamp || new Date().toISOString(),
        status: result.status,
        latency_ms: Number.isFinite(latency) ? latency : null,
        environment,
        details: {
          db: result.db?.status,
          qdrant: result.qdrant?.status,
          llm: result.llm?.status,
        },
      });

      setHealth({
        overall,
        coreApi: {
          status: result.status,
          message: result.status === 'unreachable' ? 'Cannot reach Core API' : undefined,
        },
        db: result.db,
        qdrant: result.qdrant,
        llm: result.llm,
        timestamp: result.timestamp,
      });

      // Also check adapters
      checkAdapters();
    } catch (error) {
      setHealth({
        overall: 'error',
        coreApi: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      setLogEntry({
        timestamp: new Date().toISOString(),
        status: 'error',
        latency_ms: null,
        environment,
        details: {},
      });
    }
  }, [environment, checkAdapters]);

  useEffect(() => {
    if (enabled && isOpen) {
      checkHealth();
    }
  }, [enabled, isOpen, checkHealth]);

  const adapterAlert = adapters.some((adapter) => adapter.adapter === 'degraded' || adapter.adapter === 'offline');
  const isMockAdapterState = !adaptersLoading && adapters.length === 0 && health.overall === 'ok';

  useEffect(() => {
    const signature = { overall: health.overall, adapterAlert };
    const prev = lastBadgeState.current;
    if (signature.overall !== prev.overall || signature.adapterAlert !== prev.adapterAlert) {
      setBadgePulse(true);
      if (badgePulseTimeout.current) {
        window.clearTimeout(badgePulseTimeout.current);
      }
      badgePulseTimeout.current = window.setTimeout(() => {
        setBadgePulse(false);
        badgePulseTimeout.current = null;
      }, 2000);
      lastBadgeState.current = signature;
    }
  }, [adapterAlert, health.overall]);

  useEffect(() => {
    return () => {
      if (badgePulseTimeout.current) {
        window.clearTimeout(badgePulseTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (lastOverallRef.current !== 'ok' && health.overall === 'ok') {
      setSettledPulse(true);
      if (settleTimeoutRef.current) {
        window.clearTimeout(settleTimeoutRef.current);
      }
      settleTimeoutRef.current = window.setTimeout(() => {
        setSettledPulse(false);
        settleTimeoutRef.current = null;
      }, 2000);
    }
    lastOverallRef.current = health.overall;
    return () => {
      if (settleTimeoutRef.current) {
        window.clearTimeout(settleTimeoutRef.current);
      }
    };
  }, [health.overall]);

  useEffect(() => {
    const handleDiagnosticsOpen = () => setIsOpen(true);
    window.addEventListener('mora:diagnostics-open', handleDiagnosticsOpen as EventListener);
    return () => window.removeEventListener('mora:diagnostics-open', handleDiagnosticsOpen as EventListener);
  }, []);

  const hasCriticalHealthIssue =
    health.coreApi.status === 'unreachable' ||
    health.coreApi.status === 'unauthorized' ||
    health.coreApi.status === 'error' ||
    health.db?.status === 'error' ||
    health.qdrant?.status === 'error' ||
    health.llm?.status === 'error';
  const needsQuickFix =
    health.coreApi.status === 'unreachable' ||
    health.coreApi.status === 'unauthorized' ||
    health.coreApi.status === 'error';
  const shouldShowIssues = !isMockAdapterState && hasCriticalHealthIssue;
  const badgeTone =
    health.overall === 'ok'
      ? 'bg-green-500 text-white'
      : health.overall === 'warning'
      ? 'bg-yellow-500 text-black'
      : health.overall === 'error'
      ? 'bg-red-500 text-white'
      : 'bg-gray-500 text-white';
  const badgeIcon = health.overall === 'loading' ? '⏳' : health.overall === 'ok' ? '✓' : '⚠️';

  const handleExportLog = async () => {
    if (!logEntry) {
      showToast({
        message: 'Keine Diagnostics-Daten vorhanden. Bitte zuerst Refresh ausführen.',
        variant: 'error',
      });
      return;
    }

    const payload = {
      timestamp: logEntry.timestamp,
      endpoint: '/v1/health',
      status: logEntry.status,
      latency_ms: logEntry.latency_ms,
      environment: logEntry.environment,
      details: logEntry.details,
      note: '',
    };
    const record = JSON.stringify(payload);

    let savedPath: string | null = null;
    if (DEV_EXPORT_ENABLED) {
      try {
        const response = await fetch('/api/diagnostics/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entry: payload }),
        });
        if (response.ok) {
          const data = (await response.json()) as { filePath?: string };
          savedPath = typeof data.filePath === 'string' ? data.filePath : null;
        } else {
          console.warn('[Diagnostics Export] API responded with', response.status);
        }
      } catch (error) {
        console.warn('[Diagnostics Export] Failed to persist log', error);
      }
    }

    let copied = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(record);
        copied = true;
      } catch {
        copied = false;
      }
    }

    console.log('[Diagnostics Log]', record);
    showToast({
      message: copied
        ? 'Diagnostics Log kopiert (JSONL).'
        : 'Diagnostics Log in Console ausgegeben.',
      variant: copied ? 'info' : 'error',
    });

    if (savedPath) {
      showToast({
        message: `Export → ${savedPath}`,
        variant: 'info',
      });
    }
  };

  // Don't render in production or if disabled
  if (!enabled) return null;

  return (
    <>
      {/* Badge Toggle */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-24 left-6 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg z-50 ${badgeTone} ${
          badgePulse ? 'animate-pulse ring-2 ring-white/40' : ''
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {badgeIcon} Diagnostics
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="fixed bottom-36 left-6 w-96 bg-card border border-border rounded-lg shadow-2xl z-40 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-muted/50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">🔍 System Diagnostics</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Development Mode Only</p>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {/* Configuration */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Configuration</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Core API URL:</span>
                    <span className="font-mono text-foreground">{config.coreApiUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">JWT Token:</span>
                    <span className="font-mono text-foreground">
                      {config.jwtToken ? `${config.jwtToken.substring(0, 20)}...` : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chat Source:</span>
                    <span className="font-mono text-foreground">{config.chatSource}</span>
                  </div>
                </div>
              </div>

              {/* Health Status */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground">Health Status</h4>
                  <div className="flex items-center gap-2">
                    {DEV_EXPORT_ENABLED && (
                      <button
                        onClick={handleExportLog}
                        className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded text-foreground"
                        disabled={!logEntry || health.overall === 'loading'}
                      >
                        Export Log
                      </button>
                    )}
                    <button
                      onClick={checkHealth}
                      className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded text-primary"
                      disabled={health.overall === 'loading'}
                    >
                      {health.overall === 'loading' ? 'Checking...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Core API */}
                  <StatusItem
                    label="Core API"
                    status={health.coreApi.status}
                    message={health.coreApi.message}
                  />

                  {/* Database */}
                  {health.db && (
                    <StatusItem label="Database" status={health.db.status} />
                  )}

                  {/* Qdrant */}
                  {health.qdrant && (
                    <StatusItem label="Qdrant (Vector DB)" status={health.qdrant.status} />
                  )}

                  {/* LLM */}
                  {health.llm && (
                    <StatusItem label="LLM Backend" status={health.llm.status} />
                  )}
                </div>

                {health.timestamp && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last check: {new Date(health.timestamp).toLocaleTimeString()}
                  </p>
                )}
                {settledPulse && (
                  <p className="text-xs text-green-500 mt-1">System stabilisiert – Health ok.</p>
                )}
              </div>

              {/* Adapter Status */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Adapter Status</h4>
                {adaptersLoading ? (
                  <p className="text-xs text-muted-foreground">Loading adapters...</p>
                ) : isMockAdapterState ? (
                  <div className="flex items-center gap-2 text-xs text-green-500 font-medium">
                    <span>🌿 Mock-Modus – Adapterstatus absichtlich leer</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {adapters.map((adapter, idx) => (
                      <div key={idx} className="flex items-start justify-between text-xs">
                        <span className="text-muted-foreground">{adapter.name}:</span>
                        <div className="text-right flex items-center gap-1">
                          <span className={`font-medium ${
                            adapter.adapter === 'real' ? 'text-green-500' :
                            adapter.adapter === 'mock' ? 'text-amber-500' :
                            adapter.adapter === 'degraded' ? 'text-yellow-500' :
                            'text-red-500'
                          }`}>
                            {adapter.adapter === 'real' ? '🟢 Live-Daten' :
                             adapter.adapter === 'mock' ? '🟠 Demo-Daten' :
                             adapter.adapter === 'degraded' ? '🟡 Degraded' :
                             '🔴 Offline'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Troubleshooting Hints - Only show for actual errors (unreachable/401/5xx) */}
              {shouldShowIssues && (
                <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                  <h4 className="text-sm font-medium text-destructive mb-1">⚠️ Issues Detected</h4>
                  <ul className="text-xs text-destructive space-y-1">
                    {health.coreApi.status === 'unreachable' && (
                      <li>• Core API unreachable - Is the server running on {config.coreApiUrl}?</li>
                    )}
                    {health.coreApi.status === 'error' && (
                      <li>• Core API error - Check server logs</li>
                    )}
                    {health.coreApi.status === 'unauthorized' && (
                      <li>• JWT token invalid - Generate a new token</li>
                    )}
                    {health.db?.status === 'error' && (
                      <li>• Database connection failed</li>
                    )}
                    {health.qdrant?.status === 'error' && (
                      <li>• Qdrant vector database unavailable</li>
                    )}
                    {health.llm?.status === 'error' && (
                      <li>• LLM backend unavailable</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Quick Fixes - Only show for actual errors */}
              {needsQuickFix && (
                <div className="bg-muted/50 rounded p-3">
                  <h4 className="text-sm font-medium text-foreground mb-1">💡 Quick Fixes</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>1. Check .env.local file exists and has correct values</li>
                    <li>2. Verify Core API is running: <code className="text-primary">cd saimor-core && python -m core.main</code></li>
                    <li>3. Check CORS allows localhost:3002</li>
                    <li>4. Regenerate JWT token if expired</li>
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StatusItem({
  label,
  status,
  message,
}: {
  label: string;
  status: string;
  message?: string;
}) {
  const getColor = (status: string) => {
    const normalized = status.toLowerCase();
    if (['ok', 'online', 'healthy'].includes(normalized)) return 'text-green-500';
    if (normalized === 'loading') return 'text-gray-500';
    if (normalized === 'warning') return 'text-yellow-500';
    return 'text-red-500';
  };

  const getIcon = (status: string) => {
    const normalized = status.toLowerCase();
    if (['ok', 'online', 'healthy'].includes(normalized)) return '✓';
    if (normalized === 'loading') return '⏳';
    if (normalized === 'warning') return '⚠️';
    return '✗';
  };

  return (
    <div className="flex items-start justify-between text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <div className="text-right">
        <span className={`font-medium ${getColor(status)}`}>
          {getIcon(status)} {status}
        </span>
        {message && (
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        )}
      </div>
    </div>
  );
}
