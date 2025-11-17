'use client';

import PanelCard from '@/components/ui/PanelCard';
import type { MindloopItem } from '@/lib/api/mindloop';
import { computeActions, type ActionHint } from '@/lib/mind/actions';

interface ActionsCardProps {
  items: MindloopItem[];
  onNavigateToTarget?: (targetId?: string, label?: string) => void;
}

export default function ActionsCard({ items, onNavigateToTarget }: ActionsCardProps) {
  const actions = computeActions(items).slice(0, 3);

  return (
    <PanelCard className="shadow-xl mora-depth-md bg-card/90 border border-border/70" paddingClassName="p-5 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Hinweise</p>
          <h3 className="text-lg font-semibold text-foreground">Aktionen aus Mind Loop</h3>
          <p className="text-xs text-muted-foreground">
            2-3 leise Vorschlaege, basierend auf aktuellen Signalen.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-200 text-[11px] border border-amber-500/30">
          {actions.length} Hinweise
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Gerade keine Hinweise — Môra beobachtet weiter.</p>
        ) : (
          actions.map((action) => (
            <ActionRow key={action.id} action={action} onNavigate={() => onNavigateToTarget?.(action.targetNodeId, action.label)} />
          ))
        )}
      </div>
    </PanelCard>
  );
}

function ActionRow({ action, onNavigate }: { action: ActionHint; onNavigate?: () => void }) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full text-left px-3 py-2 rounded-xl bg-background/70 border border-border/60 mora-transition hover:border-primary/50 hover:bg-primary/5 flex items-start gap-2"
    >
      <span aria-hidden="true">{iconForKind(action.kind)}</span>
      <div>
        <p className="text-sm font-medium text-foreground">{action.label}</p>
        {action.targetNodeId && <p className="text-xs text-muted-foreground">Fokus: {action.targetNodeId}</p>}
      </div>
    </button>
  );
}

function iconForKind(kind: ActionHint['kind']) {
  switch (kind) {
    case 'risk':
      return '⚠️';
    case 'opportunity':
      return '🌿';
    default:
      return '🔎';
  }
}
