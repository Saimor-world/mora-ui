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
 * ehrlicher CORE-Erreichbarkeitsstatus (KEIN Agenten-Health-Beweis),
 * Demo-Zahlen nur in der Vorschau, Escape schließt, große Touch-Ziele.
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
          <div><span className="os-cc__chip">Control Center</span><Text variant="title" as="div" className="mt-2">{org}</Text><Text variant="eyebrow">{demo ? 'Vorschau · Beispieldaten' : 'OS · Arbeitsbereich'}</Text></div>
          <button type="button" className="os-cc__close" onClick={onClose} aria-label="Schließen" autoFocus><X size={16} /></button>
        </div>
        <div className="os-cc__grid">
          <section className="os-cc__card os-cc__card--wide">
            <Text variant="eyebrow">{demo ? 'Beispiel-Kontext' : 'Organisationskontext'}</Text>
            <Text variant="title" as="div" className="mt-2">{org}</Text>
            <Text className="mt-1">{demo
              ? 'Fiktive Beispieldaten zum Erkunden des OS. Keine echte Organisation.'
              : 'Du siehst den OS-Organisationskontext. Bestandszahlen werden erst nach einem verifizierten CORE-Abruf angezeigt.'}</Text>
            {demo ? (
              <div className="os-cc__pills">
                <span>{DEMO_DEPARTMENTS.length} Abteilungen</span>
                <span>{DEMO_DEPARTMENTS.reduce((n, d) => n + demoDocumentCount(d), 0)} Dokumente</span>
                <span>Beispiel</span>
              </div>
            ) : (
              <div className="os-cc__pills"><span>Bestandszahlen nicht geprüft</span></div>
            )}
          </section>
          <section className="os-cc__card">
            <Text variant="eyebrow">Szene · auto</Text>
            <div className="os-cc__scenes">
              {SCENES.map((s) => <div key={s.id} className="os-cc__scene" data-active={s.id === scene.id ? 'true' : undefined}><b>{s.label}</b><span>{s.range}</span></div>)}
            </div>
          </section>
          <section className="os-cc__card">
            <Text variant="eyebrow">CORE-Verbindung</Text>
            <div className="mt-2"><Status tone={online ? 'safe' : 'warning'}>{online ? 'CORE erreichbar' : 'CORE nicht erreichbar'}</Status></div>
            <Text className="mt-2">MÔRAs Antwortfähigkeit ist hier nicht geprüft.</Text>
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
