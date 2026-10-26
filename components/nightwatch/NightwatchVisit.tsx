'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { coreGet } from '@/lib/api/http';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { isCritical, nightReport, rollVisit, visitDelay, VISIT_KEY, type VisitState } from '@/lib/nightwatch/visit';

function readState(): VisitState | null {
  try { return JSON.parse(window.localStorage.getItem(VISIT_KEY) || 'null'); } catch { return null; }
}
function writeState(s: VisitState) {
  try { window.localStorage.setItem(VISIT_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

/**
 * Nightwatch, the night persona: flies in once a day (~5 min after the first open,
 * at once on CRIT) with a three-point report from CORE. Dismissible; reachable via MÔRA.
 */
export function NightwatchVisit({ enabled }: { enabled: boolean }) {
  const open = useOsShellStore((s) => s.nightwatchOpen);
  const setOpen = useOsShellStore((s) => s.setNightwatchOpen);
  const [state, setState] = useState<VisitState | null>(null);
  const q = useQuery({
    queryKey: ['os', 'nightwatch', 'night-report'],
    queryFn: async () => {
      const data = await coreGet('/v3/nightwatch/incidents?include_resolved=true', { isOptional: true });
      return data == null ? null : (Array.isArray(data) ? data as NightwatchIncidentItem[] : []);
    },
    enabled,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
  const critical = Boolean(q.data?.some(isCritical));
  const points = useMemo(() => nightReport(q.isSuccess ? q.data ?? null : null, new Date()), [q.isSuccess, q.data]);

  useEffect(() => {
    if (!enabled) return;
    const s = rollVisit(readState(), new Date());
    writeState(s); setState(s);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !state || !q.isFetched) return;
    const delay = visitDelay(state, new Date(), critical);
    if (delay == null) return;
    const t = window.setTimeout(() => setOpen(true), delay);
    return () => window.clearTimeout(t);
  }, [enabled, state, critical, q.isFetched, setOpen]);

  if (!enabled || !open) return null;
  const dismiss = () => { setOpen(false); if (state) { const s = { ...state, dismissed: true }; writeState(s); setState(s); } };

  return (
    <aside className={`os-nw${critical ? ' os-nw--crit' : ''}`} role="dialog" aria-label="Nightwatch · Nachtbericht" data-testid="nightwatch-visit">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="os-nw__owl" src="/nightwatch/eule.png" alt="" width={96} height={80} />
      <div className="os-nw__body">
        <div className="os-nw__head"><b>Nightwatch</b><span>{critical ? 'Kritisch – sofort gemeldet' : 'Nachtbericht'}</span>
          <button type="button" className="os-nw__close" onClick={dismiss} aria-label="Nightwatch schließen"><X size={14} /></button></div>
        {q.isLoading ? <p className="os-nw__muted">Ich lese die Nacht aus CORE …</p> : (
          <ol className="os-nw__points">{points.map((p, i) => <li key={i} data-tone={p.tone}>{p.text}</li>)}</ol>
        )}
        <div className="os-nw__actions">
          <button type="button" onClick={() => { dismiss(); openLegacyApp('nightwatch'); }}>Lagebild öffnen</button>
          <button type="button" onClick={dismiss}>Gute Nacht gehabt</button>
        </div>
        <p className="os-nw__muted">Aus CORE-Vorfällen zusammengestellt. Eigener Nachtbericht folgt, sobald CORE ihn liefert.</p>
      </div>
    </aside>
  );
}
