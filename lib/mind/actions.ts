import type { MindloopItem } from '@/lib/api/mindloop';

export type ActionHint = {
  id: string;
  kind: 'focus' | 'risk' | 'opportunity';
  label: string;
  targetNodeId?: string;
};

const isAnomaly = (item: MindloopItem) =>
  item.type === 'anomaly' || (typeof item.severity === 'number' && item.severity > 0.85);

export function computeActions(items: MindloopItem[]): ActionHint[] {
  const actions: ActionHint[] = [];
  const seenIds = new Set<string>();

  const push = (hint: ActionHint) => {
    if (seenIds.has(hint.id)) return;
    seenIds.add(hint.id);
    actions.push(hint);
  };

  items.forEach((item) => {
    const target = item.entity_id || item.related_ids?.[0];
    const display = item.title || item.summary || 'Signal';

    if (isAnomaly(item)) {
      push({
        id: `risk-${item.id}`,
        kind: 'risk',
        label: `Môra merkt eine Auffaelligkeit bei ${display}`,
        targetNodeId: target,
      });
      return;
    }

    if (item.type === 'opportunity') {
      push({
        id: `opportunity-${item.id}`,
        kind: 'opportunity',
        label: `Chance bei ${display} pruefen`,
        targetNodeId: target,
      });
      return;
    }
  });

  const tagCounts = items.reduce<Record<string, { count: number; target?: string }>>((acc, item) => {
    (item.tags || []).forEach((tag) => {
      if (!acc[tag]) acc[tag] = { count: 0, target: item.entity_id || item.related_ids?.[0] };
      acc[tag].count += 1;
      if (!acc[tag].target && (item.entity_id || item.related_ids?.[0])) {
        acc[tag].target = item.entity_id || item.related_ids?.[0];
      }
    });
    return acc;
  }, {});

  Object.entries(tagCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([tag, meta]) => {
      if (actions.length >= 5) return;
      if (meta.count >= 2) {
        push({
          id: `focus-${tag}`,
          kind: 'focus',
          label: `Fokus auf ${tag} koennte helfen`,
          targetNodeId: meta.target,
        });
      }
    });

  return actions.slice(0, 5);
}
