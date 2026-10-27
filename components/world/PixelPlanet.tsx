'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { type Bitmap, type PlanetKind, makeStars, paintMoon, paintNebula, paintPlanet, paintStars, planetCanvasSize, planetGeometry } from '@/lib/universe/pixelArt';

/** Bildschirmpixel je Kunstpixel – immer ganzzahlig, nie skaliert, nie geglättet. */
export const PX = 2;
export const SKY_PX = 3;

function draw(canvas: HTMLCanvasElement | null, bm: Bitmap) {
  if (!canvas) return;
  const ctx = typeof ImageData === 'undefined' ? null : canvas.getContext?.('2d');
  if (!ctx) return; // jsdom: kein Canvas
  if (canvas.width !== bm.w) canvas.width = bm.w;
  if (canvas.height !== bm.h) canvas.height = bm.h;
  ctx.putImageData(new ImageData(bm.data as Uint8ClampedArray<ArrayBuffer>, bm.w, bm.h), 0, 0);
}

export interface PixelPlanetProps {
  kind: PlanetKind; size: number; seed: number; light: { x: number; y: number };
  folders?: number; activity?: number; overdue?: number; open?: number; reduced?: boolean;
}

/** Handgesetzter Pixelplanet je Abteilung: Oberfläche dreht sich in Stufen, Ring/Atmosphäre/Polarlicht/Funkeln kommen aus echten Daten. */
export function PixelPlanet({ kind, size, seed, light, folders, activity, overdue, open, reduced }: PixelPlanetProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const d = Math.max(14, Math.round(size / PX));
  const spec = useMemo(() => ({ kind, d, seed, light, folders, activity, overdue, open }), [kind, d, seed, light.x, light.y, folders, activity, overdue, open]); // eslint-disable-line react-hooks/exhaustive-deps
  const geo = useMemo(() => planetGeometry(spec), [spec]);
  const S = planetCanvasSize(spec);
  useEffect(() => {
    draw(ref.current, paintPlanet(spec, geo, 0));
    if (reduced) return;
    let f = 0;
    const id = window.setInterval(() => { if (document.hidden) return; f += 1; draw(ref.current, paintPlanet(spec, geo, f)); }, 1200);
    return () => window.clearInterval(id);
  }, [spec, geo, reduced]);
  const off = Math.round((size - S * PX) / 2);
  return <canvas ref={ref} className="wd-px wd-px--planet" aria-hidden data-testid="world-pixel-planet" data-kind={kind} style={{ width: S * PX, height: S * PX, left: off, top: off }} />;
}

/** Ein Ordner-Mond als kleiner Pixelkörper. (x, y) = Mittelpunkt in der Bahnbox. */
export function PixelMoon({ kind, d, seed, light, tasks, x, y }: { kind: PlanetKind; d: number; seed: number; light: { x: number; y: number }; tasks?: boolean; x: number; y: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bm = useMemo(() => paintMoon(kind, d, seed, light, tasks), [kind, d, seed, light.x, light.y, tasks]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { draw(ref.current, bm); }, [bm]);
  const px = bm.w * PX;
  return <canvas ref={ref} className="wd-px wd-px--moon" aria-hidden data-testid="world-pixel-moon" style={{ width: px, height: px, left: Math.round(x - px / 2), top: Math.round(y - px / 2) }} />;
}

/** Pixel-Himmel über den ganzen Bildschirm: Nebel (gedithert) + Sterne, 3 Bildschirmpixel je Kunstpixel; Twinkel-Ebene mit steps(). */
export function PixelSky({ reduced }: { reduced?: boolean }) {
  const neb = useRef<HTMLCanvasElement>(null);
  const st = useRef<HTMLCanvasElement>(null);
  const tw = useRef<HTMLCanvasElement>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    let id = 0;
    const read = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    read();
    const on = () => { window.clearTimeout(id); id = window.setTimeout(read, 160); };
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('resize', on); window.clearTimeout(id); };
  }, []);
  const w = Math.max(8, Math.ceil(vp.w / SKY_PX)), h = Math.max(8, Math.ceil(vp.h / SKY_PX));
  useEffect(() => {
    if (!vp.w || !vp.h) return;
    draw(neb.current, paintNebula(w, h));
    const stars = makeStars(w, h);
    draw(st.current, paintStars(w, h, stars, false));
    draw(tw.current, paintStars(w, h, stars, true));
  }, [w, h, vp.w, vp.h]);
  const style = { width: w * SKY_PX, height: h * SKY_PX };
  return (
    <div className="wd-sky" aria-hidden data-testid="world-pixel-sky" data-reduced={reduced ? 'true' : undefined}>
      <canvas ref={neb} className="wd-px" style={style} />
      <canvas ref={st} className="wd-px" style={style} />
      <canvas ref={tw} className="wd-px wd-sky__twinkle" style={style} />
    </div>
  );
}
