'use client';

import { useState } from 'react';

export default function DataUploadPlaceholder() {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    // No actual upload - just a placeholder
  };

  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Data Upload</h3>
        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded border border-blue-500/30">
          Coming Soon
        </span>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 bg-muted/30'
        } opacity-50 cursor-not-allowed`}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="text-3xl">📤</div>
          <p className="text-sm text-muted-foreground">
            Drop CSV/JSON files here
          </p>
          <p className="text-xs text-muted-foreground">
            (Feature in development)
          </p>
        </div>
      </div>

      {/* Info Text */}
      <div className="mt-3 text-xs text-muted-foreground space-y-1">
        <p>• Geplanter Endpoint: <code className="text-primary">/v1/upload</code></p>
        <p>• Unterstützte Formate: CSV, JSON</p>
        <p>• Auto-Parsing & Object-Creation</p>
      </div>
    </div>
  );
}
