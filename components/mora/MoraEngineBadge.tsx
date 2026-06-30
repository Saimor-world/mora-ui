'use client';

import React from 'react';
import { Cpu, Lock, Cloud } from 'lucide-react';
import type { MoraEngine } from '@/lib/mora/describeMoraEngine';

/**
 * Governance badge — shows which brain Môra is currently running on, sourced
 * from CORE's /v3/system/api-management (one source of truth, shown in OS + Desk).
 * Residency is surfaced so "läuft lokal/EU" vs "Cloud" is visible at a glance.
 */
export function MoraEngineBadge({ engine }: { engine: MoraEngine | null }) {
  if (!engine) return null;

  const local = engine.residency === 'local' || engine.residency === 'eu';
  const tint = local ? 'rgba(52, 211, 153, 0.9)' : 'rgba(125, 211, 252, 0.85)';
  const border = local ? 'rgba(52, 211, 153, 0.3)' : 'rgba(125, 211, 252, 0.26)';
  const bg = local ? 'rgba(16, 185, 129, 0.1)' : 'rgba(56, 189, 248, 0.08)';

  return (
    <span
      data-testid="mora-engine-badge"
      title={`Môra denkt gerade auf ${engine.label}${local ? ' — lokal/EU, bleibt im Haus' : ' — Cloud-Provider'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        border: `1px solid ${border}`,
        background: bg,
        padding: '3px 9px',
        fontSize: 11,
        color: 'rgba(226, 232, 240, 0.88)',
        whiteSpace: 'nowrap',
      }}
    >
      <Cpu className="h-3 w-3" style={{ color: tint }} />
      <span style={{ opacity: 0.6 }}>Môra ·</span>
      <span style={{ fontWeight: 600 }}>{engine.label}</span>
      <span
        data-testid="mora-engine-residency"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: tint, opacity: 0.95 }}
      >
        {local ? <Lock className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
        {local ? 'EU' : 'Cloud'}
      </span>
    </span>
  );
}
