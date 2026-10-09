'use client';
import React from 'react';
import { Music, VolumeX } from 'lucide-react';
import { Surface, Text } from '@/components/os-kit';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { SCENES } from '@/lib/os-prototype/scene';
import { usePhase } from '@/lib/os-prototype/usePhase';

/** V1.5 Darstellung: Look Kosmos/Klar, Tagesphase (Auto oder Vorschau), Ambient. Alles lokal gespeichert. */
export function LookSettings() {
  const look = useOsShellStore((s) => s.look);
  const override = useOsShellStore((s) => s.phaseOverride);
  const audioOn = useOsShellStore((s) => s.audioOn);
  const volume = useOsShellStore((s) => s.audioVolume);
  const st = useOsShellStore.getState;
  const { phase } = usePhase();
  return (
    <Surface padding={5} data-testid="look-settings">
      <Text variant="eyebrow">Darstellung</Text>
      <div className="os-look-grid mt-3">
        {([
          ['kosmos', 'Kosmos', 'Raum, Licht und Tagesphasen – die volle SAIMÔR-Atmosphäre.'],
          ['klar', 'Klar', 'Ruhige Business-Ansicht: deckende Flächen, kein Weltraum. Gleiche Funktionen.'],
        ] as const).map(([id, t, d]) => (
          <button key={id} type="button" className="os-look-card" aria-pressed={look === id} onClick={() => st().setLook(id)} data-testid={`look-${id}`}>
            <span className={`os-look-card__swatch os-look-card__swatch--${id}`} aria-hidden /><b>{t}</b><span>{d}</span>
          </button>
        ))}
      </div>
      <Text variant="eyebrow" className="mt-5">Tagesphase · färbt Universe, Karten und Ambient</Text>
      <div className="os-phase-row mt-2" role="group" aria-label="Tagesphase">
        <button type="button" aria-pressed={!override} onClick={() => st().setPhaseOverride(null)} data-testid="phase-auto"><b>Automatisch</b><span>nach Uhrzeit · jetzt {SCENES.find((s) => s.id === phase)?.label}</span></button>
        {SCENES.map((s) => (
          <button key={s.id} type="button" aria-pressed={override === s.id} onClick={() => st().setPhaseOverride(s.id)} data-testid={`phase-${s.id}`}><b>{s.label}</b><span>{s.range}</span></button>
        ))}
      </div>
      <Text variant="eyebrow" className="mt-5">Ambient-Musik</Text>
      <div className="os-ambient-row mt-2">
        <button type="button" className="os-ambient-toggle" aria-pressed={audioOn} onClick={() => st().setAudioOn(!audioOn)} data-testid="ambient-toggle">
          {audioOn ? <Music size={15} aria-hidden /> : <VolumeX size={15} aria-hidden />} {audioOn ? 'Ambient an' : 'Ambient aus'}
        </button>
        <label className="os-ambient-volume">Lautstärke
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => st().setAudioVolume(Number(e.target.value))} aria-label="Ambient-Lautstärke" />
        </label>
        <Text variant="meta">Standard: aus. Jede Phase hat ihren eigenen ruhigen Loop; er startet nur nach deinem Klick.</Text>
      </div>
    </Surface>
  );
}
