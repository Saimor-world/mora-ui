'use client';
import React, { useCallback, useState } from 'react';
import { Button, Loading, MoraStone, StateView, Text } from '@/components/os-kit';
import { WorldUniverse } from '@/components/world/WorldUniverse';
import { PlanetWindow } from '@/components/world/PlanetWindow';
import { useWorld } from '@/lib/lea/useWorld';
import { useIsPhone } from '@/lib/hooks/useIsPhone';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

/** Universe mit Sitzung: die Abteilungen des Betriebs aus CORE, nichts aus Vorlagen. */
export function LiveWorld({ onAskMora, onAddDepartment }: { onAskMora: (text: string) => void; onAddDepartment?: () => void }) {
  const world = useWorld();
  const phone = useIsPhone();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = world.planets.find((p) => p.id === openId) ?? null;
  const close = useCallback(() => setOpenId(null), []);

  if (world.loading) {
    return (
      <div className="wd-universe grid place-items-center" data-testid="world-loading">
        <div className="flex flex-col items-center gap-4">
          <MoraStone size={phone ? 88 : 120} thinking />
          <Text variant="meta">MÔRA liest deine Abteilungen …</Text>
          <div className="w-48"><Loading lines={2} label="Abteilungen werden geladen" /></div>
        </div>
      </div>
    );
  }
  if (world.failed) {
    return <div className="p-6"><StateView kind="offline" title="Abteilungen gerade nicht lesbar" copy="CORE hat die Abteilungen nicht geliefert. Angezeigt wird nichts, was nicht belegt ist." /></div>;
  }
  if (!world.planets.length) {
    return (
      <div className="wd-universe grid place-items-center" data-testid="world-empty">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <MoraStone size={phone ? 88 : 120} halo />
          <Text tone="default">Noch keine Abteilungen angelegt. Jede Abteilung wird hier ein Planet.</Text>
          {onAddDepartment ? <Button size="sm" onClick={onAddDepartment}>Abteilung hinzufügen</Button> : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <WorldUniverse
        planets={world.planets}
        phone={phone}
        hidden={Boolean(open)}
        onOpenPlanet={setOpenId}
        onMora={() => useOsShellStore.getState().setMoraOpen(true)}
        moraLine={world.day.sentence}
      />
      {open && world.companyId ? (
        <PlanetWindow
          companyId={world.companyId}
          departmentId={open.id}
          name={open.name}
          onClose={close}
          onOpenSpace={(spaceId) => openLegacyApp('finder', { spaceId })}
          onAskMora={(question) => { close(); onAskMora(question); }}
        />
      ) : null}
    </>
  );
}
