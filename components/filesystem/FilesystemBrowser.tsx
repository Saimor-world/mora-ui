/**
 * Filesystem Browser Component
 *
 * Beautiful organic UI for browsing local files
 * Integrates with Môra's mycelium design
 */

'use client';

import { useFilesystem } from '@/lib/hooks/useFilesystem';
import { type FileMetadata } from '@/lib/filesystem/browser';
import { useMemo } from 'react';

export default function FilesystemBrowser() {
  const {
    files,
    isScanning,
    isSupported,
    selectedDirectory,
    error,
    openDirectory,
    clearFiles,
  } = useFilesystem();

  const stats = useMemo(() => {
    const totalSize = files.reduce((acc, f) => acc + (f.isDirectory ? 0 : f.size), 0);
    const fileCount = files.filter(f => !f.isDirectory).length;
    const dirCount = files.filter(f => f.isDirectory).length;

    return {
      totalSize: formatBytes(totalSize),
      fileCount,
      dirCount,
      totalCount: files.length,
    };
  }, [files]);

  const filesByType = useMemo(() => {
    const types: Record<string, number> = {};
    files
      .filter(f => !f.isDirectory)
      .forEach(f => {
        const ext = f.extension || 'other';
        types[ext] = (types[ext] || 0) + 1;
      });
    return Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [files]);

  if (!isSupported) {
    return (
      <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-amber-900/15 to-transparent backdrop-blur-xl p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold mb-2">Browser nicht unterstützt</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Dein Browser unterstützt die File System Access API nicht.
        </p>
        <p className="text-xs text-muted-foreground">
          Bitte verwende <strong>Chrome</strong>, <strong>Edge</strong> oder <strong>Safari 15.2+</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header mit Action Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>📁</span>
            <span>Filesystem Browser</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedDirectory
              ? `Durchsuche: ${selectedDirectory}`
              : 'Wähle einen Ordner zum Durchsuchen'}
          </p>
        </div>
        <div className="flex gap-3">
          {files.length > 0 && (
            <button
              onClick={clearFiles}
              className="px-5 py-2.5 rounded-full border border-red-500/30 bg-gradient-to-br from-red-950/30 via-red-900/15 to-transparent backdrop-blur-lg text-red-200/90 hover:text-red-100 hover:border-red-500/50 hover:scale-105 text-sm mora-transition"
            >
              🗑️ Schließen
            </button>
          )}
          <button
            onClick={() => openDirectory({ maxDepth: 10 })}
            disabled={isScanning}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500/90 via-emerald-600/80 to-emerald-500/90 text-emerald-50 text-sm font-semibold shadow-[0_4px_16px_0_rgba(16,185,129,0.3)] hover:shadow-[0_6px_24px_0_rgba(16,185,129,0.5)] hover:scale-105 mora-transition disabled:opacity-60 disabled:hover:scale-100"
          >
            {isScanning ? '🔄 Scanne...' : '🌿 Ordner öffnen'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Stats */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Dateien"
            value={stats.fileCount.toString()}
            icon="📄"
            color="emerald"
          />
          <StatCard
            label="Ordner"
            value={stats.dirCount.toString()}
            icon="📁"
            color="blue"
          />
          <StatCard
            label="Gesamt"
            value={stats.totalCount.toString()}
            icon="🌳"
            color="purple"
          />
          <StatCard
            label="Größe"
            value={stats.totalSize}
            icon="💾"
            color="amber"
          />
        </div>
      )}

      {/* File Type Distribution */}
      {filesByType.length > 0 && (
        <div className="rounded-3xl border border-border/10 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl p-6">
          <h4 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
            Top Dateitypen
          </h4>
          <div className="space-y-3">
            {filesByType.map(([ext, count]) => (
              <div key={ext} className="flex items-center justify-between">
                <span className="text-sm font-mono text-emerald-200/80">{ext}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-emerald-950/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500/80 to-emerald-600/60 rounded-full"
                      style={{
                        width: `${(count / stats.fileCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="rounded-3xl border border-border/10 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden">
          <div className="p-4 border-b border-border/10">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Dateien ({stats.fileCount})
            </h4>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {files
              .filter(f => !f.isDirectory)
              .sort((a, b) => b.modified.getTime() - a.modified.getTime())
              .slice(0, 100)
              .map(file => (
                <FileRow key={file.id} file={file} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: 'emerald' | 'blue' | 'purple' | 'amber';
}) {
  const colorClasses = {
    emerald: 'border-emerald-500/20 from-emerald-950/30 via-emerald-900/15',
    blue: 'border-blue-500/20 from-blue-950/30 via-blue-900/15',
    purple: 'border-purple-500/20 from-purple-950/30 via-purple-900/15',
    amber: 'border-amber-500/20 from-amber-950/30 via-amber-900/15',
  };

  return (
    <div
      className={`rounded-2xl border ${colorClasses[color]} to-transparent backdrop-blur-lg p-4 hover:scale-105 mora-transition`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

function FileRow({ file }: { file: FileMetadata }) {
  const icon = getFileIcon(file.extension);

  return (
    <div className="px-4 py-3 hover:bg-emerald-500/5 mora-transition border-b border-border/5 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground truncate">{file.path}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(file.modified)}
          </p>
        </div>
      </div>
    </div>
  );
}

function getFileIcon(extension?: string): string {
  if (!extension) return '📄';

  const icons: Record<string, string> = {
    '.md': '📝',
    '.txt': '📄',
    '.pdf': '📕',
    '.json': '🔧',
    '.js': '💛',
    '.ts': '💙',
    '.tsx': '⚛️',
    '.jsx': '⚛️',
    '.py': '🐍',
    '.java': '☕',
    '.rs': '🦀',
    '.go': '🔷',
    '.html': '🌐',
    '.css': '🎨',
    '.png': '🖼️',
    '.jpg': '🖼️',
    '.gif': '🎞️',
    '.svg': '🎨',
  };

  return icons[extension] || '📄';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'gerade eben';
  if (diffMins < 60) return `vor ${diffMins}m`;
  if (diffHours < 24) return `vor ${diffHours}h`;
  if (diffDays < 7) return `vor ${diffDays}d`;

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}
