'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchSemantic } from '@/lib/api/searchClient';
import { isLocalDemoFallback } from '@/lib/api/http';
import { useDemoScopeActive } from '@/lib/demo/demoSourceGuard';
import { useSessionStore } from '@/lib/store/sessionStore';
import { getShipNodeById } from '@/lib/universe/shipDepartments';
import { localPassages, roomPassages, type RoomDocument } from '../model/hintSources';

export type BookLookupScope = {
  companyId: string | null;
  demo: boolean;
  documents: readonly RoomDocument[];
  open: (id: string) => void;
};

export function HintLookup({ scope, sourceId, passage }: { scope?: BookLookupScope; sourceId: string; passage: string }) {
  const [requested, setRequested] = useState(false);
  const reader = useSessionStore(s => s.user ? JSON.stringify([s.user.tenant_id, s.user.id]) : null);
  const demoActive = useDemoScopeActive();
  const local = demoActive || scope?.demo || isLocalDemoFallback();
  const company = scope?.companyId;
  const lookup = useQuery({
    queryKey: ['book-hint', reader, company, local, sourceId, passage, scope?.documents.map(doc => [doc.id, doc.name])],
    enabled: requested && Boolean(scope && (local || (company && reader))),
    retry: false,
    gcTime: 0,
    queryFn: async () => {
      if (!scope) throw new Error('Abteilung fehlt');
      if (local) return localPassages(passage, scope.documents, sourceId, getShipNodeById);
      if (!company || !reader) throw new Error('Firma fehlt');
      const hits = await searchSemantic(passage, company, 20, 0.55, true);
      return roomPassages(hits, scope.documents, sourceId, company);
    },
  });
  if (!requested) return <button type="button" onClick={() => setRequested(true)}>Nachsehen</button>;
  return <div className="wk-hint__sources" aria-live="polite">
    {!scope || (!local && (!company || !reader)) ? <p>Für diese Stelle fehlt der Arbeitsbereich.</p>
      : lookup.isError ? <><p>Quellen gerade nicht erreichbar.</p><button type="button" onClick={() => void lookup.refetch()}>Erneut nachsehen</button></>
      : !lookup.data ? <p>Quellen werden gesucht …</p>
      : lookup.data.length === 0 ? <p>Keine passende Stelle gefunden. Die Frage bleibt offen.</p>
      : <>{lookup.data.map(hit => <div key={hit.id}>
        <q>{hit.quote}</q>
        <button type="button" onClick={() => scope.open(hit.id)}>{hit.title} öffnen</button>
      </div>)}</>}
  </div>;
}
