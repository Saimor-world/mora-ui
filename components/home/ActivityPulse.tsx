'use client';

import { useEffect, useRef, useMemo } from 'react';
import { mockActivity } from '@/lib/mockConnectors';
import usePrefersReducedMotion from '@/lib/hooks/usePrefersReducedMotion';

interface ActivityPulseProps {
  activities?: typeof mockActivity;
  dimFallback?: boolean;
}

export default function ActivityPulse({ activities = mockActivity, dimFallback = false }: ActivityPulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const seeds = useMemo(
    () => activities.map(() => Math.random() * 1000),
    [activities]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    let animationFrame: number;

    const draw = () => {
      const width = (canvas.width = canvas.offsetWidth);
      const height = (canvas.height = canvas.offsetHeight);
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      activities.forEach((activity, index) => {
        const age = Math.min(
          4,
          Math.max(0, (now - new Date(activity.timestamp).getTime()) / (1000 * 60 * 3))
        );
        const baseRadius = 40 + index * 28;
        const wobbleSpeed = prefersReducedMotion ? 1400 : 800;
        const pulse = Math.sin(now / wobbleSpeed + seeds[index]) * (prefersReducedMotion ? 2 : 6);
        const radius = Math.max(12, baseRadius - age * 6 + pulse);
        const centerX = width / 2 + Math.sin(seeds[index]) * 20;
        const centerY = height / 2 + Math.cos(seeds[index]) * 15;

        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.8);
        gradient.addColorStop(0, 'rgba(248,191,77,0.09)');
        gradient.addColorStop(0.35, 'rgba(135,182,164,0.04)');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, [activities, prefersReducedMotion, seeds]);

  return (
    <div className={`absolute inset-0 w-full h-full ${dimFallback ? 'opacity-80 brightness-75' : ''}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
      {dimFallback && <div className="absolute inset-0 bg-background/50" aria-hidden="true" />}
    </div>
  );
}
