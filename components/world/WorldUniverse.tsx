'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { MoraStone } from '@/components/os-kit';
import type { WorldPlanet } from '@/lib/lea/world';
import { floatOffset, layoutOrbits, placeOnOrbit, type OrbitLayout } from '@/lib/universe/worldOrbits';
import { WorldPlanetSphere } from './WorldPlanetSphere';

/**
 * Universe aus echten Daten (Richtung visual-v1): MÔRA – Marius' Jadestein mit Augen –
 * in der Mitte, die Abteilungen als matte Planeten auf feinen Bahnen. Die Planeten bleiben
 * auf ihrem Platz und schweben dort nur ganz leicht (wenige Pixel, sehr langsam, 60 fps
 * über translate3d); Pause bei Zeiger oder Fokus, still bei „weniger Bewegung“.
 * Der Hintergrund bleibt das Universe-Bild der Shell.
 */
export function WorldUniverse({ planets, phone, hidden = false, onOpenPlanet, onMora, moraLine, activeId = null, counts }: {
  moraLine?: string;
  /** Zuletzt geöffneter Planet: leuchtet und trägt „Aktiver Bereich“. */
  activeId?: string | null;
  /** Echte Zähler: Knoten (MÔRA, Planeten, Monde, Sterne) und Verbindungen. */
  counts?: { nodes: number; edges: number };
  planets: WorldPlanet[];
  phone: boolean;
  /** Ein Planet ist offen: das Universe bleibt stehen, aber unsichtbar dahinter. */
  hidden?: boolean;
  onOpenPlanet: (id: string) => void;
  onMora: () => void;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const planetRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const reduced = !!useReducedMotion();
  const paused = useRef(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout: OrbitLayout | null = useMemo(
    () => (size.width && size.height ? layoutOrbits({ width: size.width, height: size.height, weights: planets.map((p) => p.weight), phone }) : null),
    [size.width, size.height, planets, phone],
  );

  const place = useCallback((t: number) => {
    if (!layout) return;
    layout.slots.forEach((slot, i) => {
      const el = planetRefs.current[i];
      if (!el) return;
      const p = placeOnOrbit(layout, slot);
      const { dx, dy } = floatOffset(i, t);
      el.style.transform = `translate3d(${(p.x + dx).toFixed(2)}px, ${(p.y + dy).toFixed(2)}px, 0) translate(-50%, -50%) scale(${p.front ? 1 : 0.85})`;
      el.style.zIndex = String(p.z);
      el.dataset.depth = p.front ? 'front' : 'back';
    });
  }, [layout]);

  // Ein Takt für alle Planeten; steht bei verborgenem Tab, Zeiger/Fokus und „weniger Bewegung“.
  useEffect(() => {
    if (!layout) return;
    place(0);
    if (reduced || typeof requestAnimationFrame === 'undefined') return;
    let frame = 0;
    let t = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (document.hidden || paused.current) return;
      t += dt;
      place(t);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [layout, place, reduced]);

  const hold = (on: boolean) => () => { paused.current = on; };

  return (
    <div ref={fieldRef} className="wd-universe" data-testid="world-universe" data-phone={phone ? 'true' : 'false'} data-large={layout && layout.scale >= 1.2 ? 'true' : 'false'} data-hidden={hidden ? 'true' : 'false'} aria-hidden={hidden || undefined}>
      <div className="wd-zoomwrap" style={{ transform: zoom === 1 ? undefined : `scale(${zoom})` }} data-testid="world-zoomwrap">
      {layout ? (
        <svg className="wd-orbits" width={size.width} height={size.height} aria-hidden>
          {layout.rings.map((r, i) => <ellipse key={i} cx={layout.cx} cy={layout.cy} rx={r.rx} ry={r.ry} />)}
          {/* Netz: jede Abteilung hängt an MÔRA; die aktive leuchtet. */}
          {layout.slots.map((slot, i) => {
            const pt = placeOnOrbit(layout, slot);
            const active = planets[i]?.id === activeId;
            return <line key={`l${i}`} className={active ? 'wd-link wd-link--active' : 'wd-link'} x1={layout.cx} y1={layout.cy} x2={pt.x} y2={pt.y} />;
          })}
        </svg>
      ) : null}

      {layout ? (
        <button
          type="button"
          className="wd-mora"
          style={{ left: layout.cx, top: layout.cy, width: layout.mora, height: layout.mora, zIndex: 10 + Math.round(layout.cy) }}
          onClick={onMora}
          aria-label="MÔRA öffnen"
          data-testid="world-mora"
        >
          <MoraStone size={layout.mora} halo />
        </button>
      ) : null}
      {layout && moraLine ? (
        <button type="button" className="wd-mora-line" style={{ left: layout.cx, top: layout.cy + layout.mora / 2 + 14, zIndex: 11 + Math.round(layout.cy) }} onClick={onMora} data-testid="world-mora-line">
          {moraLine}
        </button>
      ) : null}

      {planets.map((planet, i) => {
        const slot = layout?.slots[i];
        return (
          <button
            key={planet.id}
            ref={(el) => { planetRefs.current[i] = el; }}
            type="button"
            className="wd-planet"
            data-active={planet.id === activeId ? 'true' : undefined}
            style={slot ? undefined : { visibility: 'hidden' }}
            onClick={() => onOpenPlanet(planet.id)}
            onPointerEnter={hold(true)}
            onPointerLeave={hold(false)}
            onFocus={hold(true)}
            onBlur={hold(false)}
            aria-label={`${planet.name} öffnen · ${planet.meta}`}
            data-testid={`world-planet-${planet.id}`}
          >
            <WorldPlanetSphere tone={planet.tone} size={slot?.size ?? 60}>
              {planet.moons.length ? <span className="wd-badge" aria-hidden>{planet.moons.length}</span> : null}
            </WorldPlanetSphere>
            <span className="wd-label">
              <span className="wd-name">{planet.name}</span>
              <span className="wd-meta">{planet.meta}</span>
            </span>
            {planet.id === activeId ? <span className="wd-active-tag" data-testid="world-active-tag">Aktiver Bereich</span> : null}
          </button>
        );
      })}
      </div>
      {layout && !phone ? (
        <>
          {counts ? (
            <div className="wd-counters" aria-label="Zähler">
              <span className="wd-counter" data-testid="world-count-nodes">{counts.nodes} Knoten</span>
              <span className="wd-counter" data-testid="world-count-edges">{counts.edges} Verbindungen</span>
            </div>
          ) : null}
          <div className="wd-zoom" role="group" aria-label="Zoom">
            <button type="button" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2)))} aria-label="Näher heran" data-testid="world-zoom-in">+</button>
            <button type="button" onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2)))} aria-label="Weiter weg" data-testid="world-zoom-out">−</button>
            <button type="button" onClick={() => setZoom(1)} aria-label="Zentrieren" data-testid="world-recenter">◎</button>
          </div>
        </>
      ) : null}
    </div>
  );
}
