"use client";

import { RefreshCw, AlertTriangle } from "lucide-react";
import { OrganicBackground } from "./OrganicBackground";
import { MoraOrb } from "./MoraOrb";

type StateVariant = "loading" | "error" | "empty";

interface OrganicStatePanelProps {
  variant: StateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  orbState?: "idle" | "speaking" | "processing" | "listening";
  showBackground?: boolean;
}

const DEFAULT_COPY: Record<
  StateVariant,
  { title: string; description: string; orb: "idle" | "speaking" | "processing" | "listening" }
> = {
  loading: {
    title: "Myzelium erwacht …",
    description: "Bitte einen Moment Geduld, die aktuelle Feldstruktur wird geladen.",
    orb: "processing",
  },
  error: {
    title: "Verbindung zum Kern fehlgeschlagen",
    description: "Keine Antwort vom Core API. Bitte prüfe Netzwerk & Token.",
    orb: "idle",
  },
  empty: {
    title: "Noch keine Daten vorhanden",
    description: "Sobald erste Objekte importiert wurden, erscheint hier dein Feld.",
    orb: "listening",
  },
};

export function OrganicStatePanel({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  orbState,
  showBackground = true,
}: OrganicStatePanelProps) {
  const copy = DEFAULT_COPY[variant];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem]">
      {showBackground && <OrganicBackground intensity={0.6} breathingSpeed={4500} />}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 gap-8 backdrop-blur-2xl bg-black/30">
        <MoraOrb state={orbState ?? copy.orb} scale={0.8} />
        <div className="space-y-3 max-w-lg">
          <h2 className="text-2xl font-semibold text-white tracking-wide">{title ?? copy.title}</h2>
          <p className="text-sm text-white/70 leading-relaxed">{description ?? copy.description}</p>
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-white text-sm font-semibold border border-white/20 hover:bg-white/20 transition-colors"
          >
            {variant === "error" ? <RefreshCw className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
