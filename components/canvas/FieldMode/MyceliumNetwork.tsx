'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Relation } from '@/lib/types';

interface MyceliumNetworkProps {
  edges: Relation[];
  nodePositions: Map<string, [number, number, number]>;
  isActive?: boolean;
}

/**
 * Mycelium Network - Organic threads connecting nodes
 * Inspired by fungal mycelium networks in nature
 */
export default function MyceliumNetwork({ edges, nodePositions, isActive = true }: MyceliumNetworkProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Generate mycelium threads for each edge
  const threads = useMemo(() => {
    return edges.map((edge) => {
      const sourcePos = nodePositions.get(edge.sourceId);
      const targetPos = nodePositions.get(edge.targetId);

      if (!sourcePos || !targetPos) return null;

      // Create curve path with organic variation
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(...sourcePos),
        // Add control points for organic shape
        new THREE.Vector3(
          (sourcePos[0] + targetPos[0]) / 2 + (Math.random() - 0.5) * 0.5,
          (sourcePos[1] + targetPos[1]) / 2 + (Math.random() - 0.5) * 0.5,
          (sourcePos[2] + targetPos[2]) / 2 + (Math.random() - 0.5) * 0.5
        ),
        new THREE.Vector3(...targetPos),
      ]);

      const points = curve.getPoints(30);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      return {
        id: `${edge.sourceId}-${edge.targetId}`,
        geometry,
        weight: edge.weight || 0.5,
        kind: edge.kind,
      };
    }).filter(Boolean);
  }, [edges, nodePositions]);

  // Animate mycelium pulsing
  useFrame(({ clock }) => {
    if (!groupRef.current || !isActive) return;

    const t = clock.getElapsedTime();

    groupRef.current.children.forEach((child, index) => {
      if (child instanceof THREE.Line) {
        const material = child.material as THREE.LineBasicMaterial;

        // Pulsing opacity based on weight
        const phase = (index * 0.3) + t;
        const pulse = (Math.sin(phase * 0.5) + 1) * 0.5; // 0 to 1

        material.opacity = 0.1 + (pulse * 0.3);
      }
    });
  });

  if (!isActive) return null;

  return (
    <group ref={groupRef}>
      {threads.map((thread) => {
        if (!thread) return null;

        // Color based on relationship kind
        const color = thread.kind === 'references' ? '#60A5FA' :
                     thread.kind === 'derives_from' ? '#34D399' :
                     thread.kind === 'related_to' ? '#F59E0B' :
                     '#6B7280';

        return (
          <primitive key={thread.id} object={new THREE.Line(thread.geometry, new THREE.LineBasicMaterial({
            color,
            opacity: 0.2,
            transparent: true,
            linewidth: thread.weight * 2,
          }))} />
        );
      })}
    </group>
  );
}
