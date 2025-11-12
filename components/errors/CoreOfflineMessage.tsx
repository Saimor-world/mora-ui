'use client';

import { motion } from 'framer-motion';

interface CoreOfflineMessageProps {
  error?: Error;
  onRetry?: () => void;
}

export default function CoreOfflineMessage({ error, onRetry }: CoreOfflineMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-[400px] p-8"
    >
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Môra Core momentan offline
        </h3>

        {/* Message */}
        <p className="text-sm text-muted-foreground mb-6">
          Die Verbindung zum Backend konnte nicht hergestellt werden.
          Bitte versuche es später erneut oder kontaktiere den Administrator.
        </p>

        {/* Error Details (only in dev) */}
        {error && process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Technische Details
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded text-xs text-destructive overflow-auto">
              {error.message}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Erneut versuchen
            </button>
          )}
          <a
            href="http://localhost:8081/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Core API Docs
          </a>
        </div>

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-border text-xs text-muted-foreground">
          <p className="mb-2 font-medium">Mögliche Ursachen:</p>
          <ul className="text-left space-y-1">
            <li>• Core API läuft nicht (Port 8081)</li>
            <li>• Netzwerkverbindung unterbrochen</li>
            <li>• JWT Token abgelaufen</li>
            <li>• CORS-Konfiguration falsch</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
