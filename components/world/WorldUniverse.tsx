'use client';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { type SpiritMood } from './MoraSpirit';
import { JadeMora } from './JadeMora';
import type { PixelMoraProps } from './PixelMora';

/** Adapter: Rollback auf die alte Figur = Default unten wieder auf MoraSpirit setzen. */
export type SpiritFigureProps = PixelMoraProps;
import type { PlanetTraits, WorldOrbit, WorldPlanet } from '@/lib/lea/world';
import { localISO, relDay, shortDate } from '@/lib/lea/world';
import type { HorizonSource } from '@/lib/lea/useHorizonSources';
import { COLLECT_PLANET } from '@/lib/lea/finder';
import { glassLayout } from '@/lib/universe/glassLayout';
import { GlassOrb, glassVariantFor } from './GlassOrb';
import { floatOffset, labelWidth, layoutOrbits, placeOnOrbit, planetFootprint, type OrbitLayout, type Rect } from '@/lib/universe/worldOrbits';
import { WorldPlanetSphere } from './WorldPlanetSphere';
import { PixelMoon, PX } from './PixelPlanet';
import { seedOf, type PlanetKind } from '@/lib/universe/pixelArt';
import { toneSlot } from '@/lib/universe/matteTone';

const VIEW_KEY = 'mora.universe.view';
/** MÔRA besucht einen Planeten, ohne sich dahinter zu verstecken: sie bleibt am Rand stehen (Planetenradius + ihr Radius + Luft). */
/** MÔRA im Universe: 18 % kleiner als die Layout-Fläche (schwebt frei, die Fläche für Kollisionen bleibt gleich). */
const MORA_FREE = 0.82;
/** Glas-Ansicht: MÔRA steht über der Quellenreihe im freien Raum unter den Planeten, nicht auf ihr. */
const MORA_LIFT = 0; const MORA_LIFT_PHONE = 0;

/**
 * Glas-Ansicht, Überblick: die Quellenmarken stehen in einer Reihe unter MÔRA, von der Mitte nach außen,
 * und weichen Planeten samt Beschriftung aus (kein Überlappen).
 */
function glassSourcePoints(layout: OrbitLayout, count: number, names: string[]): { x: number; y: number; angle: number }[] {
  const y = layout.cy + layout.mora / 2 + 44;
  const boxes = layout.slots.map((sl, i) => { const w = Math.max(sl.size, labelWidth(names[i] ?? '', false, layout.scale)) + 24; const px = sl.pos?.x ?? layout.cx; const py = sl.pos?.y ?? layout.cy; return { l: px - w / 2, r: px + w / 2, t: py - sl.size / 2 - 14, b: py + sl.size / 2 + 90 }; });
  const placed: number[] = [];
  const out: { x: number; y: number; angle: number }[] = [];
  const W = 112; // Breite einer Marke samt Luft
  for (let i = 0; i < count; i++) {
    let x = layout.cx + (i % 2 ? 1 : -1) * (layout.mora / 2 + 70 + Math.floor(i / 2) * W);
    for (let k = 0; k < 40; k++) {
      const hit = boxes.some((b) => x + W / 2 > b.l && x - W / 2 < b.r && y + 26 > b.t && y - 26 < b.b) || placed.some((q) => Math.abs(q - x) < W);
      if (!hit) break;
      x += (i % 2 ? 1 : -1) * 16;
    }
    placed.push(x);
    out.push({ x, y, angle: 0 });
  }
  return out;
}

function stopShort(layout: { cx: number; cy: number; mora: number }, pp: { x: number; y: number }, size: number): { x: number; y: number } {
  const dx = pp.x - layout.cx; const dy = pp.y - layout.cy; const d = Math.hypot(dx, dy);
  if (d < 1) return { x: dx, y: dy };
  const k = Math.max(0, d - (size / 2 + layout.mora / 2 + 6)) / d;
  return { x: dx * k, y: dy * k };
}


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
const ASK_RESERVE_DESKTOP = 160; // + eine Zeile für MÔRAs Satz direkt über der Eingabe

/** Phone: Luft unter dem Seitenkopf, damit obere Planetenlabels ihn nicht berühren. */
const PHONE_TOP = 26;
/** Ab dieser Fensterbreite stehen Karten links und Horizont/Fokus rechts (siehe world.css, 1279px). */
const SIDE_COLUMNS_MIN_VW = 1280;
/** Karten links: left 88 px + 248 px Breite + 16 px Luft. */
export const PULSE_RESERVE = 268;
/** Horizont rechts: right 20 px + 260 px + 16 px Luft. */
export const HORIZON_RESERVE = 288;
/** Planeten-Fokus rechts: right 24 px + 340 px + 16 px Luft. */
export const FOCUS_RESERVE = 380;

export function WorldUniverse({ planets, phone, hidden = false, onOpenPlanet, onZoomPlanet, onMora, moraLine, activeId = null, selectedId = null, pulseIds, moraState = 'idle', details = true, moraInScene = true, onToggleDetails, zoomTo = null, reserveRight = 0, counts, sources = null, onOpenSource, comet = null, spiritMood = 'idle', spiritTarget = null, spiritCaption = null, SpiritFigure = JadeMora }: {
  spiritMood?: SpiritMood;
  /** Ruhe-Ansicht: false blendet Zähler, Quellenmarken, Karten und Zoom aus; true zeigt sie (auf Wunsch). */
  details?: boolean;
  onToggleDetails?: () => void;
  /** Planet-ID oder 'mail': MÔRA fliegt kurz dorthin. */
  spiritTarget?: string | null;
  /** Live step of MÔRA (small, calm text next to her). */
  spiritCaption?: string | null;
  /** Pluggable MÔRA figure: same props as MoraSpirit, so a new look can drop in. */
  SpiritFigure?: React.ComponentType<SpiritFigureProps>;
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
  /** Rechts belegte Breite (Horizont oder Planeten-Fokus): das Layout weicht aus, statt zu schrumpfen. */
  reserveRight?: number;
  /** Quellen-Ring (Systemplaneten aus /v3/universe): verbunden oder noch leer. */
  sources?: HorizonSource[] | null;
  onOpenSource?: (key: string) => void;
  moraLine?: string;
  /** false: MÔRA lebt nur im Dock; in der Szene gibt es keine Figur, keine Sprechblase, keine Schritt-Zeile. */
  moraInScene?: boolean;
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
  const [size, setSize] = useState({ width: 0, height: 0, wide: false });
  const reduced = !!useReducedMotion();
  const paused = useRef(false);
  const [zoom, setZoom] = useState(1);
  // Pixel-Ansicht (Standard am Rechner) oder „Gesamtansicht“: dieselben Daten ohne Pixel-Look.
  const [view, setView] = useState<'pixel' | 'full'>('pixel');
  useEffect(() => { try { if (localStorage.getItem(VIEW_KEY) === 'full') setView('full'); } catch { /* ohne Speicher: Standard */ } }, []);
  // „pixel“ heißt im Speicher weiter so (Standard); gemeint ist die Glas-Ansicht.
  const glass = view === 'pixel';
  const toggleView = () => setView((v) => { const n = v === 'pixel' ? 'full' : 'pixel'; try { localStorage.setItem(VIEW_KEY, n); } catch { /* egal */ } return n; });

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight, wide: typeof window !== 'undefined' && window.innerWidth >= SIDE_COLUMNS_MIN_VW });
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const showPulse = details && !phone && size.wide && hasPulse(planets);
  const insetLeft = showPulse ? PULSE_RESERVE : 0;
  const insetRight = !phone && size.wide ? reserveRight : 0;
  const layout: OrbitLayout | null = useMemo(
    () => {
      if (!size.width || !size.height) return null;
      const height = Math.max(200, size.height - (phone ? ASK_RESERVE_PHONE + PHONE_TOP : ASK_RESERVE_DESKTOP + (size.width < 1000 ? 40 : 0)));
      const labels = planets.map((p) => ({ name: p.name, meta: p.meta, moons: p.orbit?.moons.length ?? 0, stars: p.orbit?.stars.length ?? 0 }));
      const weights = planets.map((p) => p.weight);
      const focusIndex = planets.reduce((best, p, i) => p.id === COLLECT_PLANET ? best
        : best < 0 || p.weight > planets[best].weight ? i : best, -1);
      return glass
        ? glassLayout({ width: size.width, insetLeft, insetRight, height, weights, phone, labels, reserveMora: moraInScene, focusIndex })
        : layoutOrbits({ width: size.width, insetLeft, insetRight, height, weights, phone, labels });
    },
    [size.width, size.height, planets, phone, insetLeft, insetRight, glass, moraInScene],
  );

  const place = useCallback((t: number) => {
    if (!layout) return;
    layout.slots.forEach((slot, i) => {
      const el = planetRefs.current[i];
      if (!el) return;
      const p = placeOnOrbit(layout, slot);
      const { dx, dy } = floatOffset(i, glass ? t * 0.6 : t);
      el.style.transform = `translate3d(${(p.x + dx).toFixed(2)}px, ${(p.y + dy).toFixed(2)}px, 0) translate(-50%, -50%) scale(${p.front ? 1 : 0.85})`;
      el.style.zIndex = String(p.z);
      el.dataset.depth = p.front ? 'front' : 'back';
    });
  }, [layout, glass]);

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
  const spiritPoint = (() => {
    if (!layout || !spiritTarget || glass || phone) return null; // Glas-Ansicht: MÔRA bleibt fest unten in der Mitte
    if (spiritTarget === 'mail') return { x: size.width * 0.35, y: -size.height * 0.3 };
    const k = planets.findIndex((p) => p.id === spiritTarget); const sl = k >= 0 ? layout.slots[k] : null; const pp = sl ? placeOnOrbit(layout, sl) : null;
    return pp && sl ? stopShort(layout, pp, sl.size + (planets[k].orbit?.moons.length ? 40 : 0)) : null;
  })();
  // MÔRAs Ziele: Planeten relativ zur Mitte, gewichtet nach echter Aktivität / offenen Punkten.
  const roam = layout ? planets.flatMap((p, k) => { const sl = layout.slots[k]; const pp = sl ? placeOnOrbit(layout, sl) : null; const t = p.traits;
    const rs = sl ? sl.size + (p.orbit?.moons.length ? 40 : 0) : 0;
    return pp && sl ? [{ id: p.id, r: rs / 2, px: pp.x - layout.cx, py: pp.y - layout.cy, ...stopShort(layout, pp, rs), weight: 0.5 + Math.min(4, (t?.activity ?? 0) + (t?.open ?? 0) * 0.5 + (t?.overdue ?? 0)) }] : []; }) : [];
  const zoomIdx = zoomTo ? planets.findIndex((p) => p.id === zoomTo) : -1;
  const zoomPt = layout && zoomIdx >= 0 && layout.slots[zoomIdx] ? placeOnOrbit(layout, layout.slots[zoomIdx]) : null;
  const camera: React.CSSProperties | undefined = zoomPt
    ? { transformOrigin: `${zoomPt.x}px ${zoomPt.y}px`, transform: 'scale(2.6)', opacity: 0, filter: 'blur(2px)' }
    : zoom === 1 ? undefined : { transform: `scale(${zoom})` };

  return (
    <div ref={fieldRef} className="wd-universe" data-testid="world-universe" data-view={glass ? 'glass' : 'full'} data-phone={phone ? 'true' : 'false'} data-large={layout && layout.scale >= 1.2 ? 'true' : 'false'} data-hidden={hidden ? 'true' : 'false'} aria-hidden={hidden || undefined} onPointerMove={onPointerMove} data-camera={zoomPt ? 'zooming' : undefined} data-compact={layout?.compact ? 'true' : undefined}>
      {glass ? null : (<>
      <div className="wd-parallax wd-parallax--far" aria-hidden />
      <div className="wd-parallax wd-parallax--mid" aria-hidden />
      <div className="wd-parallax wd-parallax--near" aria-hidden />
      </>)}
      {layout && !glass ? <div className="wd-galaxy" aria-hidden style={{ left: layout.cx, top: layout.cy }}><i /><b /><em className="wd-neb wd-neb--a" /><em className="wd-neb wd-neb--b" /><em className="wd-neb wd-neb--c" /><s className="wd-dust" /></div> : null}
      {comet ? <span key={comet.id} className="wd-comet" aria-hidden data-testid="world-comet" title={`Neue Mail: ${comet.label}`} /> : null}
      <div className="wd-zoomwrap" style={camera} data-testid="world-zoomwrap">
      {layout && !glass ? (
        <svg className="wd-orbits" width={size.width} height={size.height} aria-hidden>
          {layout.rings.map((r, i) => <ellipse key={i} cx={layout.cx} cy={layout.cy - (layout.ringDy ?? 0)} rx={r.rx} ry={r.ry} />)}
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
      {layout && details && sources?.length ? (() => {
        const rects = layout.slots.flatMap((sl, i) => planetFootprint(layout, sl, planets[i] ? { name: planets[i].name, meta: planets[i].meta, moons: planets[i].orbit?.moons.length ?? 0, stars: planets[i].orbit?.stars.length ?? 0 } : undefined, phone));
        // Glas-Ansicht: die Quellen sitzen als kleine Marken links und rechts neben MÔRA, ohne Ring.
        const pts = glass
          ? glassSourcePoints(layout, sources.length, planets.map((p) => p.name))
          : sourcePositions(layout, sources.length, layout.slots.map((sl) => placeOnOrbit(layout, sl)), 130, rects);
        return sources.map((src, i) => {
        const { x, y } = pts[i];
        return (
          <button key={src.key} type="button" className={glass ? 'wd-source wd-source--glass' : 'wd-source'} data-state={src.state} style={{ left: x, top: y }} onClick={() => onOpenSource?.(src.key)}
            title={src.state === 'connected' ? `${src.label}: ${src.sources.join(', ')}` : `${src.label}: noch keine Quelle verbunden`} data-testid={`world-source-${src.key.replace('system:', '')}`}>
            <i aria-hidden />
            <span>{src.label}</span>
            <small>{src.state === 'connected' ? 'verbunden' : 'noch leer'}</small>
          </button>
        );
      });
      })() : null}

      {layout && moraInScene ? (
        <button
          type="button"
          className="wd-mora"
          data-state={moraState}
          data-spirit={spiritMood}
          style={{ left: glass ? Math.round(layout.cx / 2) * 2 : layout.cx, top: glass ? Math.round(layout.cy / 2) * 2 - (phone ? MORA_LIFT_PHONE : MORA_LIFT) : layout.cy, width: layout.mora, height: layout.mora, '--m': `${layout.mora}px`, zIndex: 10 + Math.round(layout.cy) } as React.CSSProperties}
          onClick={onMora}
          aria-label="MÔRA öffnen"
          data-testid="world-mora"
        >
          {/* Adapter: positions the unchanged figure; the figure itself only draws. */}
          <span className="wd-mora-glide" data-testid="world-mora-glide" style={{ transform: `translate(${Math.round(spiritPoint?.x ?? 0)}px, ${Math.round(spiritPoint?.y ?? 0)}px)`, transition: reduced ? 'none' : undefined }}>
            <SpiritFigure bare={glass && SpiritFigure !== JadeMora} size={glass ? Math.round(layout.mora * MORA_FREE) : phone ? 80 : 75} mood={spiritMood} phone={phone} reduced={reduced} target={spiritPoint} roam={glass || phone ? [] : roam} fresh={pulseIds?.[0] ?? null} />
          </span>
        </button>
      ) : null}
      {layout && moraInScene && spiritCaption ? (
        <div className="wd-mora-step" role="status" aria-live="polite" data-testid="world-mora-step"
          style={{ left: layout.cx + (spiritPoint?.x ?? 0), top: layout.cy + (spiritPoint?.y ?? 0) - (phone ? 30 : 46), zIndex: 400 }}>
          <span className="wd-mora-step__who">MÔRA</span>{spiritCaption}
        </div>
      ) : null}
      {layout && moraInScene && moraLine ? (
        // MÔRAs Satz direkt über der Eingabe, unterhalb der Bahnen: verdeckt weder Planeten noch Beschriftungen.
        <button type="button" className="wd-mora-line" style={phone ? { left: layout.cx, top: 16 } : { left: layout.cx, top: 'auto', bottom: 112 }} onClick={onMora} data-testid="world-mora-line">
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
            data-collect={planet.id === COLLECT_PLANET ? 'true' : undefined}
            aria-pressed={planet.id === selectedId}
            onDoubleClick={onZoomPlanet ? () => onZoomPlanet(planet.id) : undefined}
            style={slot ? undefined : { visibility: 'hidden' }}
            onClick={() => onOpenPlanet(planet.id)}
            onPointerEnter={hold(true)}
            onPointerLeave={hold(false)}
            onFocus={hold(true)}
            onBlur={hold(false)}
            aria-label={`${planet.name} öffnen · ${planet.meta}${planet.traits?.overdue ? ` · ${planet.traits.overdue} überfällig` : ''}${planet.traits?.open ? ` · ${planet.traits.open} offen` : ''}${planet.traits?.nextTask ? ` · nächste Aufgabe: ${planet.traits.nextTask.title}` : ''}`}
            data-testid={`world-planet-${planet.id}`}
            data-side={slot && Math.cos(slot.angle) < -0.05 ? 'left' : 'right'}
          >
            {glass ? (
              <GlassOrb size={slot?.size ?? 80} variant={glassVariantFor(planet.name)} material="rnd">
                {planet.moons.length ? <span className="wd-badge" aria-hidden>{planet.moons.length}</span> : null}
                {pulseIds?.includes(planet.id) ? <span className="wd-glass-pulse" data-testid={`world-pulse-${planet.id}`} aria-hidden /> : null}
              </GlassOrb>
            ) : (() => {
              const sz = phone ? Math.max(52, slot?.size ?? 60) /* ×0,85 Tiefe ≥ 44px */ : (slot?.size ?? 60);
              const tr = planet.traits;
              const light = slot ? { x: -Math.cos(slot.angle), y: -Math.sin(slot.angle) } : { x: -0.6, y: -0.6 };
              return (
                <>
                  {planet.orbit ? <PlanetOrbit tone={planet.tone?.vars} away={slot && Math.cos(slot.angle) < 0 ? -1 : 1} orbit={planet.orbit} size={sz} phone={phone} /> : null}
                  {planet.traits ? <PlanetTraitsLayer traits={planet.traits} size={sz} phone={phone} /> : null}
                  <WorldPlanetSphere light={slot ? light : undefined} tone={planet.tone} className={`wd-tex-${tr?.texture ?? 0}`} size={sz}>
                    {planet.moons.length ? <span className="wd-badge" aria-hidden>{planet.moons.length}</span> : null}
                  </WorldPlanetSphere>
                </>
              );
            })()}
            <span className="wd-label">
              <span className="wd-name">{planet.name}</span>
              <span className="wd-meta">{planet.meta}</span>
              <PlanetInfoLine traits={planet.traits} phone={phone} />
            </span>
            {!phone && planet.traits ? <PlanetTip traits={planet.traits} /> : null}
            {planet.id === activeId ? <span className="wd-active-tag" data-testid="world-active-tag">Aktiver Bereich</span> : null}
          </button>
        );
      })}
      </div>
      {layout && showPulse ? <WorldPulse planets={planets} onOpen={onOpenPlanet} /> : null}
      {layout && onToggleDetails ? (
        <button type="button" className="wd-details" aria-pressed={details} onClick={onToggleDetails} data-testid="world-details-toggle" title={details ? 'Überblick ausblenden' : 'Überblick, Zähler und Quellen einblenden'}>
          <i aria-hidden />{details ? 'Ruhig' : 'Überblick'}
        </button>
      ) : null}
      {layout && !phone && details ? (
        <>
          {counts ? (
            <div className="wd-counters" aria-label="Zähler">
              <span className="wd-counter" title="Alles im Raum: MÔRA, Abteilungen, Ordner und Einträge" data-testid="world-count-nodes">{counts.nodes} Elemente</span>
              <span className="wd-counter" title="Linien zwischen Abteilung, Ordner und Eintrag" data-testid="world-count-edges">{counts.edges} Verbindungen</span>
            </div>
          ) : null}
          {glass ? null : <details className="wd-legend" data-testid="world-legend">
            <summary aria-label="Was die Zeichen bedeuten">i</summary>
            <ul>
              <li><i className="lg-ring" />Ring: je mehr Ordner, desto weiter</li>
              <li><i className="lg-atmo" />Leuchten: Aktivität der letzten 7 Tage</li>
              <li><i className="lg-aurora" />Polarlicht: überfällige Aufgaben</li>
              <li><i className="lg-spark" />Funkeln: offene Aufgaben</li>
              <li><i className="lg-comet" />Komet: neue Mail</li>
            </ul>
          </details>}
          <button type="button" className="wd-view" aria-pressed={!glass} onClick={toggleView} data-testid="world-view-toggle" title={glass ? 'Dieselben Abteilungen mit Bahnen und Linien' : 'Zurück zur ruhigen Glas-Ansicht'}>
            <i aria-hidden />{glass ? <>Gesamtansicht<small>mit Bahnen</small></> : 'Glas-Ansicht'}
          </button>
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

export function PlanetOrbit({ orbit, size, phone, away = 1, tone, pixel }: { orbit: WorldOrbit; size: number; phone: boolean; away?: 1 | -1; tone?: Record<string, string>; pixel?: { kind: PlanetKind; light: { x: number; y: number }; seed: number } }) {
  // Je Planet ein eigener Verlauf: Monde tragen den Farbton ihres Planeten (CSS-Variablen --m-*).
  const gid = `wd-moon-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
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
    <span className="wd-orbit" style={{ ...(tone as React.CSSProperties), width: box, height: box, marginLeft: -box / 2, marginTop: -box / 2 }} aria-hidden data-testid="world-planet-orbit">
      <svg width={box} height={box}>
        {/* Monde: dasselbe matte Steinmaterial wie die Planeten, eine Stufe dunkler, warmes Licht oben links. */}
        <defs>
          <radialGradient id={gid} cx="35%" cy="30%" r="75%">
            <stop offset="0%" style={{ stopColor: 'var(--p-hi, #7c9a84)' }} /><stop offset="35%" style={{ stopColor: 'var(--p-base, #3f6656)' }} /><stop offset="75%" style={{ stopColor: 'var(--p-shadow, #1d3a31)' }} /><stop offset="100%" style={{ stopColor: 'var(--p-deep, #0c1c17)' }} />
          </radialGradient>
        </defs>
        {moons.map((m, i) => {
          const p = moonAt(i, moons.length);
          const sub = m.stars.slice(0, MAX_STARS);
          return (
            <g key={m.id}>
              <line className="wd-sublink" x1={c + Math.cos(p.a) * r0} y1={c + Math.sin(p.a) * r0} x2={p.x} y2={p.y} />
              {/* Ein Mond ist ein Ordner: Größe = Anzahl Inhalte, ein Jade-Schimmer = offene Aufgaben darin. */}
              {pixel ? null : <circle className="wd-moondot" style={{ fill: `url(#${gid})` }} data-tasks={sub.some((st) => st.kind === 'task' && !st.done) ? 'true' : undefined} cx={p.x} cy={p.y} r={moonR_(m.stars.length, moonSize)} />}
            </g>
          );
        })}
        {stars.map((st, i) => {
          const p = starAt(i, stars.length);
          if (pixel) { const q = Math.round(p.x / PX) * PX, w = Math.round(p.y / PX) * PX; return <g key={st.id}><line className="wd-sublink wd-sublink--star" x1={c} y1={c} x2={p.x} y2={p.y} /><rect className="wd-stardot" data-kind={st.kind} data-overdue={st.overdue ? 'true' : undefined} data-done={st.done ? 'true' : undefined} x={q - PX} y={w - PX} width={PX * 2} height={PX * 2} /></g>; }
          return <g key={st.id}><line className="wd-sublink wd-sublink--star" x1={c} y1={c} x2={p.x} y2={p.y} /><circle className="wd-stardot" data-kind={st.kind} data-overdue={st.overdue ? 'true' : undefined} data-done={st.done ? 'true' : undefined} cx={p.x} cy={p.y} r={phone ? 2.4 : 3.2} /></g>;
        })}
      </svg>
      {pixel ? <span className="wd-pxmoons" style={{ width: box, height: box }}>{moons.map((m, i) => {
        const p = moonAt(i, moons.length);
        const r = moonR_(m.stars.length, moonSize);
        return <PixelMoon key={m.id} kind={pixel.kind} d={Math.max(7, Math.round((2 * r) / PX) + 4)} seed={seedOf(m.id)} light={pixel.light} tasks={m.stars.some((st) => st.kind === 'task' && !st.done)} x={p.x} y={p.y} />;
      })}</span> : null}
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

/** Zweite Zeile unter dem Planetennamen – nur echte Werte, 0 wird nie gezeigt. Phone: ein Wert. */
export function PlanetInfoLine({ traits, phone }: { traits?: PlanetTraits; phone: boolean }) {
  if (!traits) return null;
  const parts: { k: string; t: string; warn?: boolean }[] = [];
  if (traits.overdue > 0) parts.push({ k: 'od', t: `${traits.overdue} überfällig`, warn: true });
  if (traits.open > 0) parts.push({ k: 'op', t: `${traits.open} offen` });
  if (traits.newMails) parts.push({ k: 'ml', t: `${traits.newMails} neue Mail${traits.newMails === 1 ? '' : 's'}` });
  const rel = relDay(traits.lastAt);
  if (rel) parts.push({ k: 'la', t: rel });
  const shown = phone ? parts.slice(0, 1) : parts;
  if (!shown.length) return null;
  return (
    <span className="wd-info" data-testid="world-planet-info">
      {shown.map((p, i) => <span key={p.k} className={p.warn ? 'wd-info__warn' : undefined}>{i ? ' · ' : ''}{p.t}</span>)}
    </span>
  );
}

/** Kleine Glaskarte bei Hover/Fokus: nächste Aufgabe, neuester Eintrag – nur wenn vorhanden. */
export function PlanetTip({ traits }: { traits: PlanetTraits }) {
  const rows: [string, string][] = [];
  if (traits.nextTask) rows.push(['Nächste Aufgabe', traits.nextTask.title + (traits.nextTask.due ? ` · ${shortDate(traits.nextTask.due)}` : '')]);
  if (traits.latest) rows.push(['Zuletzt', traits.latest + (relDay(traits.lastAt) ? ` · ${relDay(traits.lastAt)}` : '')]);
  // Nur echte Zuordnung aus CORE (Mail-Knoten im Bereich); sonst keine Zeile.
  if (traits.newMails) rows.unshift(['Post', `${traits.newMails} neu${traits.unreadMails ? ` · ${traits.unreadMails} ungelesen` : ''}`]);
  if (traits.overdue > 0) rows.push(['Überfällig', `${traits.overdue} Aufgabe${traits.overdue === 1 ? '' : 'n'}`]);
  if (!rows.length) return null;
  return (
    <span className="wd-tip" aria-hidden data-testid="world-planet-tip">
      {rows.slice(0, 3).map(([k, v]) => <span key={k} className="wd-tip__row"><span className="wd-tip__k">{k}</span><span className="wd-tip__v">{v}</span></span>)}
    </span>
  );
}

/**
 * Ruhige Glaskarten im leeren linken Feld – ausschließlich aus echten Planeten-Daten
 * (nächste offene Aufgaben aus /v3/tasks, letzte Änderungen aus /v3/nodes + /v3/files).
 * Ohne Daten erscheint die jeweilige Karte nicht.
 */
function pulseNext(planets: WorldPlanet[]) {
  return planets.filter((p) => p.traits?.nextTask);
}
function pulseRecent(planets: WorldPlanet[]) {
  return planets.filter((p) => p.traits?.lastAt && p.traits.latest);
}
/** Ob die Karten links erscheinen (dieselbe Regel wie in WorldPulse). */
export function hasPulse(planets: WorldPlanet[]): boolean {
  return pulseNext(planets).length > 0 || pulseRecent(planets).length > 0;
}

export function WorldPulse({ planets, onOpen }: { planets: WorldPlanet[]; onOpen: (id: string) => void }) {
  const next = pulseNext(planets)
    .map((p) => ({ id: p.id, planet: p.name, title: p.traits!.nextTask!.title, due: p.traits!.nextTask!.due, overdue: !!p.traits!.nextTask!.due && p.traits!.nextTask!.due! < localISO() }))
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
    .slice(0, 3);
  const recent = pulseRecent(planets)
    .map((p) => ({ id: p.id, planet: p.name, title: p.traits!.latest!, at: p.traits!.lastAt! }))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 3);
  if (!next.length && !recent.length) return null;
  return (
    <aside className="wd-pulse" aria-label="Überblick" data-testid="world-pulse">
      {next.length ? (
        <section className="wd-pulse__card" data-testid="world-pulse-next">
          <h3>Nächste Schritte</h3>
          <ul>{next.map((n) => (
            <li key={n.id}><button type="button" onClick={() => onOpen(n.id)}>
              <span className="wd-pulse__t">{n.title}</span>
              <span className="wd-pulse__m">{n.planet}{n.due ? <> · <span className={n.overdue ? 'wd-info__warn' : undefined}>{n.overdue ? 'überfällig seit ' : 'fällig '}{shortDate(n.due)}</span></> : null}</span>
            </button></li>
          ))}</ul>
        </section>
      ) : null}
      {recent.length ? (
        <section className="wd-pulse__card" data-testid="world-pulse-recent">
          <h3>Zuletzt bewegt</h3>
          <ul>{recent.map((r) => (
            <li key={r.id}><button type="button" onClick={() => onOpen(r.id)}>
              <span className="wd-pulse__t">{r.title}</span>
              <span className="wd-pulse__m">{r.planet} · {relDay(r.at)}</span>
            </button></li>
          ))}</ul>
        </section>
      ) : null}
    </aside>
  );
}
