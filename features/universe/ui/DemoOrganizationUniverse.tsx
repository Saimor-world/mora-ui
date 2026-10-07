'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { OrganizationField } from '@/components/universe/OrganizationField';
import { UniverseAmbientField } from '@/components/universe/UniverseAmbientField';
import { UniverseObservatory } from '@/components/universe/UniverseObservatory';
import { MoraStone, SampleTag } from '@/components/os-kit';
import { buildDemoUniverse } from '../data/demoUniverse';
import { PlanetDetail } from './PlanetDetail';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

/**
 * Lokale Vorschau des ORIGINAL-Universe: dieselben Komponenten wie
 * UniverseView (Ambient-Feld, Observatorium, Organisationsfeld mit
 * Abteilungs-Planeten und Ordner-Monden), gespeist aus dem Demo-Paket
 * „Simple Coffee Group“. Der MÔRA-Kern sitzt in der Feldmitte, alle Fäden
 * laufen vom Kern zu den Planeten und bleiben im Feld (V1.3.1).
 * Nichts wird geschrieben: Ablegen per Fall meldet ehrlich „nicht möglich“.
 */
export function DemoOrganizationUniverse({ onOpenArea, onAskMora }: { onOpenArea: (target: string) => void; onAskMora: (text: string) => void }) {
  // Flache Fenster (z. B. 1024x640): flachere, breitere Ellipse, damit nichts kollidiert.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const check = () => setCompact(window.innerHeight < 820);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const demo = useMemo(() => buildDemoUniverse({ compact }), [compact]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    // V1.4: Fokus aus Lagebild oder Befehlspalette übernehmen.
    const f = useOsShellStore.getState().universeFocus;
    if (f) useOsShellStore.getState().setUniverseFocus(null);
    return f;
  });
  const focusRequest = useOsShellStore((st) => st.universeFocus);
  useEffect(() => { if (focusRequest) { setSelectedId(focusRequest); useOsShellStore.getState().setUniverseFocus(null); } }, [focusRequest]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !useOsShellStore.getState().paletteOpen) setSelectedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const openKnowledge = (q: string) => { useOsShellStore.getState().setKnowledgeQuery(q); onOpenArea('knowledge'); };
  const noop = () => onOpenArea('post');
  const core = (
    <button type="button" className="os-legacy-universe__core" data-testid="universe-core" aria-label="MÔRA – Kern des Universe. Fragen"
      onClick={() => onAskMora(`Ich bin im Universe der ${demo.organizationName}. Was steckt hinter „${demo.attention.message}“?`)}>
      <span className="os-ulx__core-ring" aria-hidden />
      <span className="os-ulx__core-ring os-ulx__core-ring--2" aria-hidden />
      <MoraStone size={compact ? 48 : 64} />
      <span className="os-ulx__core-label">MÔRA</span>
    </button>
  );
  return (
    <div className="os-legacy-universe relative h-full w-full overflow-hidden text-white" data-testid="demo-organization-universe" data-focus={selectedId ?? undefined}>
      <UniverseAmbientField lens="organization" selected={Boolean(selectedId)} />
      <div className="os-legacy-obs" data-testid="legacy-observatory">
        <UniverseObservatory
          mail={demo.mail} calendar={demo.calendar} feed={demo.feed} mailStatus="ok" calendarStatus="ok"
          incidents={[]} business={demo.business} substanceBars={demo.substanceBars}
          onSelectTerritory={setSelectedId} territoryCount={demo.territories.length}
          documentCount={demo.territories.reduce((n, t) => n + t.documents, 0)} selected={Boolean(selectedId)}
          onOpenMail={noop} onOpenCalendar={noop} onOpenFeed={() => onOpenArea('knowledge')} onOpenNightwatch={() => onOpenArea('settings')}
        />
      </div>
      <OrganizationField
        lens="relations" organizationName={demo.organizationName} territories={demo.territories} signals={demo.signals}
        selectedId={selectedId} onSelect={setSelectedId} attentionId={null}
        onOpen={() => onOpenArea('knowledge')} onOpenMoon={() => onOpenArea('knowledge')}
        onAskMora={(t) => onAskMora(`Was weißt du über ${t.name}?`)}
        onFile={async () => false}
        renderDetail={(t) => (
          <PlanetDetail territory={t} signals={demo.signals} onClose={() => setSelectedId(null)}
            onOpenKnowledge={openKnowledge} onOpenPost={() => onOpenArea('post')} onAskMora={onAskMora} />
        )}
        strandOrigin={{ x: 50, y: 50 }}
        centerSlot={selectedId ? null : core}
        vivid
        frame={{ header: 'os-legacy-universe__header', field: 'os-legacy-universe__field', legend: 'os-legacy-universe__legend', mobile: 'os-legacy-universe__mobile' }}
      />
      {!selectedId ? (
        <button type="button" className="os-ulx__attention os-legacy-universe__pill" data-testid="universe-attention" onClick={() => setSelectedId(demo.attention.targetId)}>
          <MoraStone size={18} halo={false} />
          <span>MÔRA schaut auf <strong>{demo.attention.message}</strong></span>
          <SampleTag />
        </button>
      ) : null}
    </div>
  );
}
