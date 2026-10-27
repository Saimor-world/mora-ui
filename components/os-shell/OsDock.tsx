'use client';
import Link from 'next/link';
import React from 'react';
import { Bell, LayoutGrid, MoreHorizontal, Search, Shirt, Sparkles } from 'lucide-react';
import { useDockVariant } from '@/lib/mora/dockVariant';
import { useOsUnread } from '@/components/os-shell/NotificationTray';
import { CapsuleDockIcon } from '@/components/mora/Dock';
import { JadeMoraMark } from '@/components/world/JadeMora';
import { PixelMora, PixelMoraMark } from '@/components/world/PixelMora';
import { DOCK_ASK_SLOT, useHubMood } from '@/lib/mora/hubMood';
import { useReducedMotion } from 'framer-motion';
import { MORA_FIGURE } from '@/lib/mora/figure';
const PIXEL = MORA_FIGURE !== 'jade';
const MoraMark = PIXEL ? PixelMoraMark : JadeMoraMark;
import type { FeatureManifest } from '@/features/types';

/**
 * V1.3 – Marius' Dock als Hauptnavigation. Kapsel, Icons, Tooltips und
 * Aktiv-Zustand kommen direkt aus dem Legacy-Dock (components/mora/Dock.tsx,
 * exportiertes CapsuleDockIcon). Aufbau wie dort: links Werkzeuge, Trenner,
 * Mitte die Orte, rechts der MÔRA-Stein.
 * Homebase: ein durchgehender Streifen unten; MÔRA sitzt direkt an der Eingabe „Frag MÔRA“
 * (im Universe wird MoraAsk hierher portiert, sonst öffnet der Knopf die MÔRA-Konsole).
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

export function OsDock({ items, mobileItems, activeId, moraOpen, moreActive, unread, onNavigate, onSearch, onControl, controlOpen, onNotifications, onMora, onMore, showLegacy = false }: OsDockProps) {
  const mood = useHubMood();
  const variant = useDockVariant();
  const big = variant !== 'strip';
  const realUnread = useOsUnread();
  const led = unread ?? realUnread;
  const reduced = useReducedMotion();
  const [phoneW, setPhoneW] = React.useState(false);
  React.useEffect(() => { if (typeof window.matchMedia !== 'function') return undefined; const q = window.matchMedia('(max-width: 899px)'); const f = () => setPhoneW(q.matches); f(); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, []);
  const onMobile = new Set(mobileItems.map((m) => m.id));
  const icon = (m: FeatureManifest, i: number) => (
    <span key={m.id} className={onMobile.has(m.id) ? 'os-dock__item os-dock__item--both' : 'os-dock__item os-dock__item--desktop'} data-feature={m.id} data-active={m.id === activeId ? 'true' : undefined}>
      <CapsuleDockIcon icon={m.icon} label={m.title} description={m.description || ''} shortcut={i < 9 ? String(i + 1) : null} active={m.id === activeId} isStandardMode={false} onClick={() => onNavigate(m.id)}>
        {m.id === activeId ? <span className="os-dock__dot" aria-hidden /> : null}
      </CapsuleDockIcon>
      <span className="os-dock__label" aria-hidden>{m.title}</span>
    </span>
  );
  return (
    <nav className="os-dock" aria-label="Hauptnavigation" data-testid="os-dock" data-variant={variant}>
      <div className="os-dock__capsule" data-testid="dock">
        <span className="os-dock__grid" aria-hidden />
        <span className="os-dock__line" aria-hidden />
        <div className="os-dock__group os-dock__group--tools">
          <CapsuleDockIcon icon={Search} label="Suche" description="Orte, Befehle, MÔRA" shortcut="⌘K" isStandardMode={false} onClick={onSearch} />
          {onControl ? <CapsuleDockIcon icon={Sparkles} label="Control Center" description="Kontext, Szene, Focus" shortcut="C" active={controlOpen} isStandardMode={false} onClick={onControl} /> : null}
          <span className="os-dock__mod" data-led={led > 0 ? 'on' : undefined}><CapsuleDockIcon icon={Bell} label="Mitteilungen" description={led ? `${led} neu` : 'Nichts Neues'} isStandardMode={false} badge={big ? undefined : unread} onClick={onNotifications} /></span>
          {big ? <span className="os-dock__mod" data-led={activeId === 'settings' ? 'on' : undefined}><CapsuleDockIcon icon={Shirt} label="Garderobe" description="MÔRA anziehen" isStandardMode={false} onClick={() => { onNavigate('settings'); setTimeout(() => document.querySelector('[data-testid="mora-wardrobe"]')?.scrollIntoView({ block: 'center' }), 400); }} /></span> : null}
        </div>
        <div className="os-dock__hub" data-testid="dock-hub">
          <button type="button" className="os-dock__stone" aria-pressed={moraOpen} aria-label="MÔRA" title="MÔRA · M" onClick={onMora} onDoubleClick={() => onNavigate('mora')} data-testid="dock-mora" data-mood={mood}>
            {big ? <span className="os-dock__cone" aria-hidden /> : null}
            {PIXEL ? <span data-testid="mora-mark" className="os-dock__px"><PixelMora size={big ? (phoneW ? 96 : 160) : 48} mood={moraOpen && mood === 'idle' ? 'listening' : mood} reduced={!!reduced} /></span> : <MoraMark size={40} active={moraOpen} />}
          </button>
          <div id={DOCK_ASK_SLOT} className="os-dock__ask">
            <button type="button" className="os-dock__askbtn" onClick={onMora} data-testid="dock-ask-open">Frag MÔRA …</button>
          </div>
        </div>
        <span className="os-dock__divider" aria-hidden />
        <div className="os-dock__group os-dock__group--apps">
          {items.map((m, i) => icon(m, i))}
          <span className="os-dock__item os-dock__item--mobile">
            <CapsuleDockIcon icon={MoreHorizontal} label="Mehr" description="Weitere Bereiche" active={moreActive} isStandardMode={false} onClick={onMore} />
          </span>
          {showLegacy ? <Link href="/home?classic=1" className="os-dock__legacy" aria-label="Klassische Oberfläche" title="Klassische Oberfläche (Universe)" data-testid="legacy-shell-link"><LayoutGrid size={16} strokeWidth={1.45} /></Link> : null}
        </div>
      </div>
    </nav>
  );
}
