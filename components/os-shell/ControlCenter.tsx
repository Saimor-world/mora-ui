'use client';
import React from 'react';
import { BookOpen, Compass, Home, MessageCircle, Settings, Timer, X, type LucideIcon } from 'lucide-react';
import { Status, Text } from '@/components/os-kit';
import { DEMO_DEPARTMENTS, demoDocumentCount } from '@/lib/os-prototype/demoPack';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { SCENES } from '@/lib/os-prototype/scene';
import { usePhase } from '@/lib/os-prototype/usePhase';

/**
 * Aus dem Legacy-OS übernommen (Dock › Control Center): Live-Kontext, Szene
 * nach Tageszeit, MÔRA-Laufzeit, Sprungziele und Focus Mode. Verbessert:
 * ehrlicher Laufzeit-Status aus dem CORE-Health-Check, Escape schließt,
 * große Touch-Ziele, keine Hover-Abhängigkeit.
 */
export function ControlCenter({ onClose, navigate, online, org, demo }: { onClose: () => void; navigate: (id: string) => void; online: boolean; org: string; demo: boolean }) {
  const { phase } = usePhase();
  const scene = SCENES.find((x) => x.id === phase) ?? SCENES[1];
  const focusUntil = useOsShellStore((s) => s.focusUntil);
  const audioOn = useOsShellStore((s) => s.audioOn);
  const go = (id: string) => { navigate(id); onClose(); };
  const links: Array<[string, string, string, LucideIcon]> = [
    ['today', 'Heute', 'Zurück auf die zentrale Oberfläche.', Home],
    ['universe', 'Universe', 'Abteilungen als Planeten, Zusammenhänge im Raum.', Compass],
    ['knowledge', 'Wissen', 'Direkt in Dokumente und Strukturen einsteigen.', BookOpen],
    ['mora', 'MÔRA', 'Direkt in den Dialog springen.', MessageCircle],
    ['settings', 'Einstellungen', 'Quellen, Darstellung und Daten.', Settings],
  ];
  return (
    <div className="os-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Control Center" className="os-dialog os-cc" data-testid="control-center">
        <div className="os-cc__head">
          <div><span className="os-cc__chip">Control Center</span><Text variant="title" as="div" className="mt-2">{org}</Text><Text variant="eyebrow">Universe / bereit</Text></div>
          <button type="button" className="os-cc__close" onClick={onClose} aria-label="Schließen" autoFocus><X size={16} /></button>
        </div>
        <div className="os-cc__grid">
          <section className="os-cc__card os-cc__card--wide">
            <Text variant="eyebrow">Live-Kontext</Text>
            <Text variant="title" as="div" className="mt-2">{org}</Text>
            <Text className="mt-1">Diese lokale Instanz arbeitet mit genau einer aktiven Organisation. Von hier gehst du direkt in Abteilungen und Struktur.</Text>
            <div className="os-cc__pills"><span>{DEMO_DEPARTMENTS.length} Abteilungen</span><span>{DEMO_DEPARTMENTS.reduce((n, d) => n + demoDocumentCount(d), 0)} Dokumente</span>{demo ? <span>Beispiel</span> : null}</div>
          </section>
          <section className="os-cc__card">
            <Text variant="eyebrow">Szene · auto</Text>
            <div className="os-cc__scenes">
              {SCENES.map((s) => <div key={s.id} className="os-cc__scene" data-active={s.id === scene.id ? 'true' : undefined}><b>{s.label}</b><span>{s.range}</span></div>)}
            </div>
          </section>
          <section className="os-cc__card">
            <Text variant="eyebrow">MÔRA-Laufzeit</Text>
            <div className="mt-2"><Status tone={online ? 'safe' : 'warning'}>{online ? 'CORE erreichbar' : 'MÔRA offline · kein Antwortpfad'}</Status></div>
            <Text variant="eyebrow" className="mt-4">Focus Mode</Text>
            <button type="button" className="os-cc__focus" data-testid="focus-toggle" onClick={() => useOsShellStore.getState().setFocusUntil(focusUntil ? null : Date.now() + 25 * 60_000)}>
              <Timer size={14} aria-hidden /> {focusUntil ? 'Focus beenden' : 'Focus · 25 min'}
            </button>
            <Text variant="eyebrow" className="mt-4">Ambient</Text>
            <button type="button" className="os-cc__focus" data-testid="cc-ambient" aria-pressed={audioOn} onClick={() => useOsShellStore.getState().setAudioOn(!audioOn)}>
              {audioOn ? 'Ambient aus' : 'Ambient an'}
            </button>
          </section>
          {links.map(([id, t, d, Icon]) => (
            <button key={id} type="button" className="os-cc__link" onClick={() => go(id)}><Icon size={16} /><b>{t}</b><span>{d}</span></button>
          ))}
        </div>
      </div>
    </div>
  );
}
