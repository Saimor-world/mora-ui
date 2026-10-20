'use client';

import React, { useEffect, useRef } from 'react';
import { capDevicePixelRatio, recordFpsSample, SPACE_COUNTS, spaceLoopAllowed } from '@/lib/universe/spaceField';

declare global {
  interface Window {
    __uv2Fps?: number;
  }
}

/**
 * Dark-universe living space: nebula + star/dust layers with parallax.
 * WebGL points (GPU), DPR capped, paused when hidden, one still frame
 * when the user prefers reduced motion. FPS is published on the canvas
 * and window.__uv2Fps.
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

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, `
      attribute vec2 aPos;
      attribute float aSize;
      attribute float aPhase;
      uniform vec2 uRes;
      uniform vec2 uParallax;
      uniform float uTime;
      uniform float uTwinkle;
      varying float vA;
      void main() {
        vec2 p = aPos + uParallax;
        vec2 clip = (p / uRes) * 2.0 - 1.0;
        gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
        gl_PointSize = aSize;
        float tw = 0.62 + 0.38 * sin(uTime * (0.6 + aPhase) + aPhase * 6.2832);
        vA = mix(1.0, tw, uTwinkle);
      }
    `);
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, `
      precision mediump float;
      varying float vA;
      uniform vec3 uColor;
      void main() {
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float d = dot(c, c);
        if (d > 1.0) discard;
        float g = exp(-d * 2.8);
        gl_FragColor = vec4(uColor, vA * g);
      }
    `);
    gl.compileShader(fs);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    const nvs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(nvs, `
      attribute vec2 aPos;
      void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
    `);
    gl.compileShader(nvs);
    const nfs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(nfs, `
      precision mediump float;
      uniform vec2 uRes;
      uniform float uTime;
      uniform vec2 uParallax;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p){
        float a = 0.0, w = 0.5;
        for (int i = 0; i < 5; i++) { a += w * noise(p); p *= 2.03; w *= 0.55; }
        return a;
      }
      void main() {
        vec2 uv = (gl_FragCoord.xy + uParallax * 12.0) / uRes;
        uv.x *= uRes.x / uRes.y;
        float t = uTime * 0.018;
        float n1 = fbm(uv * 2.1 + vec2(t * 0.15, -t * 0.08));
        float n2 = fbm(uv * 1.3 + vec2(-0.4, 0.6) + vec2(-t * 0.07, t * 0.1));
        vec3 ink = vec3(0.02, 0.027, 0.024);
        vec3 jade = vec3(0.18, 0.55, 0.43);
        vec3 gold = vec3(0.84, 0.66, 0.28);
        vec3 teal = vec3(0.08, 0.32, 0.38);
        vec3 col = ink;
        col += jade * smoothstep(0.42, 0.78, n1) * 0.42;
        col += teal * smoothstep(0.38, 0.72, n2) * 0.28;
        col += gold * pow(smoothstep(0.62, 0.9, n1 * n2), 2.2) * 0.18;
        float vign = smoothstep(1.15, 0.22, length(uv - vec2(0.55, 0.48)));
        gl_FragColor = vec4(col * vign, 0.55);
      }
    `);
    gl.compileShader(nfs);
    const nprog = gl.createProgram()!;
    gl.attachShader(nprog, nvs);
    gl.attachShader(nprog, nfs);
    gl.linkProgram(nprog);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    type Layer = { count: number; pos: Float32Array; size: Float32Array; phase: Float32Array; drift: Float32Array; buf: WebGLBuffer; color: [number, number, number]; parallax: number };
    const layers: Layer[] = [];

    const makeLayer = (count: number, sizeMin: number, sizeMax: number, color: [number, number, number], drift: number, parallax: number, w: number, h: number): Layer => {
      const pos = new Float32Array(count * 2);
      const size = new Float32Array(count);
      const phase = new Float32Array(count);
      const dr = new Float32Array(count * 2);
      for (let i = 0; i < count; i++) {
        pos[i * 2] = Math.random() * w;
        pos[i * 2 + 1] = Math.random() * h;
        size[i] = sizeMin + Math.random() * (sizeMax - sizeMin);
        phase[i] = Math.random();
        dr[i * 2] = drift * (0.6 + Math.random() * 0.8);
        dr[i * 2 + 1] = (Math.random() - 0.5) * drift * 0.35;
      }
      const buf = gl.createBuffer()!;
      return { count, pos, size, phase, drift: dr, buf, color, parallax };
    };

    const loc = {
      aPos: 0, aSize: 1, aPhase: 2,
    };
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.bindAttribLocation(prog, 1, 'aSize');
    gl.bindAttribLocation(prog, 2, 'aPhase');
    gl.linkProgram(prog);

    let cssW = 0, cssH = 0, bufW = 0, bufH = 0;

    const resize = () => {
      const dpr = capDevicePixelRatio(window.devicePixelRatio || 1);
      cssW = window.innerWidth;
      cssH = window.innerHeight;
      bufW = Math.max(1, Math.round(cssW * dpr));
      bufH = Math.max(1, Math.round(cssH * dpr));
      canvas.width = bufW;
      canvas.height = bufH;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      gl.viewport(0, 0, bufW, bufH);
      layers.length = 0;
      layers.push(
        makeLayer(SPACE_COUNTS.far, 0.7, 1.4, [0.78, 0.86, 0.92], 2.4, 0.12, cssW, cssH),
        makeLayer(SPACE_COUNTS.mid, 1.1, 2.1, [0.9, 0.93, 0.98], 7.2, 0.28, cssW, cssH),
        makeLayer(SPACE_COUNTS.near, 1.6, 3.2, [1, 0.96, 0.86], 16, 0.55, cssW, cssH),
        makeLayer(SPACE_COUNTS.dust, 0.5, 1.1, [0.55, 0.72, 0.62], 11, 0.4, cssW, cssH),
      );
    };

    const publishFps = () => {
      const rounded = Math.round(fps);
      window.__uv2Fps = rounded;
      canvas.dataset.uv2Fps = String(rounded);
    };

    const draw = (tMs: number, animate: boolean) => {
      const t = tMs * 0.001;
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.viewport(0, 0, bufW, bufH);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(nprog);
      const nPos = gl.getAttribLocation(nprog, 'aPos');
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(nPos);
      gl.vertexAttribPointer(nPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(nprog, 'uRes'), bufW, bufH);
      gl.uniform1f(gl.getUniformLocation(nprog, 'uTime'), reduced ? 0 : t);
      gl.uniform2f(gl.getUniformLocation(nprog, 'uParallax'), reduced ? 0 : mouse.x * 8, reduced ? 0 : mouse.y * 6);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.useProgram(prog);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      const uRes = gl.getUniformLocation(prog, 'uRes');
      const uPar = gl.getUniformLocation(prog, 'uParallax');
      const uTime = gl.getUniformLocation(prog, 'uTime');
      const uTw = gl.getUniformLocation(prog, 'uTwinkle');
      const uCol = gl.getUniformLocation(prog, 'uColor');
      const aPos = gl.getAttribLocation(prog, 'aPos');
      const aSize = gl.getAttribLocation(prog, 'aSize');
      const aPhase = gl.getAttribLocation(prog, 'aPhase');

      for (const layer of layers) {
        if (animate) {
          for (let i = 0; i < layer.count; i++) {
            layer.pos[i * 2] -= layer.drift[i * 2] * 0.016;
            layer.pos[i * 2 + 1] += layer.drift[i * 2 + 1] * 0.016;
            if (layer.pos[i * 2] < -4) layer.pos[i * 2] = cssW + 4;
            if (layer.pos[i * 2] > cssW + 4) layer.pos[i * 2] = -4;
            if (layer.pos[i * 2 + 1] < -4) layer.pos[i * 2 + 1] = cssH + 4;
            if (layer.pos[i * 2 + 1] > cssH + 4) layer.pos[i * 2 + 1] = -4;
          }
        }
        gl.uniform2f(uRes, cssW, cssH);
        gl.uniform2f(uPar, mouse.x * 18 * layer.parallax, mouse.y * 14 * layer.parallax);
        gl.uniform1f(uTime, reduced ? 0 : t);
        gl.uniform1f(uTw, reduced ? 0 : 1);
        gl.uniform3f(uCol, layer.color[0], layer.color[1], layer.color[2]);
        gl.bindBuffer(gl.ARRAY_BUFFER, layer.buf);
        const packed = new Float32Array(layer.count * 4);
        for (let i = 0; i < layer.count; i++) {
          packed[i * 4] = layer.pos[i * 2];
          packed[i * 4 + 1] = layer.pos[i * 2 + 1];
          packed[i * 4 + 2] = layer.size[i];
          packed[i * 4 + 3] = layer.phase[i];
        }
        gl.bufferData(gl.ARRAY_BUFFER, packed, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(aSize);
        gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 16, 8);
        gl.enableVertexAttribArray(aPhase);
        gl.vertexAttribPointer(aPhase, 1, gl.FLOAT, false, 16, 12);
        gl.drawArrays(gl.POINTS, 0, layer.count);
      }
    };

    const frame = (now: number) => {
      if (!running || disposed) return;
      const dt = last ? now - last : 16;
      last = now;
      fps = recordFpsSample(fps, dt);
      publishFps();
      draw(now, true);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || disposed) return;
      if (!spaceLoopAllowed(hidden, reduced)) {
        draw(0, false);
        fps = 0;
        publishFps();
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
      else { stop(); if (!hidden) draw(performance.now(), false); }
    };
    const onMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / Math.max(1, cssW) - 0.5);
      mouse.y = (e.clientY / Math.max(1, cssH) - 0.5);
    };
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => { reduced = mq.matches; onVis(); };
    reduced = mq.matches;

    resize();
    start();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pointermove', onMove, { passive: true });
    mq.addEventListener('change', onMq);

    return () => {
      disposed = true;
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      mq.removeEventListener('change', onMq);
      gl.deleteProgram(prog);
      gl.deleteProgram(nprog);
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
  const stars = Array.from({ length: 280 }, () => ({
    x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + 0.3, p: Math.random() * Math.PI * 2,
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
    const g = ctx.createRadialGradient(w * 0.45, h * 0.42, 0, w * 0.45, h * 0.42, w * 0.7);
    g.addColorStop(0, 'rgba(46,140,110,0.28)');
    g.addColorStop(0.45, 'rgba(8,24,22,0.2)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (const s of stars) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.001 + s.p));
      ctx.fillStyle = `rgba(236,244,248,${a})`;
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
