'use client';

import { create } from 'zustand';
import type { SurfaceEnvironment } from '@/public/universe/planet-surface-worker';

export const useAmbientEnvironment = create<{ environment: SurfaceEnvironment | null }>(() => ({ environment: null }));

/** Split CSS image layers/stops without splitting the commas inside rgba(). */
export function splitGradientLayers(value: string): string[] {
  const parts: string[] = []; let depth = 0, start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    if (value[i] === ')') depth--;
    if (value[i] === ',' && depth === 0) { parts.push(value.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

function paintGradient(context: CanvasRenderingContext2D, value: string, width: number, height: number) {
  const match = /^radial-gradient\((.*)\)$/.exec(value); if (!match) return;
  const [descriptor, ...stops] = splitGradientLayers(match[1]);
  const position = /at\s+([\d.]+)%\s+([\d.]+)%/.exec(descriptor);
  const x = width * (position ? Number(position[1]) / 100 : .5);
  const y = height * (position ? Number(position[2]) / 100 : .5);
  const rx = Math.max(x, width - x), ry = Math.max(y, height - y);
  context.save();
  const ellipse = descriptor.startsWith('ellipse');
  if (ellipse) { context.translate(x, y); context.scale(Math.max(1, rx), Math.max(1, ry)); }
  const radius = ellipse ? Math.SQRT2 : Math.hypot(rx, ry);
  const gradient = context.createRadialGradient(ellipse ? 0 : x, ellipse ? 0 : y, 0, ellipse ? 0 : x, ellipse ? 0 : y, radius);
  stops.forEach((stop, index) => {
    const color = /^(rgba?\([^)]*\)|#[\da-f]+|transparent)(?:\s+([\d.]+)%)?$/i.exec(stop);
    if (!color) return;
    gradient.addColorStop(color[2] ? Number(color[2]) / 100 : index / Math.max(1, stops.length - 1), color[1]);
  });
  context.fillStyle = gradient;
  if (ellipse) context.fillRect(-x / Math.max(1, rx), -y / Math.max(1, ry), width / Math.max(1, rx), height / Math.max(1, ry));
  else context.fillRect(0, 0, width, height);
  context.restore();
}

let generation = 0;
let imagePromise: Promise<HTMLImageElement> | null = null;
function nebulaImage() {
  if (!imagePromise) imagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = error => { imagePromise = null; reject(error); };
    image.src = '/universe/deep-space-warm.jpg';
  });
  return imagePromise;
}

/** Low-resolution lighting probe of the actual nebula and the same ambient layers.
 * Rebuilt on room/viewport changes and occasionally while visible, never per frame.
 */
export function startAmbientEnvironment(onBackdrop?: (canvas: HTMLCanvasElement) => void): () => void {
  let stopped = false, pending = 0, scheduledAt = 0, capturing = false, requested = false;
  const capture = async () => {
    if (stopped || document.hidden) return;
    if (capturing) { requested = true; return; }
    capturing = true;
    try {
      const image = await nebulaImage(); if (stopped) return;
      const viewportWidth = window.innerWidth, viewportHeight = window.innerHeight;
      const width = Math.min(1920, Math.round(viewportWidth * Math.min(1.25, window.devicePixelRatio || 1)));
      const height = Math.round(width * viewportHeight / viewportWidth);
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d'); if (!context) return;
      const scale = width / viewportWidth;
      const imageNode = document.querySelector<HTMLElement>('.uv2-cosmos-image');
      const rect = imageNode?.getBoundingClientRect() ?? { left: 0, top: 0, width: viewportWidth, height: viewportHeight };
      const cover = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
      const imageWidth = image.naturalWidth * cover, imageHeight = image.naturalHeight * cover;
      context.filter = imageNode ? getComputedStyle(imageNode).filter : 'brightness(1.95) saturate(.92) contrast(.96)';
      context.drawImage(image, (rect.left + (rect.width - imageWidth) / 2) * scale, (rect.top + (rect.height - imageHeight) / 2) * scale, imageWidth * scale, imageHeight * scale);
      context.filter = 'none';
      document.querySelectorAll<HTMLElement>('[data-cosmos-light-layer]').forEach(node => {
        const style = getComputedStyle(node), box = node.getBoundingClientRect();
        if (style.display === 'none' || Number(style.opacity) === 0 || !box.width || !box.height) return;
        // Gradients contain no fine image detail: paint them small, then enlarge them.
        const lightScale = Math.min(scale, 320 / viewportWidth);
        const layer = document.createElement('canvas'); layer.width = Math.max(1, Math.round(box.width * lightScale)); layer.height = Math.max(1, Math.round(box.height * lightScale));
        const paint = layer.getContext('2d'); if (!paint) return;
        splitGradientLayers(style.backgroundImage).reverse().forEach(gradient => paintGradient(paint, gradient, layer.width, layer.height));
        context.globalAlpha = Number(style.opacity);
        context.globalCompositeOperation = ['screen', 'overlay'].includes(style.mixBlendMode) ? style.mixBlendMode as GlobalCompositeOperation : 'source-over';
        context.filter = style.filter.replace(/blur\(([\d.]+)px\)/g, (_, pixels) => `blur(${Number(pixels) * scale}px)`);
        context.drawImage(layer, box.left * scale, box.top * scale, box.width * scale, box.height * scale);
      });
      context.filter = 'none'; context.globalAlpha = 1; context.globalCompositeOperation = 'source-over';
      onBackdrop?.(canvas);
      const probe = document.createElement('canvas'); probe.width = 160; probe.height = Math.max(64, Math.round(160 * viewportHeight / viewportWidth));
      const probeContext = probe.getContext('2d'); if (!probeContext) return;
      probeContext.drawImage(canvas, 0, 0, probe.width, probe.height);
      const rgba = probeContext.getImageData(0, 0, probe.width, probe.height).data;
      useAmbientEnvironment.setState({ environment: { width: probe.width, height: probe.height, rgba, key: String(++generation) } });
    } catch (error) {
      // Keep the last valid lighting probe if an image is temporarily unavailable.
      if (process.env.NODE_ENV !== 'production') console.warn('[Cosmos] Room lighting update failed.', error);
    } finally {
      capturing = false;
      if (requested && !stopped) { requested = false; schedule(); }
    }
  };
  const schedule = () => {
    const now = performance.now();
    if (!scheduledAt) scheduledAt = now;
    window.clearTimeout(pending);
    // A busy scene must still receive its first image; trailing-only debounce
    // could postpone it indefinitely while the camera/assistant changes state.
    pending = window.setTimeout(() => { scheduledAt = 0; void capture(); }, Math.min(800, Math.max(0, 1600 - (now - scheduledAt))));
  };
  const observer = new MutationObserver(records => {
    if (records.some(record => record.type === 'attributes' || [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && (node.matches('[data-cosmos-light-layer]') || node.querySelector('[data-cosmos-light-layer]'))))) schedule();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-ambient-scene', 'data-ambient-band', 'data-ambient-orb', 'data-ambient-lens', 'data-uv2-immersive', 'data-uv2-zoom', 'data-shot', 'data-settled'] });
  const interval = window.setInterval(() => { void capture(); }, 30_000);
  window.addEventListener('resize', schedule); document.addEventListener('visibilitychange', schedule);
  schedule();
  return () => { stopped = true; window.clearTimeout(pending); window.clearInterval(interval); observer.disconnect(); window.removeEventListener('resize', schedule); document.removeEventListener('visibilitychange', schedule); useAmbientEnvironment.setState({ environment: null }); };
}
