/*
 * Star Central – Himmel (Canvas). Reine Präsentation.
 * Drei Sterntiefen, große weiche Glühsterne mit Beugungsstrahlen, Sternschnuppen (4–10 s),
 * Funken, die quer gleiten, aufsteigende Lichtpartikel und gelegentliches Aufleuchten.
 * Alles zeitbasiert (Delta-Zeit), vorgerenderte Sprites, nur drawImage + globalAlpha.
 */

export interface SkyOptions {
    /** Parallax-Versatz (-0.5..0.5), wird pro Frame gelesen. */
    parallax?: () => { x: number; y: number };
    /** Erste Sternschnuppe nach n Sekunden. */
    firstShootAt?: number;
    /** Zeitquelle in Sekunden (Standard performance.now). */
    clock?: (now: number) => number;
    reduced?: boolean;
}

interface Star { u: number; v: number; r: number; p: number; f: number; layer: number }
interface Shoot { t0: number; x: number; y: number; ang: number; len: number; dur: number; w: number }
interface Spark { t0: number; dur: number; x0: number; y0: number; x1: number; y1: number; bend: number }
interface Pulse { t0: number; idx: number }

function rng(seed: number) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function sprite(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    if (c) draw(c, size);
    return cv;
}

function glowSprite(size: number, core: string, mid: string) {
    return sprite(size, (c, s) => {
        const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, core);
        g.addColorStop(0.18, mid);
        g.addColorStop(1, 'rgba(160,240,200,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, s, s);
    });
}

/** Großer Stern mit weichem Halo und vier feinen Beugungsstrahlen. */
function bigStarSprite(size: number) {
    return sprite(size, (c, s) => {
        const h = s / 2;
        const g = c.createRadialGradient(h, h, 0, h, h, h);
        g.addColorStop(0, 'rgba(255,255,244,1)');
        g.addColorStop(0.06, 'rgba(240,255,236,.9)');
        g.addColorStop(0.22, 'rgba(190,250,215,.42)');
        g.addColorStop(1, 'rgba(110,231,183,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, s, s);
        c.globalCompositeOperation = 'lighter';
        for (const [dx, dy, len] of [[1, 0, 1], [0, 1, 1], [0.7071, 0.7071, 0.45], [0.7071, -0.7071, 0.45]]) {
            const L = h * len;
            const lg = c.createLinearGradient(h - dx * L, h - dy * L, h + dx * L, h + dy * L);
            lg.addColorStop(0, 'rgba(200,255,225,0)');
            lg.addColorStop(0.5, 'rgba(250,255,240,.55)');
            lg.addColorStop(1, 'rgba(200,255,225,0)');
            c.strokeStyle = lg;
            c.lineWidth = s * 0.016;
            c.beginPath();
            c.moveTo(h - dx * L, h - dy * L);
            c.lineTo(h + dx * L, h + dy * L);
            c.stroke();
        }
    });
}

export function startSky(canvas: HTMLCanvasElement, opts: SkyOptions = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof (ctx as CanvasRenderingContext2D).createLinearGradient !== "function") return () => {};
    const R = rng(7);
    const far = glowSprite(32, 'rgba(255,252,238,1)', 'rgba(220,255,235,.55)');
    const mid = glowSprite(64, 'rgba(255,252,238,1)', 'rgba(200,250,225,.5)');
    const big = bigStarSprite(256);
    const dust = glowSprite(32, 'rgba(225,255,236,.9)', 'rgba(110,231,183,.35)');

    const stars: Star[] = [];
    const LAYERS = [
        { n: 240, rMin: 3, rMax: 7, vMax: 0.66, depth: 4 },
        { n: 90, rMin: 10, rMax: 24, vMax: 0.62, depth: 10 },
        { n: 20, rMin: 90, rMax: 180, vMax: 0.55, depth: 18 },
    ];
    LAYERS.forEach((L, layer) => {
        for (let i = 0; i < L.n; i++) stars.push({ u: R(), v: R() * L.vMax, r: L.rMin + R() * (L.rMax - L.rMin), p: R() * 6.283, f: 0.2 + R() * 0.5, layer });
    });
    const motes = Array.from({ length: 96 }, () => ({ u: R(), v: R(), s: 0.012 + R() * 0.022, sw: 10 + R() * 34, ph: R() * 6.28, r: 8 + R() * 16 }));

    let W = 0, H = 0, K = 1;
    const resize = () => {
        K = window.devicePixelRatio || 1;
        W = canvas.width = Math.round(canvas.clientWidth * K);
        H = canvas.height = Math.round(canvas.clientHeight * K);
    };
    resize();
    window.addEventListener('resize', resize);

    let shoot: Shoot | null = null;
    let nextShoot = opts.firstShootAt ?? 2.5;
    let spark: Spark | null = null;
    let nextSpark = 6;
    const pulses: Pulse[] = [];
    let nextPulse = 1.2;
    const clock = opts.clock ?? ((now: number) => now / 1000);
    let raf = 0;

    const frame = (now: number) => {
        const t = opts.reduced ? 0 : clock(now);
        const px = opts.parallax?.() ?? { x: 0, y: 0 };
        ctx.clearRect(0, 0, W, H);

        // Ereignisse planen (zeitbasiert, unabhängig von der Framerate)
        if (!opts.reduced) {
            if (t >= nextPulse) { pulses.push({ t0: t, idx: Math.floor(LAYERS[0].n + R() * (stars.length - LAYERS[0].n)) }); nextPulse = t + 1.2 + R() * 2.6; }
            if (!shoot && t >= nextShoot) {
                shoot = { t0: t, x: (0.08 + R() * 0.6) * W, y: (0.03 + R() * 0.25) * H, ang: 0.25 + R() * 0.45, len: (160 + R() * 260) * K, dur: 0.8 + R() * 0.9, w: (1.4 + R() * 1.6) * K };
            }
            if (!spark && t >= nextSpark) {
                const l2r = R() < 0.5;
                spark = { t0: t, dur: 4 + R() * 3, x0: l2r ? -0.05 : 1.05, x1: l2r ? 1.05 : -0.05, y0: 0.25 + R() * 0.4, y1: 0.2 + R() * 0.4, bend: (R() - 0.5) * 0.25 };
            }
        }

        // Sterne, drei Tiefen
        for (let i = 0; i < stars.length; i++) {
            const st = stars[i];
            const d = LAYERS[st.layer].depth * K;
            let a = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * st.f + st.p));
            let sc = 1;
            for (const pu of pulses) if (pu.idx === i) { const k = (t - pu.t0) / 1.8; if (k >= 0 && k <= 1) { const e = Math.sin(Math.PI * k) ** 2; a = Math.min(1, a + 0.6 * e); sc += 0.7 * e; } }
            if (st.layer === 2) a = Math.min(1, a * (0.9 + 0.1 * Math.sin(t * 0.6 + st.p)) + 0.15);
            const r = st.r * K * sc;
            const img = st.layer === 0 ? far : st.layer === 1 ? mid : big;
            ctx.globalAlpha = a;
            ctx.drawImage(img, st.u * W - px.x * d - r / 2, st.v * H - px.y * d - r / 2, r, r);
        }
        for (let i = pulses.length - 1; i >= 0; i--) if (t - pulses[i].t0 > 1.8) pulses.splice(i, 1);

        // Aufsteigende Lichtpartikel
        for (const m of motes) {
            const y = ((m.v - t * m.s) % 1 + 1) % 1;
            const x = m.u * W + Math.sin(t * 0.4 + m.ph) * m.sw * K;
            const fade = Math.sin(Math.PI * y);
            ctx.globalAlpha = 0.6 * fade;
            const r = m.r * K;
            ctx.drawImage(dust, x - r / 2, y * H * 1.05 - r / 2, r, r);
        }

        // Sternschnuppe
        if (shoot) {
            const k = (t - shoot.t0) / shoot.dur;
            if (k > 1) { shoot = null; nextShoot = t + 4 + R() * 6; }
            else {
                const ease = 1 - (1 - k) ** 2;
                const dx = Math.cos(shoot.ang), dy = Math.sin(shoot.ang);
                const travel = W * 0.28;
                const x = shoot.x + dx * travel * ease, y = shoot.y + dy * travel * ease;
                const a = Math.sin(Math.PI * k);
                const g = ctx.createLinearGradient(x, y, x - dx * shoot.len, y - dy * shoot.len);
                g.addColorStop(0, `rgba(250,255,240,${0.95 * a})`);
                g.addColorStop(0.3, `rgba(170,245,210,${0.45 * a})`);
                g.addColorStop(1, 'rgba(110,231,183,0)');
                ctx.globalAlpha = 1;
                ctx.strokeStyle = g;
                ctx.lineWidth = shoot.w;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x - dx * shoot.len, y - dy * shoot.len);
                ctx.stroke();
                ctx.globalAlpha = a;
                const hr = 40 * K;
                ctx.drawImage(mid, x - hr / 2, y - hr / 2, hr, hr);
            }
        }

        // Lichtfunke, der langsam quer gleitet (mit Schweif)
        if (spark) {
            const k = (t - spark.t0) / spark.dur;
            if (k > 1) { spark = null; nextSpark = t + 7 + R() * 8; }
            else {
                for (let j = 0; j < 14; j++) {
                    const kk = k - j * 0.012;
                    if (kk < 0) break;
                    const e = kk * kk * (3 - 2 * kk);
                    const x = (spark.x0 + (spark.x1 - spark.x0) * e) * W;
                    const y = (spark.y0 + (spark.y1 - spark.y0) * e + Math.sin(Math.PI * e) * spark.bend) * H;
                    ctx.globalAlpha = Math.sin(Math.PI * k) * (1 - j / 14) * 0.9;
                    const r = (j === 0 ? 70 : 22 - j) * K;
                    ctx.drawImage(j === 0 ? big : dust, x - r / 2, y - r / 2, r, r);
                }
            }
        }
        ctx.globalAlpha = 1;
        if (!opts.reduced) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
}
