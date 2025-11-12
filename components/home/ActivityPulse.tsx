'use client';

import { useEffect, useRef } from 'react';
import { mockActivity } from '@/lib/mockConnectors';

interface ActivityPulseProps {
  activities?: typeof mockActivity;
  dimFallback?: boolean;
}

export default function ActivityPulse({ activities = mockActivity, dimFallback = false }: ActivityPulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      const width = canvas.width = canvas.offsetWidth;
      const height = canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      activities.forEach((activity, index) => {
        const age = (now - new Date(activity.timestamp).getTime()) / (1000 * 60);
        const baseRadius = 30 + index * 25;
        const pulse = Math.sin(now / 800 + index) * 5;
        const radius = Math.max(10, baseRadius - age * 2 + pulse);

        const gradient = ctx.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          radius * 2
        );
        gradient.addColorStop(0, 'rgba(248,191,77,0.12)');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius * 2, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, [activities]);

  return (
    <div className={`absolute inset-0 w-full h-full ${dimFallback ? 'opacity-80 brightness-75' : ''}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
      {dimFallback && <div className="absolute inset-0 bg-background/50" aria-hidden="true" />}
    </div>
  );
}
