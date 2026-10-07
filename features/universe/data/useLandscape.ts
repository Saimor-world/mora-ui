'use client';
import { useMemo } from 'react';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useFinanceSignal } from '@/features/finance/data/useFinanceSignal';
import { CONTRACT_LABEL } from '@/features/finance/data/contracts';
import { useRecentMemories } from '@/features/knowledge/data/useKnowledge';
import { connectionRows, useConnectionsOverview } from '@/features/settings/data/useConnections';
import { LEGACY_APP_PLACEMENT, legacyAppName } from '@/lib/os-prototype/legacyApps';
import { buildLandscape, type Landscape, type LandscapeInput } from './landscape';
import { sampleLandscapeInput } from './sample';

/** Real data via existing hooks; in local preview without session clearly marked example data. */
export function useLandscape(preview: boolean): Landscape & { sample: boolean } {
  const user = useSessionStore((s) => s.user);
  const hasSession = Boolean(user?.tenant_id);
  const today = useScopedToday({ backgroundRefresh: true });
  const finance = useFinanceSignal();
  const departments = useDepartments(hasSession ? user?.active_company_id ?? null : null);
  const memories = useRecentMemories();
  const connections = useConnectionsOverview();
  const sample = preview && !hasSession;

  return useMemo(() => {
    const labs = { count: LEGACY_APP_PLACEMENT.length, names: LEGACY_APP_PLACEMENT.filter((e) => e.placement === 'labs').map((e) => legacyAppName(e.appId)) };
    const fin: LandscapeInput['finance'] = finance.kind === 'value'
      ? { kind: 'value', label: finance.label, value: finance.value, warnings: finance.warnings }
      : { kind: 'state', label: CONTRACT_LABEL[finance.state] };
    if (sample) return { ...buildLandscape({ ...sampleLandscapeInput(), finance: fin, labs }), sample: true };
    const snap = today.snapshot;
    const depts = Array.isArray(departments.data) ? departments.data : null;
    const mems = Array.isArray(memories.data) ? memories.data : null;
    const rows = connections.data ? connectionRows(connections.data) : null;
    const input: LandscapeInput = {
      sample: false,
      tasks: snap ? { open: snap.tasks.counts.open ?? null, overdue: snap.tasks.counts.overdue ?? null, dueToday: snap.tasks.counts.due_today ?? null, titles: (snap.tasks.items ?? []).map((i) => i.title) } : null,
      calendar: snap ? { titles: snap.calendar.events.map((e) => e.title) } : null,
      mail: snap && snap.mail.status !== 'disconnected' && snap.mail.status !== 'unavailable' ? { unread: snap.mail.items.filter((i) => i.read === false).length, subjects: snap.mail.items.map((i) => i.subject || '(ohne Betreff)') } : null,
      finance: fin,
      memories: mems ? { count: mems.length, titles: mems.map((x) => x.summary.slice(0, 48)) } : null,
      spaces: depts ? { names: depts.map((d: { name?: string }) => String(d.name || 'Bereich')) } : null,
      connections: rows ? { configured: rows.filter((r) => r.state === 'configured').map((r) => r.label), missing: rows.filter((r) => r.state !== 'configured').map((r) => r.label) } : null,
      labs,
    };
    return { ...buildLandscape(input), sample: false };
  }, [sample, today.snapshot, finance, departments.data, memories.data, connections.data]);
}
