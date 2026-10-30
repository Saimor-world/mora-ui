'use client';
import Link from 'next/link';
import React from 'react';
import { Bell, LayoutGrid, MoreHorizontal, Search, Sparkles } from 'lucide-react';
import { useDockVariant } from '@/lib/mora/dockVariant';
import { usePalette } from '@/lib/mora/palette';
import { useOsUnread } from '@/components/os-shell/NotificationTray';
import { useWorld } from '@/lib/lea/useWorld';
import { navStage, useNavPos } from '@/lib/mora/navPos';
import { CapsuleDockIcon } from '@/components/mora/Dock';
import { PixelMoraMark } from '@/components/world/PixelMora';
import { DOCK_ASK_SLOT, useHubMood } from '@/lib/mora/hubMood';
import type { FeatureManifest } from '@/features/types';
import { BridgeConcept } from './BridgeConcept';

/**
 * V1.3 – Marius' Dock als Hauptnavigation. Kapsel, Icons, Tooltips und
 * Aktiv-Zustand kommen direkt aus dem Legacy-Dock (components/mora/Dock.tsx,
 * exportiertes CapsuleDockIcon). Aufbau wie dort: links Werkzeuge, Trenner,
 * Mitte die Orte, rechts der MÔRA-Stein.
 *
 * Zurück auf HQ (main b2f2a99): schlankes einzeiliges Dock ohne .os-dock__stage
 * und ohne riesige 160px-MÔRA; klickbare Anzeigen und freies „Frag MÔRA“-Feld.
 */
export interface OsDockProps {
  items: FeatureManifest[];
  mobileItems: FeatureManifest[];
  activeId: string;
  /** Link zur klassischen Oberfläche: nur SAIMÔR-intern (und in der lokalen Vorschau). */
  showLegacy?: boolean;
  moraOpen: boolean;
  moreActive: boolean;
  unread?: number;
  onNavigate: (id: string) => void;
  onSearch: () => void;
  onControl?: () => void;
  controlOpen?: boolean;
  onNotifications: () => void;
  onMora: () => void;
  onMore: () => void;
}

/** „heute“, „gestern“ oder TT.MM. – nur aus echtem Zeitstempel. */
function relDay(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return null;
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(d)) / 864e5);
  return diff <= 0 ? 'heute' : diff === 1 ? 'gestern' : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

const STAGE: Record<string, string> = { universe: 'Im All', approach: 'Anflug', orbit: 'Im Orbit', landed: 'Gelandet' };

/** Cockpit-Instrumente (Variante C): nur echte Zahlen aus CORE bzw. den Mitteilungen. */
function Instruments({ side, led = 0, onNavigate, onNotifications }: { side: 'l' | 'map' | 'last'; led?: number; onNavigate?: (id: string) => void; onNotifications?: () => void }) {
  const world = useWorld();
  const pos = useNavPos();
  const planets = world.planets ?? [];
  const active = planets.filter((p) => (p.traits?.activity ?? 0) > 0).length;
  const last = planets.filter((p) => p.traits?.lastAt).sort((a, b) => String(b.traits!.lastAt).localeCompare(String(a.traits!.lastAt)))[0];
  const stage = navStage(pos);
  if (side === 'l') {
    return (
      <div className="os-dock__inst" data-testid="dock-instruments">
        <button
          type="button"
          className="os-dock__gauge os-dock__gauge--btn" data-testid="dock-active-count"
          onClick={() => onNavigate?.('universe')}
          title="Zur Universe-Übersicht"
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        >
          <b>{planets.length ? (active > 0 ? `${active}/${planets.length}` : `–/${planets.length}`) : '–'}</b>
          <span>Bereiche aktiv · 7 T.</span>
        </button>
        <button
          type="button"
          className="os-dock__gauge os-dock__gauge--btn"
          data-testid="dock-attention" data-warn={led > 0 ? 'true' : undefined}
          onClick={() => {
            if (onNotifications) onNotifications();
            else onNavigate?.('notifications');
          }}
          title="Mitteilungen öffnen (braucht dich)"
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        >
          <b>{led > 0 ? led : '–'}</b>
          <span>braucht dich</span>
        </button>
      </div>
    );
  }
  if (side === 'last') {
    return (
      <button
        type="button"
        className="os-dock__gauge os-dock__gauge--last os-dock__gauge--btn" data-testid="dock-last-active"
        onClick={() => {
          if (last?.id) {
            useNavPos.getState().set({ planet: { id: last.id, name: last.name }, open: true, moon: null });
            onNavigate?.('universe');
          } else {
            onNavigate?.('universe');
          }
        }}
        title={last ? `Zuletzt aktiv: ${last.name} öffnen` : 'Keine kürzliche Aktivität'}
        style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      >
        <b>{relDay(last?.traits?.lastAt) ?? '–'}</b>
        <span>{last ? `zuletzt · ${last.name}` : 'zuletzt aktiv'}</span>
      </button>
    );
  }
  return (
    <div className="os-dock__map" aria-label="Positionskarte" data-testid="dock-position">
      <span className="os-dock__radar" aria-hidden>
        {planets.slice(0, 12).map((p, i, a) => {
          const t = (i / Math.max(1, a.length)) * Math.PI * 2 - Math.PI / 2;
          const r = 38 * (0.55 + 0.4 * ((i % 3) / 2));
          return <i key={p.id} data-here={pos.planet?.id === p.id ? 'true' : undefined} style={{ left: `${50 + Math.cos(t) * r}%`, top: `${50 + Math.sin(t) * r}%` }} />;
        })}
      </span>
      <span className="os-dock__crumbs">
        <small>{STAGE[stage]}</small>
        <span>
          {stage === 'universe' ? <em>Universe</em> : <button type="button" onClick={() => pos.toUniverse?.()} title="Abheben – zurück ins Universe" data-testid="dock-liftoff">Universe</button>}
          {pos.planet ? <>{' › '}{stage === 'landed' ? <button type="button" onClick={() => pos.toPlanet?.()} title={`Abheben – zurück zu ${pos.planet.name}`}>{pos.planet.name}</button> : <em>{pos.planet.name}</em>}</> : null}
          {pos.moon ? <>{' › '}<em>{pos.moon.name}</em></> : null}
        </span>
      </span>
    </div>
  );
}

export function OsDock({ items, mobileItems, activeId, moraOpen, moreActive, unread, onNavigate, onSearch, onControl, controlOpen, onNotifications, onMora, onMore, showLegacy = false }: OsDockProps) {
  const variant = useDockVariant();
  const mood = useHubMood();
  usePalette();
  const realUnread = useOsUnread();
  const led = unread ?? realUnread;
  const [phoneW, setPhoneW] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const q = window.matchMedia('(max-width: 899px)');
    const f = () => setPhoneW(q.matches);
    f();
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, []);

  const onMobile = new Set(mobileItems.map((m) => m.id));
  const icon = (m: FeatureManifest, i: number) => (
    <span key={m.id} className={onMobile.has(m.id) ? 'os-dock__item os-dock__item--both' : 'os-dock__item os-dock__item--desktop'} data-feature={m.id} data-active={m.id === activeId ? 'true' : undefined}>
      <CapsuleDockIcon icon={m.icon} label={m.title} description={m.description || ''} shortcut={i < 9 ? String(i + 1) : null} active={m.id === activeId} isStandardMode={false} onClick={() => onNavigate(m.id)}>
        {m.id === activeId ? <span className="os-dock__dot" aria-hidden /> : null}
      </CapsuleDockIcon>
      <span className="os-dock__label" aria-hidden>{m.title}</span>
    </span>
  );
  if (variant === 'c') return <BridgeConcept items={items} activeId={activeId} onNavigate={onNavigate} onMora={onMora} onMore={onMore} onNotifications={onNotifications} onSearch={onSearch} onControl={onControl} mood={mood} moraOpen={moraOpen} attention={led} phone={phoneW} showLegacy={showLegacy} />;

  return (
    <nav className="os-dock" aria-label="Hauptnavigation" data-testid="os-dock" data-variant={variant}>
      <div className="os-dock__capsule" data-testid="dock">
        <span className="os-dock__grid" aria-hidden />
        <span className="os-dock__line" aria-hidden />
        <div className="os-dock__group os-dock__group--tools">
          {!phoneW ? <Instruments side="l" led={led} onNavigate={onNavigate} onNotifications={onNotifications} /> : null}
          <CapsuleDockIcon icon={Search} label="Suche" description="Orte, Befehle, MÔRA" shortcut="⌘K" isStandardMode={false} onClick={onSearch} />
          {onControl ? <CapsuleDockIcon icon={Sparkles} label="Control Center" description="Kontext, Szene, Focus" shortcut="C" active={controlOpen} isStandardMode={false} onClick={onControl} /> : null}
          <span className="os-dock__mod" data-led={led > 0 ? 'on' : undefined}>
            <CapsuleDockIcon icon={Bell} label="Mitteilungen" description={led ? `${led} neu` : 'Nichts Neues'} isStandardMode={false} badge={unread} onClick={onNotifications} />
          </span>
        </div>
        <div className="os-dock__hub" data-testid="dock-hub">
          {!phoneW ? <Instruments side="map" onNavigate={onNavigate} /> : null}
          <div id={DOCK_ASK_SLOT} className="os-dock__ask">
            <button type="button" className="os-dock__askbtn" onClick={onMora} data-testid="dock-ask-open">Frag MÔRA …</button>
          </div>
          {!phoneW ? <Instruments side="last" onNavigate={onNavigate} /> : null}
        </div>
        <span className="os-dock__divider" aria-hidden />
        <div className="os-dock__group os-dock__group--apps">
          {items.map((m, i) => icon(m, i))}
          <span className="os-dock__item os-dock__item--mobile">
            <CapsuleDockIcon icon={MoreHorizontal} label="Mehr" description="Weitere Bereiche" active={moreActive} isStandardMode={false} onClick={onMore} />
          </span>
          {showLegacy ? <Link href="/home?classic=1" className="os-dock__legacy" aria-label="Klassische Oberfläche" title="Klassische Oberfläche (Universe)" data-testid="legacy-shell-link"><LayoutGrid size={16} strokeWidth={1.45} /></Link> : null}
          <button type="button" className="os-dock__stone" aria-pressed={moraOpen} aria-label="MÔRA" title="MÔRA · M" onClick={onMora} onDoubleClick={() => onNavigate('mora')} data-testid="dock-mora">
            <PixelMoraMark size={34} active={moraOpen} />
          </button>
        </div>
      </div>
    </nav>
  );
}
