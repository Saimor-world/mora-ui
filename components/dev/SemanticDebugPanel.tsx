'use client';

interface SemanticDebugPanelProps {
  prompt?: string | null;
  contextLabel?: string | null;
  answerSnippet?: string | null;
}

export default function SemanticDebugPanel({
  prompt,
  contextLabel,
  answerSnippet,
}: SemanticDebugPanelProps) {
  const isDev = process.env.NODE_ENV === 'development';
  const flagOn = process.env.NEXT_PUBLIC_ENABLE_SEMANTIC === 'true';
  if (!isDev || !flagOn) return null;

  return (
    <div className="absolute bottom-2 right-2 z-50 max-w-[280px] rounded-2xl border border-border/70 bg-card/95 text-[11px] text-muted-foreground shadow-xl p-3 space-y-1">
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Semantic Debug</div>
      {prompt && <div><span className="font-semibold text-foreground">Prompt:</span> {prompt.slice(0, 80)}</div>}
      {contextLabel && <div><span className="font-semibold text-foreground">Kontext:</span> {contextLabel}</div>}
      {answerSnippet && <div><span className="font-semibold text-foreground">Antwort:</span> {answerSnippet.slice(0, 120)}</div>}
      {!prompt && !contextLabel && !answerSnippet && <div>Keine Daten (nur sichtbar bei Semantic-Nutzung)</div>}
    </div>
  );
}
