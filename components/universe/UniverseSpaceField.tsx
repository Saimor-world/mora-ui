'use client';

import React, { useEffect, useRef } from 'react';
import { capDevicePixelRatio, recordFpsSample, SPACE_COUNTS, spaceLoopAllowed } from '@/lib/universe/spaceField';

declare global {
  interface Window {
    __uv2Fps?: number;
  }
}

/**
 * Dark-universe star/dust field. Nebula stays on the static plate underneath.
 * One POINTS draw, no per-frame buffer rebuilds, DPR capped, paused when hidden.
 */
export function UniverseSpaceField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    if (!gl) return mountCanvas2dFallback(canvas);

    let disposed = false;
    let raf = 0;
    let running = false;
    let last = 0;
    let fps = 0;
    let reduced = false;
    let hidden = typeof document !== 'undefined' && document.hidden;
    const mouse = { x: 0, y: 0 };
    let cssW = 1;
    let cssH = 1;
    let buf: WebGLBuffer | null = null;
    let count = 0;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, `
      attribute vec2 aPos;
      attribute vec2 aDrift;
      attribute float aSize;
      attribute float aPhase;
      uniform vec2 uRes;
      uniform vec2 uParallax;
      uniform float uTime;
      uniform float uTwinkle;
      varying float vA;
      void main() {
        vec2 p = aPos + aDrift * uTime + uParallax;
        p = mod(p, uRes);
        vec2 clip = (p / uRes) * 2.0 - 1.0;
        gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
        gl_PointSize = aSize;
        float tw = 0.55 + 0.45 * sin(uTime * (0.7 + aPhase) + aPhase * 6.2832);
        vA = mix(0.85, tw, uTwinkle);
      }
    `);
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, `
      precision mediump float;
      varying float vA;
      void main() {
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float d = dot(c, c);
        if (d > 1.0) discard;
        float g = exp(-d * 3.2);
        gl_FragColor = vec4(0.92, 0.95, 0.98, vA * g);
      }
    `);
    gl.compileShader(fs);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.bindAttribLocation(prog, 1, 'aDrift');
    gl.bindAttribLocation(prog, 2, 'aSize');
    gl.bindAttribLocation(prog, 3, 'aPhase');
    gl.linkProgram(prog);

    const rebuild = () => {
      const dpr = capDevicePixelRatio(window.devicePixelRatio || 1);
      cssW = window.innerWidth;
      cssH = window.innerHeight;
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
      const n = SPACE_COUNTS.far + SPACE_COUNTS.mid + SPACE_COUNTS.near + SPACE_COUNTS.dust;
      const packed = new Float32Array(n * 6);
      let i = 0;
      const push = (sizeMin: number, sizeMax: number, drift: number, howMany: number) => {
        for (let k = 0; k < howMany; k++) {
          packed[i++] = Math.random() * cssW;
          packed[i++] = Math.random() * cssH;
          packed[i++] = drift * (0.4 + Math.random());
          packed[i++] = (Math.random() - 0.5) * drift * 0.35;
          packed[i++] = sizeMin + Math.random() * (sizeMax - sizeMin);
          packed[i++] = Math.random();
        }
      };
      push(0.6, 1.2, 3.5, SPACE_COUNTS.far);
      push(1.0, 1.8, 8, SPACE_COUNTS.mid);
      push(1.5, 2.6, 14, SPACE_COUNTS.near);
      push(0.4, 0.9, 11, SPACE_COUNTS.dust);
      count = n;
      if (!buf) buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, packed, gl.STATIC_DRAW);
    };

    const publish = () => {
      const rounded = Math.round(fps);
      window.__uv2Fps = rounded;
      canvas.dataset.uv2Fps = String(rounded);
    };

    const draw = (tMs: number) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 8);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 24, 16);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 24, 20);
      gl.uniform2f(gl.getUniformLocation(prog, 'uRes'), cssW, cssH);
      gl.uniform2f(gl.getUniformLocation(prog, 'uParallax'), reduced ? 0 : mouse.x * 16, reduced ? 0 : mouse.y * 12);
      gl.uniform1f(gl.getUniformLocation(prog, 'uTime'), reduced ? 0 : tMs * 0.001);
      gl.uniform1f(gl.getUniformLocation(prog, 'uTwinkle'), reduced ? 0 : 1);
      gl.drawArrays(gl.POINTS, 0, count);
    };

    const frame = (now: number) => {
      if (!running || disposed) return;
      fps = recordFpsSample(fps, last ? now - last : 16);
      last = now;
      publish();
      draw(now);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || disposed) return;
      if (!spaceLoopAllowed(hidden, reduced)) {
        draw(0);
        fps = 0;
        publish();
        return;
      }
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    const onVis = () => {
      hidden = document.hidden;
      if (spaceLoopAllowed(hidden, reduced)) start();
      else { stop(); if (!hidden) draw(performance.now()); }
    };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX / Math.max(1, cssW) - 0.5;
      mouse.y = e.clientY / Math.max(1, cssH) - 0.5;
    };
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => { reduced = mq.matches; onVis(); };
    reduced = mq.matches;

    rebuild();
    start();
    window.addEventListener('resize', rebuild);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pointermove', onMove, { passive: true });
    mq.addEventListener('change', onMq);

    return () => {
      disposed = true;
      stop();
      window.removeEventListener('resize', rebuild);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      mq.removeEventListener('change', onMq);
      if (buf) gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 z-[1]"
      data-testid="uv2-space-field"
      aria-hidden
    />
  );
}

function mountCanvas2dFallback(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;
  let raf = 0;
  let running = false;
  let last = 0;
  let fps = 0;
  const stars = Array.from({ length: 220 }, () => ({
    x: Math.random(), y: Math.random(), s: Math.random() * 1.4 + 0.3, p: Math.random() * Math.PI * 2,
  }));
  const resize = () => {
    const dpr = capDevicePixelRatio(window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  };
  const draw = (t: number) => {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const a = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t * 0.0012 + s.p));
      ctx.fillStyle = `rgba(230,240,248,${a})`;
      ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
    }
  };
  const frame = (now: number) => {
    if (!running) return;
    fps = recordFpsSample(fps, last ? now - last : 16);
    last = now;
    window.__uv2Fps = Math.round(fps);
    canvas.dataset.uv2Fps = String(Math.round(fps));
    draw(now);
    raf = requestAnimationFrame(frame);
  };
  resize();
  running = true;
  raf = requestAnimationFrame(frame);
  window.addEventListener('resize', resize);
  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
}
