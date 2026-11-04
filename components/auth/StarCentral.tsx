"use client";

import React, { useEffect, useRef, useState } from 'react';
import s from './StarCentral.module.css';

export type StarCentralMode = 'login' | 'lock' | 'pause' | 'screensaver';

interface StarCentralProps {
    mode?: StarCentralMode;
    /** Firmenname des Mandanten (nur Anzeige). */
    firm?: string | null;
    className?: string;
    /** MÔRA in der Szene zeigen (Login platziert MÔRA selbst im Layout). */
    showMora?: boolean;
}

const STAR_COUNT = 90;

/** Deterministische Sterne: Position, Größe, Phase, langsame Frequenz (rad/s). */
function makeStars() {
    let seed = 7;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: STAR_COUNT }, () => ({ u: r(), v: r() * 0.55, z: r() * 1.4 + 0.4, p: r() * 6.3, f: r() * 0.45 + 0.25 }));
}

/** Weiche MÔRA-Bewegung: Sinus-Schweben + gelegentlicher, gefederter Hüpfer. Sub-Pixel, keine Rundung. */
export function moraPose(tSec: number) {
    let y = -3 * (1 - Math.cos((Math.PI * 2 * tSec) / 4.6));
    let sx = 1;
    let sy = 1;
    const h = (tSec % 7.3) / 0.7;
    if (h < 1) {
        const k = Math.sin(Math.PI * h);
        y -= 9 * k * k;
        const q = Math.sin(Math.PI * 2 * h) * (1 - h) * 0.05;
        sy = 1 - q;
        sx = 1 + q * 0.7;
    }
    return { y, sx, sy };
}

export function starAlpha(tSec: number, f: number, p: number) {
    return 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(tSec * f + p));
}

/**
 * Star Central – reine Präsentationsszene (Login, Lock, Pause, Bildschirmschoner).
 * Enthält keine Auth-Logik; Formulare werden von außen darübergelegt.
 */
export function StarCentral({ mode = 'login', firm, className, showMora = true }: StarCentralProps) {
    const sky = useRef<HTMLCanvasElement>(null);
    const mora = useRef<HTMLImageElement>(null);
    const par = useRef<HTMLDivElement>(null);
    const [time, setTime] = useState('');
    const calm = mode === 'pause' || mode === 'screensaver';

    useEffect(() => {
        if (!calm) return;
        const tick = () => setTime(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
        tick();
        const id = window.setInterval(tick, 10000);
        return () => window.clearInterval(id);
    }, [calm]);

    useEffect(() => {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        const canvas = sky.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const stars = makeStars();
        const sprite = document.createElement('canvas');
        sprite.width = sprite.height = 64;
        const sc = sprite.getContext('2d');
        if (sc) {
            const g = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
            g.addColorStop(0, 'rgba(255,250,235,1)');
            g.addColorStop(0.35, 'rgba(255,250,235,.5)');
            g.addColorStop(1, 'rgba(255,250,235,0)');
            sc.fillStyle = g;
            sc.fillRect(0, 0, 64, 64);
        }
        let W = 0, H = 0, K = 1;
        const resize = () => {
            K = window.devicePixelRatio || 1;
            W = canvas.width = Math.round(canvas.clientWidth * K);
            H = canvas.height = Math.round(canvas.clientHeight * K);
        };
        resize();
        window.addEventListener('resize', resize);
        let tx = 0, ty = 0, cx = 0, cy = 0;
        const onMove = (e: PointerEvent) => { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; };
        window.addEventListener('pointermove', onMove);
        let raf = 0;
        let last = performance.now();
        const frame = (now: number) => {
            const t = reduced ? 0 : now / 1000;
            const dt = Math.min(0.1, (now - last) / 1000);
            last = now;
            ctx.clearRect(0, 0, W, H);
            for (const st of stars) {
                ctx.globalAlpha = starAlpha(t, st.f, st.p);
                const r = st.z * K * 6.6;
                ctx.drawImage(sprite, st.u * W - r / 2, st.v * H - r / 2, r, r);
            }
            ctx.globalAlpha = 1;
            if (mora.current) {
                const m = moraPose(t);
                mora.current.style.transform = `translate3d(0,${m.y.toFixed(3)}px,0) scale(${m.sx.toFixed(4)},${m.sy.toFixed(4)})`;
            }
            if (calm) { const a = now / 2500; tx = Math.sin(a) * 0.35; ty = Math.cos(a * 0.7) * 0.2; }
            const e = 1 - Math.exp(-dt * 2.4);
            cx += (tx - cx) * e;
            cy += (ty - cy) * e;
            if (par.current) par.current.style.transform = `translate3d(${(-cx * 6).toFixed(3)}px,${(-cy * 3.6).toFixed(3)}px,0)`;
            if (!reduced) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('pointermove', onMove);
        };
    }, [calm]);

    const initials = (firm || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

    return (
        <div className={`${s.root} ${calm ? s.calm : ''} ${className ?? ''}`} aria-hidden="true" data-star-central={mode}>
            <div ref={par} className={`${s.L} ${s.bg}`} />
            <canvas ref={sky} className={s.sky} />
            <div className={`${s.L} ${s.rays}`} />
            <div className={`${s.L} ${s.aur}`} />
            <div className={`${s.L} ${s.mist}`} />
            <div className={`${s.L} ${s.mist} ${s.mistB}`} />
            <div className={`${s.L} ${s.mist} ${s.mistC}`} />
            <div className={`${s.L} ${s.haze}`} />
            <div className={`${s.L} ${s.glow}`} />
            {showMora && <>{/* eslint-disable-next-line @next/next/no-img-element -- Pixel-Sprite, bewusst ohne Next-Optimierung */}
            <img ref={mora} className={s.mora} src="/star-central/mora.png" alt="" width={92} height={92} draggable={false} /></>}
            {firm && !calm && <div className={s.firm}><i>{initials}</i>{firm}</div>}
            {calm && <div className={s.time}>{time}</div>}
        </div>
    );
}

/**
 * Pause/Bildschirmschoner-Overlay im OS: jede Eingabe ruft onResume.
 * Keine Abmeldung, keine Auth – reine Präsentation.
 */
export function StarCentralPause({ mode = 'pause', onResume }: { mode?: 'pause' | 'screensaver'; onResume: () => void }) {
    useEffect(() => {
        const armed = { v: false };
        const t = window.setTimeout(() => { armed.v = true; }, 600);
        const go = () => { if (armed.v) onResume(); };
        window.addEventListener('keydown', go);
        window.addEventListener('pointerdown', go);
        return () => { window.clearTimeout(t); window.removeEventListener('keydown', go); window.removeEventListener('pointerdown', go); };
    }, [onResume]);
    return <div className={s.overlay} data-testid="star-central-pause"><StarCentral mode={mode} /></div>;
}

/** Hängt das weiche MÔRA-Schweben (rAF, Delta-Zeit, Sub-Pixel) an ein beliebiges Element. */
export function useMoraFloat<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    useEffect(() => {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        let raf = 0;
        const frame = (now: number) => {
            const m = moraPose(now / 1000);
            if (ref.current) ref.current.style.transform = `translate3d(0,${m.y.toFixed(3)}px,0) scale(${m.sx.toFixed(4)},${m.sy.toFixed(4)})`;
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);
    return ref;
}

/** Idle-Hook: liefert true nach idleMs ohne Eingabe; resume() setzt zurück. */
export function useIdlePause(idleMs = 5 * 60 * 1000) {
    const [paused, setPaused] = useState(false);
    useEffect(() => {
        if (paused) return;
        let id = window.setTimeout(() => setPaused(true), idleMs);
        const bump = () => { window.clearTimeout(id); id = window.setTimeout(() => setPaused(true), idleMs); };
        const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
        evs.forEach(e => window.addEventListener(e, bump, { passive: true }));
        return () => { window.clearTimeout(id); evs.forEach(e => window.removeEventListener(e, bump)); };
    }, [idleMs, paused]);
    return { paused, resume: () => setPaused(false) };
}
