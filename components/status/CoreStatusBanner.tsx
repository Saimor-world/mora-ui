'use client';

import { motion } from 'framer-motion';
import { describeHealthState } from '@/lib/health';

type CoreStatusVariant = 'offline' | 'auth' | 'error';
type BannerContext = 'default' | 'compact';

interface CoreStatusBannerProps {
  state: CoreStatusVariant;
  onRetry?: () => void;
  lastChecked?: string;
  context?: BannerContext;
}

const COPY: Record<
  CoreStatusVariant,
  { title: string; description: string; hints: string[]; icon: string }
> = {
  offline: {
    title: 'Môra hört nichts vom Core',
    description:
      'Die Verbindung zur Core API ist zurzeit nicht erreichbar. Prüfe, ob der Server lokal läuft oder versuche es erneut.',
    icon: '🛜',
    hints: [
      'Core auf Port 8081 starten (python -m core.main)',
      'Firewall / VPN kurz deaktivieren',
      'CORS-Eintrag für localhost:3002 bestätigen',
    ],
  },
  auth: {
    title: 'JWT ungültig oder abgelaufen',
    description:
      'Der Core antwortet, lehnt aber das Token ab. Aktualisiere dein NEXT_PUBLIC_JWT_TOKEN in .env.local und starte das UI neu.',
    icon: '🔑',
    hints: [
      '.env.local öffnen und Token prüfen',
      'Neues Token im Core Admin generieren',
      'UI nach dem Update neustarten (npm run dev)',
    ],
  },
  error: {
    title: 'Core meldet einen Fehler',
    description:
      'Die Core API antwortet mit einem unerwarteten Fehler. Logs checken und ggf. neu starten.',
    icon: '⚠️',
    hints: [
      'Server-Logs prüfen (saimor-core/logs)',
      'Services wie Datenbank/Qdrant verfügbar?',
      'Nochmals versuchen, sobald der Core stabil ist',
    ],
  },
};

export default function CoreStatusBanner({
  state,
  onRetry,
  lastChecked,
  context = 'default',
}: CoreStatusBannerProps) {
  const copy = COPY[state];
  const timestampLabel = lastChecked
    ? `Zuletzt geprüft ${new Date(lastChecked).toLocaleTimeString()}`
    : undefined;
  const description = `${copy.description}${timestampLabel ? ` · ${timestampLabel}` : ''}`;

  const baseCardClasses =
    context === 'compact'
      ? 'w-full rounded-2xl border border-border bg-card/80 p-4 text-left shadow-sm'
      : 'max-w-md w-full rounded-2xl border border-border bg-card/90 p-6 text-center shadow-xl';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={baseCardClasses}
    >
      <div className={`flex ${context === 'compact' ? 'items-start gap-3' : 'flex-col gap-2'} text-left`}>
        <div
          className={`flex items-center justify-center rounded-full ${
            context === 'compact' ? 'w-10 h-10 text-lg' : 'w-16 h-16 text-2xl mx-auto'
          } bg-destructive/10 text-destructive`}
        >
          {copy.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{copy.title}</p>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          <p className="mt-2 text-xs text-muted-foreground uppercase tracking-wide">
            {describeHealthState(state === 'error' ? 'warning' : state === 'auth' ? 'auth' : 'offline')}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm">
        {copy.hints.map((hint) => (
          <div key={hint} className="flex items-start gap-2 text-muted-foreground">
            <span className="text-base leading-5">•</span>
            <span>{hint}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-3 flex-wrap">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
          >
            Erneut prüfen
          </button>
        )}
        <a
          href="http://localhost:8081/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold text-center hover:bg-secondary/80 transition"
        >
          Core Docs
        </a>
      </div>
    </motion.div>
  );
}
