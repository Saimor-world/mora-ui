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
import type { SemanticEvent } from '@/lib/api/semantic';

interface MyceliumGraph2DProps {
  snapshot: Snapshot;
  onNodeClick?: (node: MoraObject) => void;
  resetSignal?: number;
  focusNodeId?: string | null;
  onStatsChange?: (stats: GraphStats) => void;
  prefersReducedMotion?: boolean;
  selectedNodeId?: string | null;
  semanticEvents?: SemanticEvent[];
  ambientSignalStrength?: number;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  node: MoraObject;
  radius: number;
  seed: number;
}

/**
 * Event-driven visual signal for nodes/edges
 * - strength: 0-1, combined intensity * severity
 * - live: true if event is currently active
 * - severity: 0-1, from SemanticEvent
 */
interface EventSignal {
  strength: number;
  live: boolean;
  severity: number;
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
      selectedNodeId = null,
      semanticEvents = [],
      ambientSignalStrength = 0,
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
    const pulseMapRef = useRef<Map<string, number>>(new Map());
    const fpsRef = useRef(60);
    const lastFrameTimeRef = useRef(
      typeof performance !== 'undefined' ? performance.now() : Date.now()
    );
    const statsThrottleRef = useRef(0);
    const prefersMotionHook = usePrefersReducedMotion();
    const reduceMotion = prefersReducedMotion ?? prefersMotionHook;
    const seenEventsRef = useRef<Map<string, number>>(new Map());
    const eventCacheRef = useRef<Map<string, SemanticEvent>>(new Map());
    const currentEventIdsRef = useRef<Set<string>>(new Set());

    /**
     * Semantic Events Integration
     * - Builds event map: entity_id + related_objects → SemanticEvent
     * - Triggers pulse on new events (severity-based)
     * - Maintains event cache for decay animation
     * - Only runs when semanticEvents changes
     */
    const eventMapRef = useRef<Map<string, SemanticEvent>>(new Map());
    useEffect(() => {
      const map = new Map<string, SemanticEvent>();
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const activeIds = new Set<string>();

      // Process incoming events
      semanticEvents.forEach((evt) => {
        activeIds.add(evt.event_id);
        map.set(evt.entity_id, evt);
        evt.related_objects.forEach((objId) => {
          if (!map.has(objId)) {
            map.set(objId, evt);
          }
        });

        // Trigger pulse for NEW events only
        if (!eventCacheRef.current.has(evt.event_id)) {
          const severityPulse = Math.max(0.2, Math.min(1, evt.severity ?? 0.8));
          const basePulse = 0.55 + severityPulse * 0.65;
          const currentPulse = pulseMapRef.current.get(evt.entity_id) ?? 0;
          pulseMapRef.current.set(evt.entity_id, Math.max(currentPulse, basePulse));
          evt.related_objects.forEach((id) => {
            const relatedPulse = pulseMapRef.current.get(id) ?? 0;
            pulseMapRef.current.set(id, Math.max(relatedPulse, basePulse * 0.9));
          });
        }

        seenEventsRef.current.set(evt.event_id, now);
        eventCacheRef.current.set(evt.event_id, evt);
      });

      // Keep cached events in map for decay animation
      eventCacheRef.current.forEach((evt) => {
        if (!map.has(evt.entity_id)) {
          map.set(evt.entity_id, evt);
        }
        evt.related_objects.forEach((objId) => {
          if (!map.has(objId)) {
            map.set(objId, evt);
          }
        });
      });

      currentEventIdsRef.current = activeIds;
      eventMapRef.current = map;
    }, [semanticEvents]);

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

    /**
     * Main Animation Loop
     * - Initializes node positions (force-directed layout)
     * - Updates canvas size on resize
     * - Renders nodes, edges, ambient glow
     * - Handles semantic event signals (golden pulses, edge shimmer)
     * - Decays pulses over time
     * - Runs ~60 FPS via requestAnimationFrame
     */
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
        const envelope = Math.min(canvas.offsetWidth, canvas.offsetHeight) * 0.38;

        snapshot.nodes.forEach((node, index) => {
          const ratio = Math.max(1, snapshot.nodes.length);
          const angle = (index / ratio) * Math.PI * 2;
          const ring = 0.68 + ((index % 5) * 0.04);
          const jitter = envelope * 0.05;
          nodes.set(node.id, {
            id: node.id,
            x: centerX + Math.cos(angle) * envelope * ring + (Math.random() - 0.5) * jitter,
            y: centerY + Math.sin(angle) * envelope * ring + (Math.random() - 0.5) * jitter,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            node,
            radius: 6 + Math.random() * 5,
            seed: Math.random() * 2000,
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
        const time = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const delta = time - lastFrameTimeRef.current || 16;
        const deltaSeconds = delta / 1000;
        fpsRef.current = 1000 / delta;
        lastFrameTimeRef.current = time;

        const pulses = pulseMapRef.current;
        if (pulses.size > 0) {
          pulses.forEach((value, key) => {
            const decay = value - deltaSeconds * (reduceMotion ? 0.8 : 1.2);
            if (decay <= 0) {
              pulses.delete(key);
            } else {
              pulses.set(key, decay);
            }
          });
        }

        // Build signal maps for visual feedback (per frame)
        const nodeSignals = new Map<string, EventSignal>();
        const edgeSignals = new Map<string, EventSignal>();
        const activeIds = currentEventIdsRef.current;
        eventCacheRef.current.forEach((evt, id) => {
          const lastSeen = seenEventsRef.current.get(id);
          if (lastSeen === undefined) return;
          const age = time - lastSeen;
          const intensity = activeIds.has(id) ? 1 : Math.max(0, 1 - age / 1200);
          if (intensity <= 0) {
            seenEventsRef.current.delete(id);
            eventCacheRef.current.delete(id);
            return;
          }
          const severity = Math.max(0.2, Math.min(1, evt.severity ?? 0.6));
          const strength = intensity * severity;

          const addNode = (nodeId: string) => {
            const existing = nodeSignals.get(nodeId);
            if (!existing || existing.strength < strength) {
              nodeSignals.set(nodeId, { strength, live: activeIds.has(id), severity });
            }
          };
          addNode(evt.entity_id);
          evt.related_objects.forEach(addNode);

          evt.related_objects.forEach((relatedId) => {
            const edgeKey = createEdgeKey(evt.entity_id, relatedId);
            const existing = edgeSignals.get(edgeKey);
            if (!existing || existing.strength < strength) {
              edgeSignals.set(edgeKey, { strength, live: activeIds.has(id), severity });
            }
          });
        });

        ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        const background = ctx.createRadialGradient(
          canvas.offsetWidth / 2,
          canvas.offsetHeight / 2,
          0,
          canvas.offsetWidth / 2,
          canvas.offsetHeight / 2,
          Math.max(canvas.offsetWidth, canvas.offsetHeight) * 0.55
        );
        background.addColorStop(0, 'rgba(5, 20, 15, 0.95)');
        background.addColorStop(0.5, 'rgba(12, 35, 25, 0.92)');
        background.addColorStop(1, 'rgba(5, 15, 12, 1)');
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        const ambientStrength =
          !reduceMotion && typeof ambientSignalStrength === 'number'
            ? Math.max(0, Math.min(1, ambientSignalStrength))
            : 0;
        if (ambientStrength > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const shimmerPhase = (Math.sin(time / (1200 - ambientStrength * 200)) + 1) / 2;
          ctx.globalAlpha = 0.06 + ambientStrength * 0.08 * shimmerPhase;
          const ambient = ctx.createRadialGradient(
            canvas.offsetWidth / 2,
            canvas.offsetHeight / 2,
            Math.min(canvas.offsetWidth, canvas.offsetHeight) * 0.15,
            canvas.offsetWidth / 2,
            canvas.offsetHeight / 2,
            Math.max(canvas.offsetWidth, canvas.offsetHeight) * 0.6
          );
          ambient.addColorStop(0, 'rgba(248,191,77,0.15)');
          ambient.addColorStop(1, 'rgba(26,58,46,0.05)');
          ctx.fillStyle = ambient;
          ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
          ctx.restore();
        }

        const nodeArray = Array.from(nodes.values());
        const motionFactor = reduceMotion ? 0.35 : 1;

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
          const force = dist * 0.0012 * motionFactor;
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
          node.vx += dx * 0.00008;
          node.vy += dy * 0.00008;
          node.vx *= reduceMotion ? 0.88 : 0.82;
          node.vy *= reduceMotion ? 0.88 : 0.82;
          node.x += node.vx;
          node.y += node.vy;

          const margin = 60;
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

          const edgeKey = createEdgeKey(edge.sourceId, edge.targetId);
          const eventSignal = edgeSignals.get(edgeKey);
          const highlighted =
            focusSet.size > 0 &&
            (focusSet.has(edge.sourceId) || focusSet.has(edge.targetId));
          const faded =
            focusSet.size > 0 &&
            !focusSet.has(edge.sourceId) &&
            !focusSet.has(edge.targetId);

          const energySeed = (source.seed + target.seed) / 2;
          // Organischere Linien: subtilere Bewegung, mehr Variation
          const swayX = Math.sin((time + energySeed) / (reduceMotion ? 2800 : 1800)) * 12 * motionFactor;
          const swayY = Math.cos((time + energySeed * 1.3) / 2200) * 10 * motionFactor;
          const perpX = -(target.y - source.y);
          const perpY = (target.x - source.x);
          const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
          const controlX = (source.x + target.x) / 2 + (perpX / perpLen) * swayX;
          const controlY = (source.y + target.y) / 2 + (perpY / perpLen) * swayY;

          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.quadraticCurveTo(controlX, controlY, target.x, target.y);
          const organicVariance = 1 + Math.sin((time + energySeed) / (reduceMotion ? 3000 : 2000)) * 0.08;
          const shimmer =
            reduceMotion || faded ? 0 : Math.sin((time + energySeed) / 2000) * 0.03;
          const eventShimmer =
            eventSignal && !reduceMotion
              ? Math.abs(Math.sin(time / (1200 - eventSignal.strength * 220))) *
                (0.12 + eventSignal.strength * 0.22)
              : 0;
          const seedShift = (Math.sin((energySeed % 7) * 0.3) + 1) * 0.015;
          const baseAlpha = faded ? 0.03 : highlighted ? 0.28 : 0.10 + seedShift;
          const edgeAlpha = Math.max(0.03, (baseAlpha + shimmer + eventShimmer) * organicVariance);
          const isSelectedEdge =
            selectedNodeId &&
            (edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId);
          if (eventSignal && !reduceMotion) {
            ctx.setLineDash([14, 26]);
            ctx.lineDashOffset = (time / (1200 - eventSignal.strength * 180)) * 14;
          } else {
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
          }
          // Waldgrün/Gold/Nebelblau Palette für Edges
          ctx.strokeStyle =
            highlighted || isSelectedEdge || eventSignal
              ? `rgba(248, 191, 77, ${Math.min(
                  0.9,
                  edgeAlpha + (eventSignal ? 0.25 * eventSignal.strength : 0)
                )})`
              : `rgba(107, 142, 158, ${edgeAlpha * 0.9})`; // Nebelblau
          ctx.lineWidth =
            (edge.weight || 0.8) *
            (highlighted || isSelectedEdge ? 2.2 : 1.2) *
            organicVariance *
            (1 + (eventSignal?.strength ?? 0) * 0.4);
          ctx.lineCap = 'round';
          ctx.stroke();
          if (eventSignal && !reduceMotion) {
            ctx.setLineDash([]);
          }
        });

        nodeArray.forEach((node) => {
          const isHovered = hoveredNode === node.id;
          const isFocus = focusNodeId === node.id;
          const isSelected = selectedNodeId === node.id;
          const isNeighbor = !!focusNodeId && edgeMap.get(focusNodeId)?.has(node.id);
          const nodeSignal = nodeSignals.get(node.id);
          const eventStrength = nodeSignal?.strength ?? 0;
          const pulseStrength = Math.max(pulses.get(node.id) ?? 0, eventStrength * 0.85);
          const focusPresence =
            focusSet.size === 0
              ? 1
              : isFocus
              ? 1
              : isNeighbor
              ? 0.8
              : 0.25;
          const pulse =
            reduceMotion || focusSet.size === 0
              ? 0
              : Math.sin((time + node.seed) / 900) * 0.15;
          // Breathing Animation (0.3–0.7 Hz → ~2000ms period)
          const breathingFreq = 0.5; // 0.5 Hz = 2 seconds period
          const breathing = reduceMotion ? 0 : Math.sin(time / (1000 / breathingFreq)) * 0.08;
          const hoverBoost = isHovered ? 1.2 : 1;
          const radius =
            node.radius *
            (1 + pulse + pulseStrength * 0.5 + breathing + eventStrength * 0.3) *
            hoverBoost;
          const baseColor = getNodeColor(node.node.type);

          ctx.globalAlpha = focusPresence;

          const glowRadius = radius * (isFocus || isSelected ? 3.2 : 2.3) * (1 + pulseStrength * 0.5);
          const glow = ctx.createRadialGradient(
            node.x,
            node.y,
            0,
            node.x,
            node.y,
            glowRadius
          );
          // Subtilerer Glow
          const glowOpacity = Math.min(
            0.45,
            (isFocus ? 0.32 : 0.22) +
              pulseStrength * 0.18 +
              eventStrength * 0.22 +
              (reduceMotion ? 0 : 0.03 * Math.sin((time + node.seed) / 1600))
          );
          glow.addColorStop(0, hexToRgba(baseColor, glowOpacity));
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = baseColor;
          ctx.fill();

          if (eventStrength > 0.02) {
            const eventGlow = ctx.createRadialGradient(
              node.x,
              node.y,
              0,
              node.x,
              node.y,
              radius * (2.4 + eventStrength)
            );
            eventGlow.addColorStop(0, `rgba(248,191,77,${0.35 * eventStrength})`);
            eventGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = eventGlow;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * (2.5 + eventStrength), 0, Math.PI * 2);
            ctx.fill();
          }

          // soft outline echoes
          const outlineAlpha = isFocus || isSelected ? 0.45 : isHovered ? 0.22 : isNeighbor ? 0.16 : 0.1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + (isSelected ? 6 : 4), 0, Math.PI * 2);
          ctx.strokeStyle = hexToRgba(baseColor, outlineAlpha);
          ctx.lineWidth = isFocus || isSelected ? 3 : 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(node.x - radius / 3, node.y - radius / 3, radius / 2.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fill();

          if (isFocus) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(248,191,77,0.85)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          if (eventStrength > 0.05) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 6 + eventStrength * 10, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(248,191,77,${0.35 * eventStrength})`;
            ctx.lineWidth = 1.2 + eventStrength * 2.4;
            ctx.stroke();
          }

          if (isHovered) {
            ctx.font = '12px system-ui';
            ctx.fillStyle = '#f5fdf7';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(node.node.title, node.x, node.y + radius + 8);
          }

          if (pulseStrength > 0.05 && !reduceMotion) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * (1.8 + pulseStrength), 0, Math.PI * 2);
            ctx.strokeStyle =
              eventStrength > 0
                ? `rgba(248,191,77, ${0.22 * Math.max(pulseStrength, eventStrength)})`
                : hexToRgba(baseColor, 0.18 * pulseStrength);
            ctx.lineWidth = 2 * pulseStrength;
            ctx.stroke();
          }

          ctx.globalAlpha = 1;
        });

        if (focusNodeId && !reduceMotion) {
          const focusNode = nodes.get(focusNodeId);
          if (focusNode) {
            const aura = ctx.createRadialGradient(
              focusNode.x,
              focusNode.y,
              0,
              focusNode.x,
              focusNode.y,
              180
            );
            aura.addColorStop(0, 'rgba(248,191,77,0.18)');
            aura.addColorStop(1, 'transparent');
            ctx.fillStyle = aura;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(
              focusNode.x - 200,
              focusNode.y - 200,
              400,
              400
            );
            ctx.globalAlpha = 1;
          }
        }

        ctx.restore();

        if (onStatsChange && time - statsThrottleRef.current > 500) {
          statsThrottleRef.current = time;
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
          safeCancelFrame(animationFrameRef.current);
        }
      };
    }, [
      snapshot,
      hoveredNode,
      zoom,
      panX,
      panY,
      fitToView,
      focusNodeId,
      reduceMotion,
      onStatsChange,
      selectedNodeId,
      ambientSignalStrength,
    ]);

      useEffect(() => {
        if (!focusNodeId || reduceMotion) return;
        pulseMapRef.current.set(focusNodeId, 1);
      }, [focusNodeId, reduceMotion]);

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
        if (dist < Math.max(12, node.radius + 4)) {
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
        if (dist < Math.max(12, node.radius + 2)) {
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
  // Waldgrün, Gold, Nebelblau Palette
  switch (type) {
    case 'file':
      return '#7FA4B8'; // Nebelblau
    case 'link':
      return '#D4AF37'; // Gold
    case 'note':
      return '#4A7C24'; // Waldgrün
    case 'email':
      return '#8DB4C8'; // Helles Nebelblau
    case 'task':
      return '#F5B800'; // Helles Gold
    default:
      return '#6B8E9E'; // Dunkles Nebelblau
  }
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const bigint = parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function safeCancelFrame(id: number) {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(id);
    return;
  }
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(id);
    return;
  }
  clearTimeout(id as unknown as number);
}

function createEdgeKey(a: string, b: string) {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}
