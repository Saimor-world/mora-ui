'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { Snapshot, MoraObject } from '@/lib/types';
import usePrefersReducedMotion from '@/lib/hooks/usePrefersReducedMotion';

interface MyceliumGraph2DProps {
  snapshot: Snapshot;
  onNodeClick?: (node: MoraObject) => void;
  resetSignal?: number;
  focusNodeId?: string | null;
  onStatsChange?: (stats: GraphStats) => void;
  prefersReducedMotion?: boolean;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  node: MoraObject;
}

export interface GraphStats {
  nodes: number;
  edges: number;
  fps: number;
}

export interface MyceliumGraph2DRef {
  zoomOut: () => void;
  resetView: () => void;
  fitView: () => void;
}

const MyceliumGraph2D = forwardRef<MyceliumGraph2DRef, MyceliumGraph2DProps>(
  (
    {
      snapshot,
      onNodeClick,
      resetSignal = 0,
      focusNodeId = null,
      onStatsChange,
      prefersReducedMotion,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const animationFrameRef = useRef<number>();
    const nodePositionsRef = useRef<Map<string, NodePosition>>(new Map());
    const lastSnapshotRef = useRef<string>('');
    const dragStateRef = useRef({ dragging: false, moved: false, x: 0, y: 0 });
    const edgeMapRef = useRef<Map<string, Set<string>>>(new Map());
    const fpsRef = useRef(60);
    const lastFrameTimeRef = useRef(typeof performance !== 'undefined' ? performance.now() : Date.now());
    const statsThrottleRef = useRef(0);
    const prefersMotionHook = usePrefersReducedMotion();
    const reduceMotion = prefersReducedMotion ?? prefersMotionHook;

    const fitToView = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const nodes = nodePositionsRef.current;
      if (nodes.size === 0) return;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      nodes.forEach((node) => {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
      });

      if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return;

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const padding = 120;
      const boundsWidth = Math.max(1, maxX - minX);
      const boundsHeight = Math.max(1, maxY - minY);
      const scaleX = (width - padding) / boundsWidth;
      const scaleY = (height - padding) / boundsHeight;
      const targetZoom = Math.max(0.4, Math.min(2.5, Math.min(scaleX, scaleY)));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setZoom(targetZoom);
      setPanX(width / 2 - centerX * targetZoom);
      setPanY(height / 2 - centerY * targetZoom);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        zoomOut: () => {
          setZoom((prev) => Math.max(0.3, prev * 0.85));
        },
        resetView: () => {
          setZoom(1);
          setPanX(0);
          setPanY(0);
        },
        fitView: () => fitToView(),
      }),
      [fitToView]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const updateSize = () => {
        const ratio = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      };
      updateSize();
      window.addEventListener('resize', updateSize);

      const nodes = nodePositionsRef.current;
      const snapshotKey = `${snapshot.ts}-${snapshot.nodes.length}`;
      if (nodes.size === 0 || lastSnapshotRef.current !== snapshotKey) {
        lastSnapshotRef.current = snapshotKey;
        nodes.clear();

        const centerX = canvas.offsetWidth / 2;
        const centerY = canvas.offsetHeight / 2;
        const radius = Math.min(canvas.offsetWidth, canvas.offsetHeight) * 0.4;

        snapshot.nodes.forEach((node, index) => {
          const angle = (index / snapshot.nodes.length) * Math.PI * 2;
          nodes.set(node.id, {
            id: node.id,
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            node,
          });
        });

        requestAnimationFrame(() => fitToView());
      }

      const edgeMap = new Map<string, Set<string>>();
      snapshot.edges.forEach((edge) => {
        if (!edgeMap.has(edge.sourceId)) edgeMap.set(edge.sourceId, new Set());
        if (!edgeMap.has(edge.targetId)) edgeMap.set(edge.targetId, new Set());
        edgeMap.get(edge.sourceId)!.add(edge.targetId);
        edgeMap.get(edge.targetId)!.add(edge.sourceId);
      });
      edgeMapRef.current = edgeMap;

      const animate = () => {
        ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

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

        const nodeArray = Array.from(nodes.values());
        const motionFactor = reduceMotion ? 0.5 : 1;

        for (let i = 0; i < nodeArray.length; i++) {
          for (let j = i + 1; j < nodeArray.length; j++) {
            const n1 = nodeArray[i];
            const n2 = nodeArray[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (500 / (dist * dist)) * motionFactor;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }

        snapshot.edges.forEach((edge) => {
          const source = nodes.get(edge.sourceId);
          const target = nodes.get(edge.targetId);
          if (!source || !target) return;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = dist * 0.001 * motionFactor;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        });

        const centerX = canvas.offsetWidth / 2;
        const centerY = canvas.offsetHeight / 2;
        nodeArray.forEach((node) => {
          const dx = centerX - node.x;
          const dy = centerY - node.y;
          node.vx += dx * 0.0001;
          node.vy += dy * 0.0001;
          node.vx *= 0.85;
          node.vy *= 0.85;
          node.x += node.vx;
          node.y += node.vy;

          const margin = 50;
          node.x = Math.min(Math.max(node.x, margin), canvas.offsetWidth - margin);
          node.y = Math.min(Math.max(node.y, margin), canvas.offsetHeight - margin);
        });

        const focusSet = new Set<string>();
        if (focusNodeId) {
          focusSet.add(focusNodeId);
          const neighbors = edgeMap.get(focusNodeId);
          neighbors?.forEach((neighbor) => focusSet.add(neighbor));
        }

        snapshot.edges.forEach((edge) => {
          const source = nodes.get(edge.sourceId);
          const target = nodes.get(edge.targetId);
          if (!source || !target) return;

          const faded =
            focusSet.size > 0 &&
            !focusSet.has(edge.sourceId) &&
            !focusSet.has(edge.targetId);

          const weight = edge.weight || 0.5;
          const controlX = (source.x + target.x) / 2 + (Math.random() - 0.5) * 20 * motionFactor;
          const controlY = (source.y + target.y) / 2 + (Math.random() - 0.5) * 20 * motionFactor;

          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.quadraticCurveTo(controlX, controlY, target.x, target.y);
          ctx.strokeStyle = `rgba(52, 211, 153, ${faded ? 0.08 : weight * 0.3})`;
          ctx.lineWidth = weight * 2;
          ctx.lineCap = 'round';
          ctx.stroke();
        });

        nodeArray.forEach((node) => {
          const isHovered = hoveredNode === node.id;
          const faded = focusSet.size > 0 && !focusSet.has(node.id);
          const baseRadius = faded ? 6 : 8;
          const radius = isHovered ? baseRadius + 4 : baseRadius;
          const color = getNodeColor(node.node.type);

          ctx.globalAlpha = faded ? 0.25 : 1;

          const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 2);
          glow.addColorStop(0, `${color}40`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x - radius / 3, node.y - radius / 3, radius / 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fill();

          if (isHovered) {
            ctx.font = '12px system-ui';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(node.node.title, node.x, node.y + radius + 8);
          }

          ctx.globalAlpha = 1;
        });

        ctx.restore();

        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const delta = now - lastFrameTimeRef.current || 16;
        fpsRef.current = 1000 / delta;
        lastFrameTimeRef.current = now;

        if (onStatsChange && now - statsThrottleRef.current > 500) {
          statsThrottleRef.current = now;
          onStatsChange({
            nodes: snapshot.nodes.length,
            edges: snapshot.edges.length,
            fps: Math.round(fpsRef.current),
          });
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        window.removeEventListener('resize', updateSize);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [snapshot, hoveredNode, zoom, panX, panY, fitToView, focusNodeId, reduceMotion, onStatsChange]);

    useEffect(() => {
      fitToView();
    }, [resetSignal, fitToView]);

    const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      const nextZoom = Math.max(0.3, Math.min(3, zoom * delta));

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const worldX = (mouseX - panX) / zoom;
      const worldY = (mouseY - panY) / zoom;

      setZoom(nextZoom);
      setPanX(mouseX - worldX * nextZoom);
      setPanY(mouseY - worldY * nextZoom);
    };

    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
      dragStateRef.current = {
        dragging: true,
        moved: false,
        x: event.clientX,
        y: event.clientY,
      };
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (dragStateRef.current.dragging) {
        const dx = event.clientX - dragStateRef.current.x;
        const dy = event.clientY - dragStateRef.current.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          dragStateRef.current.moved = true;
        }
        dragStateRef.current.x = event.clientX;
        dragStateRef.current.y = event.clientY;
        setPanX((prev) => prev + dx);
        setPanY((prev) => prev + dy);
        canvas.style.cursor = 'grabbing';
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left - panX) / zoom;
      const y = (event.clientY - rect.top - panY) / zoom;

      let found: string | null = null;
      nodePositionsRef.current.forEach((node) => {
        const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        if (dist < 12) {
          found = node.id;
        }
      });

      setHoveredNode(found);
      canvas.style.cursor = found ? 'pointer' : 'default';
    };

    const handleMouseUp = () => {
      dragStateRef.current.dragging = false;
    };

    const handleMouseLeave = () => {
      dragStateRef.current.dragging = false;
      dragStateRef.current.moved = false;
      setHoveredNode(null);
    };

    const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (dragStateRef.current.moved) {
        dragStateRef.current.moved = false;
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left - panX) / zoom;
      const y = (event.clientY - rect.top - panY) / zoom;

      nodePositionsRef.current.forEach((node) => {
        const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        if (dist < 12) {
          onNodeClick?.(node.node);
        }
      });
    };

    return (
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onWheel={handleWheel}
      />
    );
  }
);

MyceliumGraph2D.displayName = 'MyceliumGraph2D';

export default MyceliumGraph2D;

function getNodeColor(type: string): string {
  switch (type) {
    case 'file':
      return '#60A5FA';
    case 'link':
      return '#F5B800';
    case 'note':
      return '#34D399';
    case 'email':
      return '#F472B6';
    case 'task':
      return '#A78BFA';
    default:
      return '#9CA3AF';
  }
}
