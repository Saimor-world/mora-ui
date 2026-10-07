'use client';
import React, { useMemo, useState } from 'react';
import { OrganizationField } from '@/components/universe/OrganizationField';
import { UniverseAmbientField } from '@/components/universe/UniverseAmbientField';
import { UniverseObservatory } from '@/components/universe/UniverseObservatory';
import { MoraStone, SampleTag } from '@/components/os-kit';
import { buildDemoUniverse } from '../data/demoUniverse';

/**
 * Lokale Vorschau des ORIGINAL-Universe: dieselben Komponenten wie
 * UniverseView (Ambient-Feld, Observatorium, Organisationsfeld mit
 * Abteilungs-Planeten und Ordner-Monden), gespeist aus dem Demo-Paket
 * „Simple Coffee Group“. Dazu der MÔRA-Kern aus V1.2 in der Mitte.
 * Nichts wird geschrieben: Ablegen per Fall meldet ehrlich „nicht möglich“.
 */
export function DemoOrganizationUniverse({ onOpenArea, onAskMora }: { onOpenArea: (target: string) => void; onAskMora: (text: string) => void }) {
  const demo = useMemo(() => buildDemoUniverse(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const noop = () => onOpenArea('post');
  return (
    <div className="os-legacy-universe relative h-full w-full overflow-hidden text-white" data-testid="demo-organization-universe">
      <UniverseAmbientField lens="organization" selected={Boolean(selectedId)} />
      <UniverseObservatory
        mail={demo.mail} calendar={demo.calendar} feed={demo.feed} mailStatus="ok" calendarStatus="ok"
        incidents={[]} business={demo.business} substanceBars={demo.substanceBars}
        onSelectTerritory={setSelectedId} territoryCount={demo.territories.length}
        documentCount={demo.territories.reduce((n, t) => n + t.documents, 0)} selected={Boolean(selectedId)}
        onOpenMail={noop} onOpenCalendar={noop} onOpenFeed={() => onOpenArea('knowledge')} onOpenNightwatch={() => onOpenArea('settings')}
      />
      {!selectedId ? (
        <button type="button" className="os-legacy-universe__core" data-testid="universe-core" aria-label="MÔRA – Kern des Universe. Fragen"
          onClick={() => onAskMora(`Ich bin im Universe der ${demo.organizationName}. Was steckt hinter „${demo.attention.message}“?`)}>
          <span className="os-ulx__core-ring" aria-hidden />
          <span className="os-ulx__core-ring os-ulx__core-ring--2" aria-hidden />
          <MoraStone size={74} />
          <span className="os-ulx__core-label">MÔRA</span>
        </button>
      ) : null}
      <OrganizationField
        lens="relations" organizationName={demo.organizationName} territories={demo.territories} signals={demo.signals}
        selectedId={selectedId} onSelect={setSelectedId} attentionId={demo.attention.targetId}
        onOpen={() => onOpenArea('knowledge')} onOpenMoon={() => onOpenArea('knowledge')}
        onAskMora={(t) => onAskMora(`Was weißt du über ${t.name}?`)}
        onFile={async () => false}
      />
      {!selectedId ? (
        <button type="button" className="os-ulx__attention" data-testid="universe-attention" onClick={() => setSelectedId(demo.attention.targetId)}>
          <MoraStone size={18} halo={false} />
          <span>MÔRA schaut auf <strong>{demo.attention.message}</strong></span>
          <SampleTag />
        </button>
      ) : null}
    </div>
  );
}
