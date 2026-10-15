'use client';
import Link from 'next/link';
import React from 'react';
import { Bell, LayoutGrid, MoreHorizontal, Search, Sparkles } from 'lucide-react';
import { CapsuleDockIcon } from '@/components/mora/Dock';
import { MoraStone } from '@/components/os-kit';
import type { FeatureManifest } from '@/features/types';

/**
 * V1.3 – Marius' Dock als Hauptnavigation. Kapsel, Icons, Tooltips und
 * Aktiv-Zustand kommen direkt aus dem Legacy-Dock (components/mora/Dock.tsx,
 * exportiertes CapsuleDockIcon). Aufbau wie dort: links Werkzeuge, Trenner,
 * Mitte die Orte, rechts der MÔRA-Stein.
 */
export interface OsDockProps {
  items: FeatureManifest[];
  mobileItems: FeatureManifest[];
  activeId: string;
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

export function OsDock({ items, mobileItems, activeId, moraOpen, moreActive, unread, onNavigate, onSearch, onControl, controlOpen, onNotifications, onMora, onMore }: OsDockProps) {
  const onMobile = new Set(mobileItems.map((m) => m.id));
  const icon = (m: FeatureManifest, i: number) => (
    <span key={m.id} className={onMobile.has(m.id) ? 'os-dock__item os-dock__item--both' : 'os-dock__item os-dock__item--desktop'} data-feature={m.id} data-active={m.id === activeId ? 'true' : undefined}>
      <CapsuleDockIcon icon={m.icon} label={m.title} description={m.description || ''} shortcut={i < 9 ? String(i + 1) : null} active={m.id === activeId} isStandardMode={false} onClick={() => onNavigate(m.id)}>
        {m.id === activeId ? <span className="os-dock__dot" aria-hidden /> : null}
      </CapsuleDockIcon>
    </span>
  );
  return (
    <nav className="os-dock" aria-label="Hauptnavigation" data-testid="os-dock">
      <div className="os-dock__capsule" data-testid="dock">
        <span className="os-dock__grid" aria-hidden />
        <span className="os-dock__line" aria-hidden />
        <div className="os-dock__group os-dock__group--tools">
          <CapsuleDockIcon icon={Search} label="Suche" description="Orte, Befehle, MÔRA" shortcut="⌘K" isStandardMode={false} onClick={onSearch} />
          {onControl ? <CapsuleDockIcon icon={Sparkles} label="Control Center" description="Kontext, Szene, Focus" shortcut="C" active={controlOpen} isStandardMode={false} onClick={onControl} /> : null}
          <CapsuleDockIcon icon={Bell} label="Mitteilungen" description="Was hereingekommen ist" isStandardMode={false} badge={unread} onClick={onNotifications} />
        </div>
        <span className="os-dock__divider" aria-hidden />
        <div className="os-dock__group os-dock__group--apps">
          {items.map((m, i) => icon(m, i))}
          <span className="os-dock__item os-dock__item--mobile">
            <CapsuleDockIcon icon={MoreHorizontal} label="Mehr" description="Weitere Bereiche" active={moreActive} isStandardMode={false} onClick={onMore} />
          </span>
        </div>
        <span className="os-dock__divider" aria-hidden />
        <div className="os-dock__group os-dock__group--right">
          <Link href="/" className="os-dock__legacy" aria-label="Klassische Oberfläche" title="Klassische Oberfläche (Universe)" data-testid="legacy-shell-link"><LayoutGrid size={16} strokeWidth={1.45} /></Link>
          <button type="button" className="os-dock__stone" aria-pressed={moraOpen} aria-label="MÔRA" title="MÔRA · M" onClick={onMora} onDoubleClick={() => onNavigate('mora')} data-testid="dock-mora">
            <MoraStone size={34} halo={moraOpen} />
          </button>
        </div>
      </div>
    </nav>
  );
}
