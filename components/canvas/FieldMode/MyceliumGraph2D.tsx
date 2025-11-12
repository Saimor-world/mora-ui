'use client';

import { useEffect, useRef, useState } from 'react';
import type { Snapshot, MoraObject } from '@/lib/types';

interface MyceliumGraph2DProps {
  snapshot: Snapshot;
  onNodeClick?: (node: MoraObject) => void;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  node: MoraObject;
}

export default function MyceliumGraph2D({ snapshot, onNodeClick }: MyceliumGraph2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();
  const nodePositionsRef = useRef<Map<string, NodePosition>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Initialize node positions (force-directed layout simulation)
    const nodes = nodePositionsRef.current;
    if (nodes.size === 0) {
      const centerX = canvas.offsetWidth / 2;
      const centerY = canvas.offsetHeight / 2;

      snapshot.nodes.forEach((node, i) => {
        const angle = (i / snapshot.nodes.length) * Math.PI * 2;
        const radius = Math.min(canvas.offsetWidth, canvas.offsetHeight) * 0.3;

        nodes.set(node.id, {
          id: node.id,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          node,
        });
      });
    }

    // Build edge map for force calculations
    const edgeMap = new Map<string, Set<string>>();
    snapshot.edges.forEach(edge => {
      if (!edgeMap.has(edge.sourceId)) edgeMap.set(edge.sourceId, new Set());
      if (!edgeMap.has(edge.targetId)) edgeMap.set(edge.targetId, new Set());
      edgeMap.get(edge.sourceId)!.add(edge.targetId);
      edgeMap.get(edge.targetId)!.add(edge.sourceId);
    });

    // Animation loop with force-directed physics
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Draw background gradient (dark green mycelium soil)
      const gradient = ctx.createRadialGradient(
        canvas.offsetWidth / 2,
        canvas.offsetHeight / 2,
        0,
        canvas.offsetWidth / 2,
        canvas.offsetHeight / 2,
        Math.max(canvas.offsetWidth, canvas.offsetHeight) / 2
      );
      gradient.addColorStop(0, 'hsl(160, 50%, 10%)');
      gradient.addColorStop(1, 'hsl(160, 50%, 5%)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Apply forces
      const nodeArray = Array.from(nodes.values());

      // Repulsion between all nodes
      for (let i = 0; i < nodeArray.length; i++) {
        for (let j = i + 1; j < nodeArray.length; j++) {
          const n1 = nodeArray[i];
          const n2 = nodeArray[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) continue;

          const force = 500 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }

      // Attraction along edges (mycelium threads)
      snapshot.edges.forEach(edge => {
        const source = nodes.get(edge.sourceId);
        const target = nodes.get(edge.targetId);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return;

        const force = dist * 0.001;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      });

      // Center gravity
      const centerX = canvas.offsetWidth / 2;
      const centerY = canvas.offsetHeight / 2;
      nodeArray.forEach(n => {
        const dx = centerX - n.x;
        const dy = centerY - n.y;
        n.vx += dx * 0.0001;
        n.vy += dy * 0.0001;
      });

      // Update positions with damping
      nodeArray.forEach(n => {
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;

        // Keep in bounds
        const margin = 50;
        if (n.x < margin) { n.x = margin; n.vx = 0; }
        if (n.x > canvas.offsetWidth - margin) { n.x = canvas.offsetWidth - margin; n.vx = 0; }
        if (n.y < margin) { n.y = margin; n.vy = 0; }
        if (n.y > canvas.offsetHeight - margin) { n.y = canvas.offsetHeight - margin; n.vy = 0; }
      });

      // Draw mycelium threads (organic curves)
      snapshot.edges.forEach(edge => {
        const source = nodes.get(edge.sourceId);
        const target = nodes.get(edge.targetId);
        if (!source || !target) return;

        const weight = edge.weight || 0.5;

        // Draw organic curved thread
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);

        // Control point for curve (creates organic look)
        const midX = (source.x + target.x) / 2 + (Math.random() - 0.5) * 20;
        const midY = (source.y + target.y) / 2 + (Math.random() - 0.5) * 20;
        ctx.quadraticCurveTo(midX, midY, target.x, target.y);

        ctx.strokeStyle = `rgba(52, 211, 153, ${weight * 0.3})`;
        ctx.lineWidth = weight * 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Add glowing threads for strong connections
        if (weight > 0.7) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.quadraticCurveTo(midX, midY, target.x, target.y);
          ctx.strokeStyle = `rgba(52, 211, 153, ${weight * 0.1})`;
          ctx.lineWidth = weight * 8;
          ctx.stroke();
        }
      });

      // Draw nodes (spores/fruiting bodies)
      nodeArray.forEach(n => {
        const isHovered = hoveredNode === n.id;
        const color = getNodeColor(n.node.type);
        const radius = isHovered ? 12 : 8;

        // Outer glow
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius * 2);
        glow.addColorStop(0, `${color}40`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Node body
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Inner highlight
        ctx.beginPath();
        ctx.arc(n.x - radius/3, n.y - radius/3, radius/2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();

        // Draw title
        if (isHovered) {
          ctx.font = '12px system-ui';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(n.node.title, n.x, n.y + radius + 8);
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [snapshot, hoveredNode]);

  // Handle mouse interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find hovered node
    let found: string | null = null;
    nodePositionsRef.current.forEach(n => {
      const dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
      if (dist < 12) {
        found = n.id;
      }
    });

    setHoveredNode(found);
    canvas.style.cursor = found ? 'pointer' : 'default';
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked node
    nodePositionsRef.current.forEach(n => {
      const dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
      if (dist < 12) {
        onNodeClick?.(n.node);
      }
    });
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    />
  );
}

function getNodeColor(type: string): string {
  switch (type) {
    case 'file': return '#60A5FA'; // Blue
    case 'link': return '#F5B800'; // Gold
    case 'note': return '#34D399'; // Green
    case 'email': return '#F472B6'; // Pink
    case 'task': return '#A78BFA'; // Purple
    default: return '#9CA3AF'; // Gray
  }
}
