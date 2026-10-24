'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { MoraStone } from '@/components/os-kit';
import type { PlanetTraits, WorldOrbit, WorldPlanet } from '@/lib/lea/world';
import type { HorizonSource } from '@/lib/lea/useHorizonSources';
import { floatOffset, layoutOrbits, placeOnOrbit, planetFootprint, type OrbitLayout, type Rect } from '@/lib/universe/worldOrbits';
import { WorldPlanetSphere } from './WorldPlanetSphere';

/**
 * Universe aus echten Daten (Richtung visual-v1): MÔRA – Marius' Jadestein mit Augen –
 * in der Mitte, die Abteilungen als matte Planeten auf feinen Bahnen. Die Planeten bleiben
 * auf ihrem Platz und schweben dort nur ganz leicht (wenige Pixel, sehr langsam, 60 fps
 * über translate3d); Pause bei Zeiger oder Fokus, still bei „weniger Bewegung“.
 * Der Hintergrund bleibt das Universe-Bild der Shell.
 */
/** Handy: unten liegt die MÔRA-Eingabe über dem Feld – Planeten und Labels bleiben darüber. */
const ASK_RESERVE_PHONE = 212; // Frag-MÔRA-Leiste + Dock + Zuordnen-Chip (44 px + Luft) liegen über dem unteren Feldrand (gemessen bei 390×844)
/** Computer: die MÔRA-Eingabe (52 px, 24 px über dem Rand) plus Luft – kein Planet liegt darunter. */
const ASK_RESERVE_DESKTOP = 144; // + eine Zeile für MÔRAs Satz direkt über der Eingabe

export function WorldUniverse({ planets, phone, hidden = false, onOpenPlanet, onZoomPlanet, onMora, moraLine, activeId = null, selectedId = null, pulseIds, moraState = 'idle', zoomTo = null, shift = 0, counts, sources = null, onOpenSource, comet = null }: {
  /** Doppelklick: direkt hineinzoomen. */
  onZoomPlanet?: (id: string) => void;
  /** Gewählter Planet (Fokus-Panel / Pfeiltasten). */
  selectedId?: string | null;
  /** Planeten, deren Linie zu MÔRA gerade pulsiert (etwas hat sich geändert). */
  pulseIds?: string[];
  /** MÔRA atmet ruhig, denkt (Antwort unterwegs) oder spricht. */
  moraState?: 'idle' | 'thinking' | 'speaking';
  /** Kamerafahrt: das Universe zoomt auf diesen Planeten, bevor er sich öffnet. */
  zoomTo?: string | null;
  /** Platz rechts für das Fokus-Panel: das Universe rückt nach links und wird etwas kleiner. */
  shift?: number;
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
  /** Neueste echte Mail: ein Komet kreuzt einmal das Feld, wenn sie neu ist. */
  comet?: { id: string; label: string } | null;
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
    () => (size.width && size.height ? layoutOrbits({ width: size.width, height: Math.max(200, size.height - (phone ? ASK_RESERVE_PHONE : ASK_RESERVE_DESKTOP)), weights: planets.map((p) => p.weight), phone, labels: planets.map((p) => ({ name: p.name, meta: p.meta, moons: p.orbit?.moons.length ?? 0, stars: p.orbit?.stars.length ?? 0 })) }) : null),
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

  // Parallaxe: Sternenschichten folgen dem Zeiger ganz leicht (nur Desktop, nie bei „weniger Bewegung“).
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || phone || e.pointerType !== 'mouse') return;
    const el = fieldRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
    el.style.setProperty('--py', (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
  };

  // Kamera: Ursprung auf den Zielplaneten, dann weich hinein (CSS-Transition auf .wd-zoomwrap).
  const zoomIdx = zoomTo ? planets.findIndex((p) => p.id === zoomTo) : -1;
  const zoomPt = layout && zoomIdx >= 0 && layout.slots[zoomIdx] ? placeOnOrbit(layout, layout.slots[zoomIdx]) : null;
  const camera: React.CSSProperties | undefined = zoomPt
    ? { transformOrigin: `${zoomPt.x}px ${zoomPt.y}px`, transform: 'scale(2.6)', opacity: 0, filter: 'blur(2px)' }
    : shift ? { transform: `translateX(${-shift}px) scale(${(0.84 * zoom).toFixed(3)})` }
    : zoom === 1 ? undefined : { transform: `scale(${zoom})` };

  return (
    <div ref={fieldRef} className="wd-universe" data-testid="world-universe" data-phone={phone ? 'true' : 'false'} data-large={layout && layout.scale >= 1.2 ? 'true' : 'false'} data-hidden={hidden ? 'true' : 'false'} aria-hidden={hidden || undefined} onPointerMove={onPointerMove} data-camera={zoomPt ? 'zooming' : undefined}>
      <div className="wd-parallax wd-parallax--far" aria-hidden />
      <div className="wd-parallax wd-parallax--mid" aria-hidden />
      <div className="wd-parallax wd-parallax--near" aria-hidden />
      {layout ? <div className="wd-galaxy" aria-hidden style={{ left: layout.cx, top: layout.cy }}><i /><b /></div> : null}
      {comet ? <span key={comet.id} className="wd-comet" aria-hidden data-testid="world-comet" title={`Neue Mail: ${comet.label}`} /> : null}
      <div className="wd-zoomwrap" style={camera} data-testid="world-zoomwrap">
      {layout ? (
        <svg className="wd-orbits" width={size.width} height={size.height} aria-hidden>
          {layout.rings.map((r, i) => <ellipse key={i} cx={layout.cx} cy={layout.cy} rx={r.rx} ry={r.ry} />)}
          {/* Netz: jede Abteilung hängt an MÔRA; die aktive leuchtet. */}
          {layout.slots.map((slot, i) => {
            const pt = placeOnOrbit(layout, slot);
            const id = planets[i]?.id;
            const active = id === activeId || id === selectedId;
            const pulse = id ? pulseIds?.includes(id) : false;
            return (
              <g key={`l${i}`}>
                <path className={active ? 'wd-link wd-link--active' : 'wd-link'} d={arc(layout.cx, layout.cy, pt.x, pt.y)} />
                {pulse ? <path className="wd-link-pulse" d={arc(layout.cx, layout.cy, pt.x, pt.y)} data-testid={`world-pulse-${id}`} /> : null}
              </g>
            );
          })}
          {sources?.length ? <ellipse className="wd-source-ring" cx={layout.cx} cy={layout.cy} rx={sourceRing(layout).rx} ry={sourceRing(layout).ry} /> : null}
        </svg>
      ) : null}
      {layout && sources?.length ? (() => {
        const rects = layout.slots.flatMap((sl, i) => planetFootprint(layout, sl, planets[i] ? { name: planets[i].name, meta: planets[i].meta, moons: planets[i].orbit?.moons.length ?? 0, stars: planets[i].orbit?.stars.length ?? 0 } : undefined, phone));
        const pts = sourcePositions(layout, sources.length, layout.slots.map((sl) => placeOnOrbit(layout, sl)), 130, rects);
        return sources.map((src, i) => {
        const { x, y } = pts[i];
        return (
          <button key={src.key} type="button" className="wd-source" data-state={src.state} style={{ left: x, top: y }} onClick={() => onOpenSource?.(src.key)}
            title={src.state === 'connected' ? `${src.label}: ${src.sources.join(', ')}` : `${src.label}: noch keine Quelle verbunden`} data-testid={`world-source-${src.key.replace('system:', '')}`}>
            <i aria-hidden />
            <span>{src.label}</span>
            <small>{src.state === 'connected' ? 'verbunden' : 'noch leer'}</small>
          </button>
        );
      });
      })() : null}

      {layout ? (
        <button
          type="button"
          className="wd-mora"
          data-state={moraState}
          style={{ left: layout.cx, top: layout.cy, width: layout.mora, height: layout.mora, zIndex: 10 + Math.round(layout.cy) }}
          onClick={onMora}
          aria-label="MÔRA öffnen"
          data-testid="world-mora"
        >
          <MoraStone size={layout.mora} halo thinking={moraState === 'thinking'} />
        </button>
      ) : null}
      {layout && moraLine ? (
        // MÔRAs Satz direkt über der Eingabe, unterhalb der Bahnen: verdeckt weder Planeten noch Beschriftungen.
        <button type="button" className="wd-mora-line" style={phone ? { left: layout.cx, top: 16 } : { left: layout.cx, top: 'auto', bottom: 92 }} onClick={onMora} data-testid="world-mora-line">
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
            data-selected={planet.id === selectedId ? 'true' : undefined}
            aria-pressed={planet.id === selectedId}
            onDoubleClick={onZoomPlanet ? () => onZoomPlanet(planet.id) : undefined}
            style={slot ? undefined : { visibility: 'hidden' }}
            onClick={() => onOpenPlanet(planet.id)}
            onPointerEnter={hold(true)}
            onPointerLeave={hold(false)}
            onFocus={hold(true)}
            onBlur={hold(false)}
            aria-label={`${planet.name} öffnen · ${planet.meta}`}
            data-testid={`world-planet-${planet.id}`}
          >
            {planet.orbit ? <PlanetOrbit away={slot && Math.cos(slot.angle) < 0 ? -1 : 1} orbit={planet.orbit} size={phone ? Math.max(52, slot?.size ?? 60) /* ×0,85 Tiefe ≥ 44px */ : (slot?.size ?? 60)} phone={phone} /> : null}
            {planet.traits ? <PlanetTraitsLayer traits={planet.traits} size={phone ? Math.max(52, slot?.size ?? 60) : (slot?.size ?? 60)} phone={phone} /> : null}
            <WorldPlanetSphere tone={planet.tone} className={`wd-tex-${planet.traits?.texture ?? 0}`} size={phone ? Math.max(52, slot?.size ?? 60) /* ×0,85 Tiefe ≥ 44px */ : (slot?.size ?? 60)}>
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
              <span className="wd-counter" data-testid="world-count-nodes">{counts.nodes} Elemente</span>
              <span className="wd-counter" data-testid="world-count-edges">{counts.edges} Verbindungen</span>
            </div>
          ) : null}
          <details className="wd-legend" data-testid="world-legend">
            <summary aria-label="Was die Zeichen bedeuten">i</summary>
            <ul>
              <li><i className="lg-ring" />Ring: je mehr Ordner, desto weiter</li>
              <li><i className="lg-atmo" />Leuchten: Aktivität der letzten 7 Tage</li>
              <li><i className="lg-aurora" />Polarlicht: überfällige Aufgaben</li>
              <li><i className="lg-spark" />Funkeln: offene Aufgaben</li>
              <li><i className="lg-comet" />Komet: neue Mail</li>
            </ul>
          </details>
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

/**
 * Positionen der Quellen auf der oberen Hälfte des äußeren Rings. Liegt ein Planet
 * (samt Label) zu nah, rückt die Quelle seitlich aus – Beschriftungen überlappen nicht.
 */
export function sourcePositions(layout: OrbitLayout, n: number, planets: { x: number; y: number }[], minDist = 130, rects: Rect[] = []) {
  const ring = sourceRing(layout);
  const at = (a: number) => ({ x: layout.cx + Math.cos(a) * ring.rx, y: layout.cy + Math.sin(a) * ring.ry });
  // Mit Rechtecken (Planet, Name, Mondbogen) prüft die Quelle echte Kollisionen statt nur Abstand.
  const R = 26;
  const clear = (a: number) => {
    const q = at(a);
    if (rects.length) return rects.every((r) => q.x + R < r.x0 || q.x - R > r.x1 || q.y + R < r.y0 || q.y - R > r.y1);
    return planets.every((p) => Math.hypot(q.x - p.x, q.y - p.y) >= minDist);
  };
  const used: number[] = [];
  return Array.from({ length: n }, (_, i) => {
    const base = Math.PI + (Math.PI * (i + 1)) / (n + 1);
    let best = base;
    for (let step = 0; step <= 12; step++) {
      const cands = step === 0 ? [base] : [base - step * 0.05, base + step * 0.05];
      const hit = cands.find((a) => a > Math.PI * 1.04 && a < Math.PI * 1.96 && clear(a) && used.every((u) => Math.abs(u - a) > 0.3));
      if (hit !== undefined) { best = hit; break; }
    }
    used.push(best);
    return { ...at(best), angle: best };
  });
}

export function sourceRing(layout: OrbitLayout) {
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
/** `away`: +1 liegt der Planet rechts der Mitte, −1 links – Monde rücken von der Verbindungslinie zur Mitte weg. */
/** Mondradius wächst mit der Wurzel der Inhalte – leer klein, voll deutlich, nie größer als ein Planetendetail. */
/** Sanft gebogene Lichtbahn statt gerader Speiche (Kontrollpunkt seitlich, 14 % der Länge). */
function arc(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
  const k = 0.14;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${(mx - dy * k).toFixed(1)},${(my + dx * k).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

/** Besonderheiten eines Planeten, nur aus Daten: Ring (Ordner), Atmosphäre (Aktivität), Polarlicht (überfällig), Funkeln (offen). */
export function PlanetTraitsLayer({ traits, size, phone }: { traits: PlanetTraits; size: number; phone: boolean }) {
  const r = size / 2;
  const ringK = traits.folders ? 1.22 + Math.min(traits.folders, 8) * 0.045 : 0; // max ≈ 1,58 × Radius: bleibt innerhalb der Mondbahn
  const sparks = Math.min(traits.open, phone ? 3 : 6);
  return (
    <span className="wd-traits" aria-hidden style={{ ['--atmo' as string]: traits.activity.toFixed(2) } as React.CSSProperties} data-testid="world-planet-traits">
      {traits.activity > 0 ? <span className="wd-atmo" style={{ width: size, height: size, marginLeft: -r, marginTop: -r }} /> : null}
      {traits.overdue ? <span className="wd-aurora" style={{ width: size * 1.18, height: size * 1.18, marginLeft: -size * 0.59, marginTop: -size * 0.59 }} data-testid="world-aurora" /> : null}
      {ringK ? (
        <svg className="wd-ring" width={size * 3.4} height={size * 3.4} style={{ marginLeft: -size * 1.7, marginTop: -size * 1.7 }} viewBox={`${-size * 1.7} ${-size * 1.7} ${size * 3.4} ${size * 3.4}`}>
          <ellipse rx={r * ringK} ry={r * ringK * 0.28} transform="rotate(-14)" strokeWidth={Math.min(3.2, 0.8 + traits.folders * 0.3)} />
          {traits.folders > 4 ? <ellipse className="wd-ring__outer" rx={r * (ringK + 0.12)} ry={r * (ringK + 0.12) * 0.28} transform="rotate(-14)" /> : null}
        </svg>
      ) : null}
      {Array.from({ length: sparks }, (_, i) => {
        const a = -2.4 + (i * 4.8) / Math.max(1, sparks) + 0.3;
        const d = r + (phone ? 9 : 14) + (i % 2) * 5;
        return <span key={i} className="wd-spark" style={{ transform: `translate(${(Math.cos(a) * d).toFixed(1)}px, ${(Math.sin(a) * d).toFixed(1)}px)`, animationDelay: `${(i * 0.7) % 3}s` }} />;
      })}
    </span>
  );
}

const moonR_ = (n: number, base: number) => Math.round((base / 2) * (0.55 + Math.min(1, Math.sqrt(n) / 4)) * 10) / 10;

export function PlanetOrbit({ orbit, size, phone, away = 1 }: { orbit: WorldOrbit; size: number; phone: boolean; away?: 1 | -1 }) {
  const moons = orbit.moons.slice(0, phone ? 3 : MAX_MOONS); // Handy-Lite: höchstens drei Monde
  const stars = orbit.stars.slice(0, MAX_STARS);
  if (!moons.length && !stars.length) return null;
  const r0 = size / 2;
  const moonR = r0 + (phone ? 22 : 34);
  const starR = r0 + (phone ? 14 : 20);
  const moonSize = phone ? 7 : 14;
  const box = (moonR + 26) * 2;
  const c = box / 2;
  // Monde oben verteilt (Label darunter bleibt frei), Sterne gleichmäßig rundherum.
  const moonAt = (i: number, n: number) => {
    if (phone) { // Handy-Lite: kleine Monde seitlich nach außen, frei von Namen oben/unten
      const a = (away > 0 ? 0 : Math.PI) + (n === 1 ? 0 : (-0.5 + i / Math.max(1, n - 1)) * away);
      const rr = r0 + 11;
      return { x: c + Math.cos(a) * rr, y: c + Math.sin(a) * rr, a };
    }
    const a = -Math.PI / 2 + away * (n === 1 ? 0.7 : 0.4) + (n === 1 ? 0 : (-1.1 + (2.2 * i) / Math.max(1, n - 1)));
    return { x: c + Math.cos(a) * moonR, y: c + Math.sin(a) * moonR, a };
  };
  // Sterne nur auf dem Bogen ohne Beschriftung: unten (wo das Label steht) bleibt ein Sektor frei,
  // damit keine Leuchtlinie den Namen kreuzt.
  const starAt = (i: number, n: number) => {
    const gap = 1.3; // freier Sektor um die Label-Seite (rad)
    const span = 2 * Math.PI - 2 * gap;
    const a = Math.PI / 2 + gap + (n === 1 ? span / 2 : (span * i) / (n - 1));
    return { x: c + Math.cos(a) * starR, y: c + Math.sin(a) * starR };
  };
  return (
    <span className="wd-orbit" style={{ width: box, height: box, marginLeft: -box / 2, marginTop: -box / 2 }} aria-hidden data-testid="world-planet-orbit">
      <svg width={box} height={box}>
        {/* Monde: dasselbe matte Steinmaterial wie die Planeten, eine Stufe dunkler, warmes Licht oben links. */}
        <defs>
          <radialGradient id="wd-moon-stone" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#7c9a84" /><stop offset="35%" stopColor="#3f6656" /><stop offset="75%" stopColor="#1d3a31" /><stop offset="100%" stopColor="#0c1c17" />
          </radialGradient>
        </defs>
        {moons.map((m, i) => {
          const p = moonAt(i, moons.length);
          const sub = m.stars.slice(0, MAX_STARS);
          return (
            <g key={m.id}>
              <line className="wd-sublink" x1={c + Math.cos(p.a) * r0} y1={c + Math.sin(p.a) * r0} x2={p.x} y2={p.y} />
              {/* Ein Mond ist ein Ordner: Größe = Anzahl Inhalte, ein Jade-Schimmer = offene Aufgaben darin. */}
              <circle className="wd-moondot" data-tasks={sub.some((st) => st.kind === 'task' && !st.done) ? 'true' : undefined} cx={p.x} cy={p.y} r={moonR_(m.stars.length, moonSize)} />
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
        // Steht das Planeten-Label oben (hintere Bahn), wird das Netz gespiegelt (CSS) – das Mond-Label wandert dann unter den Punkt.
        const vars = { left: p.x, '--mt': `${p.y - moonSize / 2 - 4}px`, '--mb': `${box - p.y + moonSize / 2 + 4}px` } as React.CSSProperties;
        return <span key={m.id} className="wd-moonlabel" style={vars}>{m.label}{m.stars.length ? ` · ${m.stars.length}` : ''}</span>;
      }) : null}
      {orbit.moons.length > MAX_MOONS ? <span className="wd-moremoons">+{orbit.moons.length - MAX_MOONS}</span> : null}
    </span>
  );
}
