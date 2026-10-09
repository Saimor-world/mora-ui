'use client';
import React from 'react';
import { Stack, Status, Surface, Text } from '@/components/os-kit';
import { CONTRACT_LABEL, type ContractState, type FinanceContract } from '../data/contracts';

export function toneFor(state: ContractState) {
  if (state === 'available') return 'safe' as const;
  if (state === 'denied' || state === 'backend_error') return 'critical' as const;
  if (state === 'checking') return 'info' as const;
  return 'warning' as const;
}

/** Visible, honest CORE contract status — the Finance standard for "integrated → verified". */
export function ContractStrip({ contracts }: { contracts: FinanceContract[] }) {
  return (
    <Surface padding={4} aria-label="CORE-Vertragsstatus" data-testid="finance-contracts">
      <Text variant="eyebrow">CORE-Verträge</Text>
      <div className="os-list mt-2">
        {contracts.map((c) => (
          <div key={c.id} className="os-list-row" data-contract={c.id} data-contract-state={c.state}>
            <Stack gap={0}>
              <Text variant="body" tone="default">{c.label}</Text>
              <Text variant="meta"><code>{c.path}</code></Text>
            </Stack>
            <Status tone={toneFor(c.state)}>{CONTRACT_LABEL[c.state]}</Status>
          </div>
        ))}
      </div>
    </Surface>
  );
}
