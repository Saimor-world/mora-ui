'use client';
import React, { useEffect, useRef } from 'react';

/** MÔRA-Status, nur aus echten Ereignissen abgeleitet (siehe LiveWorld). */
export type SpiritMood = 'idle' | 'listening' | 'thinking' | 'speaking' | 'flying' | 'waiting' | 'done' | 'error' | 'night';

export const SPIRIT_LABEL: Record<SpiritMood, string> = {
  idle: 'MÔRA ist da und ruhig.',
  listening: 'MÔRA hört zu.',
  thinking: 'MÔRA denkt nach.',
  speaking: 'MÔRA antwortet.',
  flying: 'MÔRA meldet neue Aktivität.',
  waiting: 'MÔRA wartet auf deine Freigabe.',
  done: 'MÔRA ist fertig.',
  error: 'MÔRA hat gerade keine Verbindung.',
  night: 'MÔRA ruht – es ist Nacht.',
};

/** Nacht nach lokaler Uhrzeit: 22–6 Uhr. */
export function isNight(d = new Date()) { const h = d.getHours(); return h >= 22 || h < 6; }

/**
 * Prozedurale MÔRA (Character Identity Kit v0.1): kleiner elfenbeinfarbener Lichtgeist mit S-Flammenspur,
 * Jade-Stein (echtes Asset mora-stone-v1.png) kreist auf goldenem Band. Canvas2D, ein rAF, gedeckelte Partikel.
 * Reduced Motion: eine ruhige, statische Pose.
 */
export function MoraSpirit({ size, mood, target, phone = false, reduced = false }: {
  size: number; mood: SpiritMood; target?: { x: number; y: number } | null; phone?: boolean; reduced?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const st = useRef({ mood, target, phone, reduced });
  st.current = { mood, target, phone, reduced };

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const W = size * 4, H = size * 4;
    const dpr = Math.min(2, window.devicePixelRatio || 1) * (phone ? 0.75 : 1);
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const stone = new Image(); stone.src = '/brand/mora-stone-v1.png';
    const MAXP = phone ? 8 : 18;
    const parts: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    const trail: { x: number; y: number }[] = [];
    const eye = { x: 0, y: 0, tx: 0, ty: 0 };
    let blinkAt = performance.now() + 5000, blink = 0;
    let pos = { x: 0, y: 0 }, orbitA = 0, raf = 0, last = performance.now(), dim = 1;
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1; const k = Math.min(1, d / 300);
      eye.tx = (dx / d) * k * 0.5; eye.ty = (dy / d) * k * 0.5;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    const s = size * 0.42; // Kopfradius-Basis

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const { mood: m, target: tg, reduced: rd } = st.current;
      const t = rd ? 1.2 : now / 1000;
      // Ziel: kurz zum Planeten mit neuer Aktivität, sonst Mitte.
      const goal = { x: 0, y: 0 }; void tg; // OS: Zustände über Licht und Stein, keine Posen
      pos.x += (goal.x - pos.x) * Math.min(1, dt * (m === 'flying' ? 2.4 : 1.6));
      pos.y += (goal.y - pos.y) * Math.min(1, dt * (m === 'flying' ? 2.4 : 1.6));
      const calm = m === 'waiting' || m === 'night' ? 0.35 : m === 'done' ? 0.6 : 1;
      const bob = rd ? 0 : Math.sin(t * 0.9) * s * 0.06 * calm;
      const breathe = 1 + (rd ? 0 : Math.sin(t * 0.9 + 0.6) * 0.018 * calm);
      const want = m === 'error' ? 0.4 : m === 'night' ? 0.5 : m === 'flying' || m === 'done' || m === 'listening' ? 1.25 : 1; dim += (want - dim) * Math.min(1, dt * 2);
      const cx = W / 2 + pos.x, cy = H / 2 + pos.y + bob;
      // Lichtfarbe: Kerzenlicht; Freigabe = Bernstein.
      const amber = m === 'waiting';
      const core = amber ? '247,214,160' : '247,233,203', edge = amber ? '214,150,70' : '233,185,103';
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      // Halo
      const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 3.4);
      hg.addColorStop(0, `rgba(${core},${0.30 * dim})`); hg.addColorStop(0.4, `rgba(${edge},${0.10 * dim})`); hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
      // S-Flammenspur: Verlauf der Position + S-Welle nach unten.
      trail.unshift({ x: cx, y: cy }); if (trail.length > 24) trail.pop();
      const N = 26;
      for (let i = 1; i < N; i++) {
        const f = i / N; const h = trail[Math.min(trail.length - 1, Math.floor(f * trail.length))] ?? { x: cx, y: cy };
        const sway = rd ? Math.sin(f * 5.4) : Math.sin(f * 5.4 - t * 2.2);
        const x = h.x + sway * s * 0.55 * f + (cx - h.x) * 0.2, y = h.y + s * 0.7 + f * s * 2.6;
        const r = s * (0.62 * (1 - f) + 0.04);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
        g.addColorStop(0, `rgba(${core},${0.22 * (1 - f) * dim})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, 7); ctx.fill();
      }
      // Partikel (gedeckelt)
      if (!rd && parts.length < MAXP && Math.random() < (m === 'thinking' ? 0.5 : 0.18) * dim) {
        parts.push({ x: cx + (Math.random() - 0.5) * s, y: cy + s * 0.8, vx: (Math.random() - 0.5) * 12, vy: 10 + Math.random() * 20, life: 1 });
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.x += p.vx * dt + Math.sin(t * 2 + i) * 0.3; p.y += p.vy * dt; p.life -= dt * 0.7;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(${core},${0.55 * p.life * dim})`; ctx.beginPath(); ctx.arc(p.x, p.y, 1.1, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      // Körper: runder, reduzierter Kopf, der weich in einen sich verjüngenden Leib übergeht – halbtransparentes Licht.
      const R = s * breathe;
      ctx.save(); ctx.shadowColor = `rgba(${edge},${0.8 * dim})`; ctx.shadowBlur = R * 0.9;
      // Leib: Tropfen nach unten, schwingt als S mit
      const sw = rd ? 0.3 : Math.sin(t * 1.4) * 0.35;
      const lg = ctx.createLinearGradient(cx, cy, cx, cy + R * 2.4);
      lg.addColorStop(0, `rgba(${core},${0.75 * dim})`); lg.addColorStop(1, `rgba(${edge},0)`);
      ctx.fillStyle = lg; ctx.beginPath();
      ctx.moveTo(cx - R * 0.62, cy + R * 0.3);
      ctx.bezierCurveTo(cx - R * 0.55, cy + R * 1.2, cx + R * (0.2 + sw), cy + R * 1.5, cx + R * (0.1 - sw), cy + R * 2.5);
      ctx.bezierCurveTo(cx + R * (0.6 + sw), cy + R * 1.6, cx + R * 0.7, cy + R * 1.0, cx + R * 0.62, cy + R * 0.3);
      ctx.fill();
      // Kopf
      const bg = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.3, R * 0.05, cx, cy, R);
      bg.addColorStop(0, `rgba(255,251,242,${0.96 * dim + 0.04})`); bg.addColorStop(0.6, `rgba(${core},${0.9 * dim + 0.05})`);
      bg.addColorStop(1, `rgba(${edge},${0.55 * dim})`);
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.86, R * 0.8, 0, 0, 7); ctx.fill();
      // Flammenspitze: S-Wisp aus dem Scheitel, weich (Glow statt harter Kante)
      const tip = rd ? 0 : Math.sin(t * 1.7) * R * 0.15;
      const fg = ctx.createLinearGradient(cx, cy - R * 0.6, cx + R * 0.6, cy - R * 1.9);
      fg.addColorStop(0, `rgba(${core},${0.85 * dim})`); fg.addColorStop(1, `rgba(${core},0)`);
      ctx.fillStyle = fg; ctx.beginPath();
      ctx.moveTo(cx - R * 0.5, cy - R * 0.55);
      ctx.bezierCurveTo(cx - R * 0.2, cy - R * 1.3, cx + R * 0.7 + tip, cy - R * 1.2, cx + R * 0.35 + tip, cy - R * 2.0);
      ctx.bezierCurveTo(cx + R * 1.0 + tip, cy - R * 1.3, cx + R * 0.6, cy - R * 0.9, cx + R * 0.45, cy - R * 0.55);
      ctx.fill(); ctx.restore();
      // Jade-Glanzlichter
      ctx.fillStyle = `rgba(169,221,196,${0.22 * dim})`; ctx.beginPath(); ctx.arc(cx - R * 0.55, cy - R * 0.3, R * 0.16, 0, 7); ctx.fill();
      // Augen: klein, folgen dem Zeiger, blinzeln.
      eye.x += (eye.tx - eye.x) * Math.min(1, dt * 6); eye.y += (eye.ty - eye.y) * Math.min(1, dt * 6);
      if (!rd && now > blinkAt) { blink = 1; blinkAt = now + 7000 + Math.random() * 6000; }
      blink = Math.max(0, blink - dt * 7);
      const closed = m === 'night' ? 0.85 : 0;
      const open = Math.max(0.12, 1 - Math.max(closed, blink > 0.5 ? (1 - blink) * 2 : blink * 2));
      const ex = eye.x * R * 0.08, ey = eye.y * R * 0.06;
      ctx.fillStyle = 'rgba(58,49,40,.72)';
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sx * R * 0.27 + ex, cy - R * 0.02 + ey, R * 0.075, R * 0.095 * open, 0, 0, 7); ctx.fill(); }
      // Jade-Stein auf goldenem Band: kreist; beim Denken halbe Umlaufbahn hin und her.
      const speed = m === 'thinking' ? 0 : m === 'flying' ? 2.2 : m === 'waiting' || m === 'night' ? 0.1 : 0.4;
      orbitA = m === 'thinking' && !rd ? Math.PI * 0.5 + Math.sin(t * 2.4) * Math.PI * 0.5 : rd ? 0.6 : orbitA + dt * speed;
      const rx = R * 2.05, ry = R * 0.62, tilt = -0.32;
      const ox = Math.cos(orbitA) * rx, oy = Math.sin(orbitA) * ry;
      const sxp = cx + ox * Math.cos(tilt) - oy * Math.sin(tilt), syp = cy + R * 0.25 + ox * Math.sin(tilt) + oy * Math.cos(tilt);
      ctx.save(); ctx.translate(cx, cy + R * 0.25); ctx.rotate(tilt);
      ctx.strokeStyle = `rgba(226,196,120,${0.35 * dim})`; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.stroke(); ctx.restore();
      const sr = R * 0.34 * (1 + Math.sin(orbitA) * 0.12);
      const front = Math.sin(orbitA) > 0;
      if (stone.complete && stone.naturalWidth) {
        ctx.globalAlpha = (front ? 1 : 0.75) * (0.6 + 0.4 * dim);
        ctx.drawImage(stone, sxp - sr, syp - sr, sr * 2, sr * 2); ctx.globalAlpha = 1;
      }
      if (!rd) raf = requestAnimationFrame(frame);
    };
    if (reduced) { stone.onload = () => frame(performance.now()); frame(performance.now()); }
    else raf = requestAnimationFrame(frame);
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden && !st.current.reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    document.addEventListener('visibilitychange', vis);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', vis); };
  }, [size, phone, reduced]);

  return (
    <span className="wd-spirit" data-mood={mood}>
      <canvas ref={ref} aria-hidden style={{ width: size * 4, height: size * 4 }} data-testid="mora-spirit" />
      <span className="sr-only" role="status" aria-live="polite" data-testid="mora-status">{SPIRIT_LABEL[mood]}</span>
    </span>
  );
}

/** Kleines MÔRA-Lichtzeichen (Dock): Elfenbein/Gold mit Jade-Punkt, passend zur Figur. */
export function MoraMark({ size = 28, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden data-testid="mora-mark" className="os-mora-mark" data-active={active ? 'true' : 'false'}>
      <defs>
        <radialGradient id="mm-halo"><stop offset="0" stopColor="#F7E9CB" stopOpacity={active ? 0.5 : 0.3} /><stop offset="1" stopColor="#E9B967" stopOpacity="0" /></radialGradient>
        <radialGradient id="mm-body" cx=".42" cy=".38"><stop offset="0" stopColor="#FFFBF2" /><stop offset=".65" stopColor="#F7E9CB" /><stop offset="1" stopColor="#E9B967" /></radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#mm-halo)" />
      <path d="M13.2 9.6c.8-2.6 3.6-3.2 4.2-6 1.6 2.2.8 4.6-.6 6z" fill="#F7E9CB" opacity=".75" />
      <path d="M16 9.4c3.4 0 5.6 2.4 5.6 5.4 0 2.4-1.5 3.9-3 5.1-1 .8-1.4 2.6-2.4 4.8-1-2.2-1.4-4-2.4-4.8-1.5-1.2-3.4-2.7-3.4-5.1 0-3 2.2-5.4 5.6-5.4z" fill="url(#mm-body)" />
      <ellipse cx="16" cy="18" rx="10.5" ry="3" fill="none" stroke="#E9B967" strokeOpacity=".55" strokeWidth=".7" transform="rotate(-16 16 18)" />
      <circle cx="25.4" cy="15.2" r="2.3" fill="#367E66" stroke="#E9B967" strokeWidth=".5" />
    </svg>
  );
}
