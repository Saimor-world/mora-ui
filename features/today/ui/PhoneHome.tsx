'use client';
import React, { useMemo } from 'react';
import { Loading, MoraStone, StateView } from '@/components/os-kit';
import { DayPanel } from '@/components/day/DayPanel';
import { WorldPlanetSphere } from '@/components/world/WorldPlanetSphere';
import { useWorld } from '@/lib/lea/useWorld';
import { buildDay, daySentence, personOf } from '@/lib/lea/day';
import { hm } from '@/lib/lea/world';

/**
 * Handy-Home V4: MÔRAs Satz und ein Knopf, die Termine von heute als Streifen zum
 * Wischen (Namen werden nie abgeschnitten), „Als Nächstes“, „Nur heute“ (Überfälliges
 * steht als überfällig da) und eine schlanke Planetenreihe, die ins Universe führt.
 * Nur echte Daten aus CORE; was fehlt, steht als leer da, nicht als Beispiel.
 */
export function PhoneHome({ greeting, firstName, navigate, onAskMora }: {
  greeting: string;
  firstName: string;
  navigate: (id: string) => void;
  onAskMora: (text: string) => void;
}) {
  const world = useWorld();
  // Ein fester Zeitpunkt je Datenstand, damit Satz, Streifen und „Als Nächstes“ zusammenpassen.
  const now = useMemo(() => new Date(), [world.events, world.tasks]);
  const day = useMemo(() => buildDay(world.events, world.tasks, now), [world.events, world.tasks, now]);
  const dateLabel = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = hm(now);

  return (
    <div className="wd-home" data-testid="phone-home">
      <header className="flex flex-col gap-4">
        <div className="wd-home__head">
          <MoraStone size={56} halo />
          <span className="wd-home__date">{dateLabel}</span>
        </div>
        <div>
          <p className="wd-home__sentence" data-testid="phone-home-sentence">{greeting}{firstName ? `, ${firstName}` : ''}.</p>
          <p className="wd-home__sub">{world.loading ? 'MÔRA liest deinen Tag …' : daySentence(day, now)}{day.onlyToday.some((t) => t.overdue) ? ` ${day.onlyToday.filter((t) => t.overdue).length === 1 ? 'Eine Aufgabe ist überfällig.' : `${day.onlyToday.filter((t) => t.overdue).length} Aufgaben sind überfällig.`}` : ''}</p>
        </div>
        <button type="button" className="wd-home__cta" onClick={() => onAskMora('Was steht heute an, und was sollte ich zuerst tun?')} data-testid="phone-home-cta">
          Mit MÔRA durch den Tag
        </button>
      </header>

      {world.loading ? <Loading lines={3} label="Dein Tag wird geladen" /> : null}
      {world.failed ? <StateView compact kind="offline" title="Dein Tag ist gerade nicht lesbar" copy="CORE hat nichts geliefert. Angezeigt wird nichts, was nicht belegt ist." /> : null}

      {/* Termine stehen genau einmal da: im Tagesplan darunter. */}

      {!world.loading && !world.failed ? <DayPanel compact onAskMora={onAskMora} /> : null}

      {world.planets.length ? (
        <section aria-label="Deine Planeten">
          <p className="wd-eyebrow">Dein Universe</p>
          <div className="wd-row" data-testid="phone-home-planets">
            {world.planets.map((p) => (
              <button key={p.id} type="button" className="wd-row-planet" onClick={() => navigate('universe')} aria-label={`${p.name} im Universe öffnen`}>
                <WorldPlanetSphere tone={p.tone} size={40} />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
