'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { MoraStone } from '@/components/mora/MoraStone';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { plural, type WorldPlanet } from '@/lib/lea/world';

/*
 * Universe nach Stylebook: MÔRA als ein runder Jade-Stein in der Mitte, große matte
 * Planeten auf Umlaufbahnen in verschiedener Tiefe, Namen ruhig darunter. Der
 * Hintergrund (das Universe-Bild) kommt unverändert aus der Shell-Atmosphäre;
 * diese Fläche ist transparent.
 */

function useSize<T extends HTMLElement>() {
  const roRef = useRef<ResizeObserver | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Callback-Ref: misst auch, wenn das Feld nach dem Planeten-Inneren neu erscheint.
  const ref = React.useCallback((el: T | null) => {
    roRef.current?.disconnect();
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    roRef.current = new ResizeObserver(update);
    roRef.current.observe(el);
  }, []);
  return [ref, size] as const;
}

interface Placed { planet: WorldPlanet; x: number; y: number; d: number; depth: number; orbit: number }

const MORA_DESKTOP = 120;
const MORA_PHONE = 88;
export const moraSize = (phone: boolean) => (phone ? MORA_PHONE : MORA_DESKTOP);

/** Planeten auf 2–3 Ellipsen; vorne (unten) größer, hinten (oben) kleiner und gedämpft. Nie hinter MÔRA. */
export function placePlanets(planets: WorldPlanet[], width: number, height: number): { placed: Placed[]; orbits: { rx: number; ry: number }[] } {
  const phone = width < 640;
  const cx = width / 2;
  const cy = height / 2;
  const base = phone ? [0.3, 0.4] : [0.24, 0.36, 0.46];
  const orbits = base.map((f) => {
    const rx = phone ? width * (f + 0.08) : width * f;
    const ry = phone ? height * f * 0.95 : Math.min(height * 0.42, rx * 0.42);
    return { rx, ry };
  });
  const maxW = Math.max(1, ...planets.map((p) => p.weight));
  const n = planets.length;
  // feste, ausgewogene Winkel: erster vorne links, dann im Wechsel
  const start = phone ? -60 : 160;
  const placed = planets.map((planet, i) => {
    const orbit = i % orbits.length;
    const angle = ((start + (360 / Math.max(n, 1)) * i + (orbit * 23)) * Math.PI) / 180;
    const { rx, ry } = orbits[orbit];
    let x = cx + rx * Math.cos(angle);
    let y = cy + ry * Math.sin(angle);
    const depth = (Math.sin(angle) + 1) / 2; // 0 hinten (oben), 1 vorne (unten)
    const baseD = phone ? 54 + 16 * (planet.weight / maxW) : 80 + 26 * (planet.weight / maxW);
    const d = Math.round(baseD * (0.84 + 0.16 * depth));
    // Abstand zu MÔRA sichern
    const min = moraSize(phone) / 2 + d / 2 + 28;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < min) { const k = min / Math.max(dist, 1); x = cx + (x - cx) * k; y = cy + (y - cy) * k; }
    // im Feld halten (Platz für Label unten)
    x = Math.min(width - d / 2 - 12, Math.max(d / 2 + 12, x));
    y = Math.min(height - d / 2 - 72, Math.max(d / 2 + 12, y));
    return { planet, x, y, d, depth, orbit };
  });
  return { placed, orbits };
}

function PlanetBody({ tone, size, dim }: { tone: WorldPlanet['tone']; size: number; dim?: number }) {
  return <span aria-hidden className="lea-planet__body" style={{ width: size, height: size, background: tone.background, filter: dim ? `brightness(${1 - dim})` : undefined }} />;
}

export function LeaUniverse({ planets, companyName, onAddDepartment }: { planets: WorldPlanet[]; companyName?: string | null; onAddDepartment?: () => void }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = planets.find((p) => p.id === openId) ?? null;
  const layout = useMemo(() => placePlanets(planets, size.width, size.height), [planets, size.width, size.height]);
  const askMora = (text: string) => { useOsShellStore.getState().setMoraDraft(text); useOsShellStore.getState().setMoraOpen(true); };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (open) return <PlanetInside planet={open} onBack={() => setOpenId(null)} onAsk={askMora} />;

  return (
    <div className="lea-universe" data-testid="lea-universe">
      <header className="lea-universe__head">
        <p className="lea-eyebrow">Universe{companyName ? ` · ${companyName}` : ''}</p>
        <h1 className="lea-title">Woraus dein Studio besteht</h1>
        <p className="lea-meta">{planets.length ? `${plural(planets.length, 'Planet', 'Planeten')}, alle aus deinen echten Daten. Tippe einen an.` : 'Noch keine Abteilungen. Lege die erste an, dann erscheint sie hier.'}</p>
        {onAddDepartment ? <button type="button" className="lea-btn lea-btn--quiet" onClick={onAddDepartment} data-testid="universe-add-department">Abteilung anlegen</button> : null}
      </header>
      <div ref={ref} className="lea-universe__field" data-testid="universe-field">
        {size.width > 0 ? (
          <>
            <svg className="lea-universe__orbits" width={size.width} height={size.height} aria-hidden>
              {layout.orbits.map((o, i) => <ellipse key={i} cx={size.width / 2} cy={size.height / 2} rx={o.rx} ry={o.ry} />)}
            </svg>
            <div className="lea-universe__mora" style={{ left: size.width / 2, top: size.height / 2 }}>
              <MoraStone size={moraSize(size.width < 640)} label="MÔRA" />
            </div>
            {layout.placed.map(({ planet, x, y, d, depth }) => (
              <button
                key={planet.id}
                type="button"
                className="lea-planet"
                style={{ left: x, top: y, zIndex: 10 + Math.round(depth * 20) + (y > size.height / 2 ? 40 : 0) }}
                onClick={() => setOpenId(planet.id)}
                aria-label={`${planet.name} auswählen`}
                data-testid={`lea-planet-${planet.id}`}
              >
                <PlanetBody tone={planet.tone} size={d} dim={(1 - depth) * 0.22} />
                <span className="lea-planet__label" style={{ top: d + 8 }}>
                  <span className="lea-planet__name">{planet.name}</span>
                  <span className="lea-planet__meta">{planet.meta}</span>
                </span>
              </button>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function PlanetInside({ planet, onBack, onAsk }: { planet: WorldPlanet; onBack: () => void; onAsk: (text: string) => void }) {
  return (
    <div className="lea-inside" data-testid="lea-planet-inside">
      <div className="lea-inside__main">
        <nav className="lea-crumbs" aria-label="Pfad">
          <button type="button" onClick={onBack} className="lea-crumbs__link">Universe</button>
          <ChevronRight size={14} aria-hidden />
          <span>{planet.name}</span>
          <button type="button" onClick={onBack} className="lea-crumbs__close" aria-label="Zurück zum Universe"><X size={14} aria-hidden /><span className="sb-desktop-only">Esc</span></button>
        </nav>
        <p className="lea-eyebrow">{planet.kind === 'tasks' ? 'Planet · offene Aufgaben' : `Planet · ${plural(planet.moons.length, 'Mond', 'Monde')}`}</p>
        <h1 className="lea-title lea-title--xl">{planet.name}</h1>
        <p className="lea-lead">{planet.summary}</p>
        {planet.items.length ? (
          <section>
            <p className="lea-eyebrow">Zuletzt bewegt</p>
            <ol className="lea-list">
              {planet.items.map((item, i) => (
                <li key={item.id} className="lea-list__row">
                  <span className="lea-list__n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="lea-list__title">{item.title}</span>
                  <span className="lea-list__when">{item.when ?? item.meta}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        <div className="lea-row">
          <button type="button" className="lea-btn lea-btn--jade" onClick={() => onAsk(`Was ist in „${planet.name}“ gerade wichtig?`)}><MoraStone size={24} still /> MÔRA fragen</button>
          {planet.kind === 'department' ? <button type="button" className="lea-btn lea-btn--quiet" onClick={() => onAsk(`Lege in „${planet.name}“ einen neuen Bereich an.`)}>Bereich anlegen</button> : null}
        </div>
      </div>
      <aside className="lea-card lea-inside__live">
        <p className="lea-eyebrow">Live erfasst</p>
        <div className="lea-stats">
          {planet.stats.map((s) => <div key={s.label} className="lea-stat"><span className="lea-stat__v">{s.value}</span><span className="lea-stat__l">{s.label}</span></div>)}
        </div>
        {planet.items.length ? (
          <ul className="lea-mini">
            {planet.items.slice(0, 4).map((item) => <li key={item.id}><span className="lea-mini__t">{item.title}</span><span className="lea-mini__m">{item.meta}</span></li>)}
          </ul>
        ) : <p className="lea-meta">Hier ist noch nichts erfasst.</p>}
      </aside>
      <div className="lea-inside__moons" aria-label="Monde">
        {planet.moons.map((m) => (
          <div key={m.id} className="lea-moon">
            <span className="lea-moon__body" style={{ background: planet.tone.background }} aria-hidden />
            <span className="lea-moon__label">{m.label}</span>
            {m.meta ? <span className="lea-moon__meta">{m.meta}</span> : null}
          </div>
        ))}
      </div>
      <div className="lea-inside__horizon" style={{ background: `radial-gradient(ellipse at 50% 0%, ${planet.tone.light}55, ${planet.tone.dark}22 45%, transparent 70%)` }} aria-hidden />
    </div>
  );
}
