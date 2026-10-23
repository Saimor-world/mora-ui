'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { MoraStone } from '@/components/os-kit';
import type { WorldOrbit, WorldPlanet } from '@/lib/lea/world';
import type { HorizonSource } from '@/lib/lea/useHorizonSources';
import { floatOffset, layoutOrbits, placeOnOrbit, type OrbitLayout } from '@/lib/universe/worldOrbits';
import { WorldPlanetSphere } from './WorldPlanetSphere';

/**
 * Universe aus echten Daten (Richtung visual-v1): MÔRA – Marius' Jadestein mit Augen –
 * in der Mitte, die Abteilungen als matte Planeten auf feinen Bahnen. Die Planeten bleiben
 * auf ihrem Platz und schweben dort nur ganz leicht (wenige Pixel, sehr langsam, 60 fps
 * über translate3d); Pause bei Zeiger oder Fokus, still bei „weniger Bewegung“.
 * Der Hintergrund bleibt das Universe-Bild der Shell.
 */
export function WorldUniverse({ planets, phone, hidden = false, onOpenPlanet, onMora, moraLine, activeId = null, counts, sources = null, onOpenSource }: {
  /** Quellen-Ring (Systemplaneten aus /v3/universe): verbunden oder noch leer. */
  sources?: HorizonSource[] | null;
  onOpenSource?: (key: string) => void;
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
          {sources?.length ? <ellipse className="wd-source-ring" cx={layout.cx} cy={layout.cy} rx={sourceRing(layout).rx} ry={sourceRing(layout).ry} /> : null}
        </svg>
      ) : null}
      {layout && sources?.length ? sources.map((src, i) => {
        const ring = sourceRing(layout);
        // Obere Hälfte des äußeren Rings, gleichmäßig von links nach rechts.
        const a = Math.PI + (Math.PI * (i + 1)) / (sources.length + 1);
        const x = layout.cx + Math.cos(a) * ring.rx;
        const y = layout.cy + Math.sin(a) * ring.ry;
        return (
          <button key={src.key} type="button" className="wd-source" data-state={src.state} style={{ left: x, top: y }} onClick={() => onOpenSource?.(src.key)}
            title={src.state === 'connected' ? `${src.label}: ${src.sources.join(', ')}` : `${src.label}: noch keine Quelle verbunden`} data-testid={`world-source-${src.key.replace('system:', '')}`}>
            <i aria-hidden />
            <span>{src.label}</span>
            <small>{src.state === 'connected' ? 'verbunden' : 'noch leer'}</small>
          </button>
        );
      }) : null}

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
            {planet.orbit ? <PlanetOrbit orbit={planet.orbit} size={slot?.size ?? 60} phone={phone} /> : null}
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

function sourceRing(layout: OrbitLayout) {
  const outer = layout.rings[layout.rings.length - 1] ?? { rx: layout.cx * 0.6, ry: layout.cy * 0.5 };
  return { rx: Math.min(layout.cx - 90, outer.rx * 1.22), ry: Math.min(layout.cy - 40, outer.ry * 1.3) };
}

const MAX_MOONS = 6;
const MAX_STARS = 8;

/**
 * Sichtbares Netz um einen Planeten: seine echten Ordner als Monde, deren Einträge als
 * Sternpunkte und direkte Sterne (Aufgaben) – jeweils mit feiner Leuchtlinie. Nur Anzeige,
 * der Klick gehört dem Planeten. Mehr als Platz ist, steht als „+N“ da.
 */
export function PlanetOrbit({ orbit, size, phone }: { orbit: WorldOrbit; size: number; phone: boolean }) {
  const moons = orbit.moons.slice(0, MAX_MOONS);
  const stars = orbit.stars.slice(0, MAX_STARS);
  if (!moons.length && !stars.length) return null;
  const r0 = size / 2;
  const moonR = r0 + (phone ? 22 : 34);
  const starR = r0 + (phone ? 14 : 20);
  const moonSize = phone ? 10 : 14;
  const box = (moonR + 26) * 2;
  const c = box / 2;
  // Monde oben verteilt (Label darunter bleibt frei), Sterne gleichmäßig rundherum.
  const moonAt = (i: number, n: number) => {
    const a = -Math.PI / 2 + (n === 1 ? -0.7 : (-1.1 + (2.2 * i) / Math.max(1, n - 1)));
    return { x: c + Math.cos(a) * moonR, y: c + Math.sin(a) * moonR, a };
  };
  const starAt = (i: number, n: number) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n + 0.35;
    return { x: c + Math.cos(a) * starR, y: c + Math.sin(a) * starR };
  };
  return (
    <span className="wd-orbit" style={{ width: box, height: box, marginLeft: -box / 2, marginTop: -box / 2 }} aria-hidden data-testid="world-planet-orbit">
      <svg width={box} height={box}>
        {moons.map((m, i) => {
          const p = moonAt(i, moons.length);
          const sub = m.stars.slice(0, MAX_STARS);
          return (
            <g key={m.id}>
              <line className="wd-sublink" x1={c + Math.cos(p.a) * r0} y1={c + Math.sin(p.a) * r0} x2={p.x} y2={p.y} />
              {sub.map((st, j) => {
                const b = p.a + (-0.9 + (1.8 * j) / Math.max(1, sub.length - 1)) * (sub.length > 1 ? 1 : 0);
                const d = moonSize / 2 + (phone ? 7 : 10);
                return <g key={st.id}><line className="wd-sublink wd-sublink--star" x1={p.x} y1={p.y} x2={p.x + Math.cos(b) * d} y2={p.y + Math.sin(b) * d} /><circle className="wd-stardot" data-kind={st.kind} cx={p.x + Math.cos(b) * d} cy={p.y + Math.sin(b) * d} r={phone ? 1.6 : 2.2} /></g>;
              })}
              <circle className="wd-moondot" cx={p.x} cy={p.y} r={moonSize / 2} />
            </g>
          );
        })}
        {stars.map((st, i) => {
          const p = starAt(i, stars.length);
          return <g key={st.id}><line className="wd-sublink wd-sublink--star" x1={c} y1={c} x2={p.x} y2={p.y} /><circle className="wd-stardot" data-kind={st.kind} data-overdue={st.overdue ? 'true' : undefined} data-done={st.done ? 'true' : undefined} cx={p.x} cy={p.y} r={phone ? 2.4 : 3.2} /></g>;
        })}
      </svg>
      {!phone ? moons.map((m, i) => {
        const p = moonAt(i, moons.length);
        return <span key={m.id} className="wd-moonlabel" style={{ left: p.x, top: p.y - moonSize / 2 - 4 }}>{m.label}{m.stars.length ? ` · ${m.stars.length}` : ''}</span>;
      }) : null}
      {orbit.moons.length > MAX_MOONS ? <span className="wd-moremoons">+{orbit.moons.length - MAX_MOONS}</span> : null}
    </span>
  );
}
