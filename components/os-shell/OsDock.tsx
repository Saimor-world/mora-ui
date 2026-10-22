'use client';
import Link from 'next/link';
import React from 'react';
import { Bell, LayoutGrid, Search, Sparkles } from 'lucide-react';
import { MoraStone } from '@/components/os-kit';
import type { FeatureManifest } from '@/features/types';

/**
 * Main navigation, stylebook 22.10.2026 (Bauauftrag part 6).
 *
 * Computer (>= 768 px): a 96-px rail on the left, the same on every screen:
 * MÔRA on top, the places below, tools at the bottom.
 * Phone: a dock with exactly five slots: Heute, two places, MÔRA raised in the
 * middle, Universe. Everything else lives behind "Mehr" in the top bar.
 * The phone is a full device; there is no "better on desktop" hint any more.
 *
 * Slots 2 and 4 are fixed places for now (Post & Termine, Wissen). In the decided
 * design they are the company's own departments (e.g. Termine, Kundinnen); that
 * becomes data-driven with the home screens (part 4).
 */
export const PHONE_DOCK_IDS = ['today', 'post', 'knowledge', 'universe'] as const;

export interface OsDockProps {
  items: FeatureManifest[];
  activeId: string;
  showLegacy?: boolean;
  moraOpen: boolean;
  unread?: number;
  onNavigate: (id: string) => void;
  onSearch: () => void;
  onControl?: () => void;
  controlOpen?: boolean;
  onNotifications: () => void;
  onMora: () => void;
}

/** Which phone slot a place takes (1, 2, 4, 5), or none: then it is reached through "Mehr". */
export function phoneSlotFor(id: string, available: string[]): number | null {
  const ordered = PHONE_DOCK_IDS.filter((dockId) => available.includes(dockId));
  const index = ordered.indexOf(id as (typeof PHONE_DOCK_IDS)[number]);
  if (index < 0) return null;
  return [1, 2, 4, 5][index] ?? null;
}

/** Kurze Rail-Beschriftungen, damit nichts abgeschnitten wird. */
export const RAIL_LABEL: Record<string, string> = { settings: 'Optionen' };

export function OsDock({ items, activeId, moraOpen, unread, onNavigate, onSearch, onControl, controlOpen, onNotifications, onMora, showLegacy = false }: OsDockProps) {
  const ids = items.map((m) => m.id);
  return (
    <nav className="sb-nav" aria-label="Hauptnavigation" data-testid="os-dock">
      <div className="sb-nav__inner" data-testid="dock">
        <button
          type="button"
          className="sb-nav__btn sb-nav__mora sb-press"
          aria-pressed={moraOpen}
          aria-label="MÔRA"
          title="MÔRA · M"
          onClick={onMora}
          onDoubleClick={() => onNavigate('mora')}
          data-testid="dock-mora"
        >
          <MoraStone size={40} halo={moraOpen} className="sb-nav__stone" />
          <span className="sb-nav__label" aria-hidden>MÔRA</span>
        </button>

        {items.map((m, i) => {
          const Icon = m.icon;
          const active = m.id === activeId;
          const slot = phoneSlotFor(m.id, ids);
          return (
            <span key={m.id} className="sb-nav__slot" data-feature={m.id} data-active={active ? 'true' : undefined} data-phone-slot={slot ?? undefined}>
              <button
                type="button"
                className="sb-nav__btn sb-press"
                aria-label={m.title}
                aria-current={active ? 'page' : undefined}
                title={i < 9 ? `${m.title} · ${i + 1}` : m.title}
                onClick={() => onNavigate(m.id)}
              >
                <Icon size={22} strokeWidth={1.6} aria-hidden />
                <span className="sb-nav__label" aria-hidden>{RAIL_LABEL[m.id] ?? m.title}</span>
              </button>
            </span>
          );
        })}

        <div className="sb-nav__tools">
          <button type="button" className="sb-nav__tool sb-press" aria-label="Suche" title="Suche · ⌘K" onClick={onSearch}><Search size={20} strokeWidth={1.6} aria-hidden /></button>
          {onControl ? (
            <button type="button" className="sb-nav__tool sb-press" aria-label="Control Center" aria-pressed={controlOpen} title="Control Center · C" onClick={onControl}><Sparkles size={20} strokeWidth={1.6} aria-hidden /></button>
          ) : null}
          <button type="button" className="sb-nav__tool sb-press" aria-label="Mitteilungen" title="Mitteilungen" onClick={onNotifications}>
            <Bell size={20} strokeWidth={1.6} aria-hidden />
            {unread ? <span className="sb-badge">{unread}</span> : null}
          </button>
          {showLegacy && <Link href="/" className="sb-nav__tool sb-press" aria-label="Klassische Oberfläche" title="Klassische Oberfläche" data-testid="legacy-shell-link"><LayoutGrid size={20} strokeWidth={1.6} aria-hidden /></Link>}
        </div>
      </div>
    </nav>
  );
}
