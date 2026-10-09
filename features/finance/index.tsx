'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button, Loading, Stack, StateView, Text } from '@/components/os-kit';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import type { FeatureSurfaceProps } from '../types';
import { useFinanceContracts, type ContractState, type FinanceContract } from './data/contracts';
import { ContractStrip } from './ui/ContractStrip';

// Finance v2 workspace (apps/finance-v2), lazily loaded — the real module, not a copy.
const FinanceV2Workspace = dynamic(
  () => import('@/apps/finance-v2').then((m) => m.FinanceV2Workspace),
  { ssr: false, loading: () => <Loading label="Finance v2 wird geladen" lines={6} /> },
);

export type FinanceTab = 'overview' | 'cashflow' | 'profit' | 'treasury' | 'capital';

export const FINANCE_TABS: Array<{ id: FinanceTab; label: string; section: 'state' | 'flow' | 'treasury' | 'capital'; requires: FinanceContract['id'][] }> = [
  { id: 'overview', label: 'Überblick', section: 'state', requires: ['state'] },
  { id: 'cashflow', label: 'Cashflow', section: 'flow', requires: ['state'] },
  { id: 'profit', label: 'Profit Center', section: 'capital', requires: ['state', 'profit-center', 'capital-policy'] },
  { id: 'treasury', label: 'Treasury & Quellen', section: 'treasury', requires: ['state'] },
  { id: 'capital', label: 'Capital · XRPL (read-only)', section: 'capital', requires: ['state'] },
];

/** First blocking contract for a tab, if any. */
export function blockingContract(tab: FinanceTab, contracts: FinanceContract[]): FinanceContract | null {
  const def = FINANCE_TABS.find((t) => t.id === tab)!;
  for (const id of def.requires) {
    const c = contracts.find((x) => x.id === id);
    if (c && c.state !== 'available' && c.state !== 'checking') return c;
  }
  return null;
}

function stateForContract(state: ContractState) {
  switch (state) {
    case 'contract_missing': return 'backend_unavailable' as const;
    case 'offline': return 'offline' as const;
    case 'unauthenticated': case 'denied': case 'no_session': return 'permission_denied' as const;
    case 'no_company': return 'not_configured' as const;
    default: return 'error' as const;
  }
}

export default function FinanceSurface({ preview }: FeatureSurfaceProps) {
  const { contracts, hasSession } = useFinanceContracts();
  const [tab, setTab] = useState<FinanceTab>('overview');
  const setSurfaceContext = useOsShellStore((s) => s.setSurfaceContext);
  const def = FINANCE_TABS.find((t) => t.id === tab)!;
  const blocker = blockingContract(tab, contracts);

  useEffect(() => { setSurfaceContext(def.label); }, [def.label, setSurfaceContext]);

  return (
    <div className="flex flex-col gap-6" data-testid="feature-finance">
      <header>
        <Text variant="eyebrow">Finance</Text>
        <Text variant="display" className="mt-2">Belegt, nicht geschätzt.</Text>
        <Text className="mt-2 max-w-2xl">
          Cashflow, Profit Center, Treasury und Quellen aus CORE. Kapital und XRPL bleiben reine Anzeige –
          hier wird nichts signiert, gehandelt oder bewegt.
        </Text>
      </header>

      <div className="os-tabs" role="tablist" aria-label="Finance-Bereiche">
        {FINANCE_TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="os-tab" onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {blocker ? (
        <StateView
          kind={stateForContract(blocker.state)}
          title={blocker.state === 'contract_missing' ? `${blocker.label}: im laufenden CORE nicht verfügbar` : blocker.state === 'no_session' ? 'Keine CORE-Sitzung' : blocker.state === 'no_company' ? 'Kein Unternehmen gewählt' : undefined}
          copy={blocker.state === 'contract_missing'
            ? `CORE antwortet auf ${blocker.path} mit 404. Die UI ist fertig verdrahtet; sichtbar wird der Bereich, sobald der CORE-Build mit diesem Endpunkt ausgerollt ist.`
            : blocker.state === 'no_session'
              ? (preview ? 'Lokale Vorschau: Finance zeigt ohne angemeldete Sitzung bewusst keine Zahlen – auch keine Beispielzahlen.' : 'Melde dich an, um belegte Finanzdaten zu sehen.')
              : blocker.state === 'no_company' ? 'Wähle ein aktives Unternehmen, damit Finance die richtige Scope-Prüfung machen kann.' : undefined}
          detail={`Vertrag: ${blocker.path}`}
        />
      ) : hasSession ? (
        <div className="os-surface" style={{ padding: 'var(--os-space-5)', minHeight: 420 }} data-testid="finance-v2-embedded">
          <FinanceV2Workspace key={def.section} initialSection={def.section} hideSectionNav />
        </div>
      ) : null}

      <ContractStrip contracts={contracts} />

      <Stack direction="row" gap={3} align="center" wrap>
        <Text variant="meta">Die alte Capital-App (hartkodierte Konten) bleibt unter Labs › Legacy erreichbar.</Text>
        <Button size="sm" variant="ghost" onClick={() => openLegacyApp('finance')}>Alte Finance öffnen</Button>
        <Button size="sm" variant="ghost" onClick={() => openLegacyApp('finance-v2')}>Finance v2 als Fenster</Button>
      </Stack>
    </div>
  );
}
