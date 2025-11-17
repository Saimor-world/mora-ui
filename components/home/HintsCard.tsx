'use client';

import Link from 'next/link';
import { getTopHints, formatHint, type UIHint } from '@/lib/mind/uiHints';
import PanelCard from '@/components/ui/PanelCard';

interface HintsCardProps {
  maxHints?: number;
}

export default function HintsCard({ maxHints = 3 }: HintsCardProps) {
  const hints = getTopHints(maxHints);

  if (hints.length === 0) {
    return null;
  }

  return (
    <PanelCard paddingClassName="p-6 lg:p-7" className="space-y-4 shadow-xl">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">💡 Môra Hints</h2>
        <p className="text-xs text-muted-foreground">
          Proaktive Vorschläge basierend auf deinen Aktivitäten (Demo-Modus).
        </p>
      </div>

      <div className="space-y-3">
        {hints.map((hint) => (
          <HintItem key={hint.id} hint={hint} />
        ))}
      </div>
    </PanelCard>
  );
}

function HintItem({ hint }: { hint: UIHint }) {
  const content = (
    <div
      className={`group flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-card/80 mora-transition ${
        hint.actionPath ? 'hover:bg-secondary/30 hover:border-primary/40 cursor-pointer' : ''
      }`}
    >
      <span className="text-lg shrink-0 mt-0.5">
        {hint.type === 'insight' && '💡'}
        {hint.type === 'action' && '⚡'}
        {hint.type === 'suggestion' && '🌱'}
        {hint.type === 'discovery' && '🔍'}
      </span>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm leading-relaxed">{hint.message}</p>
        {hint.contextLabel && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border/50 bg-background text-[10px] text-muted-foreground">
            {hint.contextLabel}
          </span>
        )}
      </div>
      {hint.actionPath && hint.actionLabel && (
        <span className="text-xs text-primary font-medium shrink-0 group-hover:underline">
          {hint.actionLabel} →
        </span>
      )}
    </div>
  );

  if (hint.actionPath) {
    return <Link href={hint.actionPath}>{content}</Link>;
  }

  return content;
}
