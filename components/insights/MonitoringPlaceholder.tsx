'use client';

export default function MonitoringPlaceholder() {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">System Monitoring</h3>
        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded border border-blue-500/30">
          Planned
        </span>
      </div>

      {/* Placeholder UI */}
      <div className="space-y-3">
        {/* Metrics Placeholder */}
        <div className="bg-muted/30 rounded-lg p-3 opacity-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-xs font-medium text-muted-foreground">Metrics</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>API Requests:</span>
              <span>—</span>
            </div>
            <div className="flex justify-between">
              <span>Avg. Latency:</span>
              <span>—</span>
            </div>
            <div className="flex justify-between">
              <span>Error Rate:</span>
              <span>—</span>
            </div>
          </div>
        </div>

        {/* Audit Log Placeholder */}
        <div className="bg-muted/30 rounded-lg p-3 opacity-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-xs font-medium text-muted-foreground">Audit Log</span>
          </div>
          <div className="text-xs text-muted-foreground">
            <p>Letzte Aktionen:</p>
            <p className="mt-1">Noch nicht verfügbar</p>
          </div>
        </div>
      </div>

      {/* Info Text */}
      <div className="mt-3 text-xs text-muted-foreground space-y-1">
        <p>• Geplante Endpoints:</p>
        <p className="ml-2">→ <code className="text-primary">/metrics</code></p>
        <p className="ml-2">→ <code className="text-primary">/v1/system/audit</code></p>
      </div>
    </div>
  );
}
