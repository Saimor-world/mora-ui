'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import { useMemo, useState } from 'react';
import type { Snapshot, MoraObject } from '@/lib/types';
import MyceliumNetwork from './MyceliumNetwork';
import PilzCap from './BroadcastEffects/PilzCap';
import BroadcastWave from './BroadcastEffects/BroadcastWave';

interface SceneProps {
  snapshot: Snapshot;
  onNodeClick?: (node: MoraObject) => void;
}

function Node({ node, position, onClick, isHovered }: {
  node: MoraObject;
  position: [number, number, number];
  onClick: () => void;
  isHovered: boolean;
}) {
  const color = useMemo(() => {
    switch (node.type) {
      case 'project': return '#F5B800'; // Gold
      case 'document': return '#60A5FA'; // Blue
      case 'code': return '#34D399'; // Green
      case 'insight': return '#F472B6'; // Pink
      default: return '#9CA3AF'; // Gray
    }
  }, [node.type]);

  return (
    <group position={position} onClick={onClick}>
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 0.5 : 0.2}
        />
      </mesh>
      <Text
        position={[0, -0.6, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={2}
      >
        {node.title}
      </Text>
    </group>
  );
}

function Edge({ source, target }: {
  source: [number, number, number];
  target: [number, number, number];
}) {
  return (
    <Line
      points={[source, target]}
      color="#4B5563"
      lineWidth={1}
      opacity={0.3}
      transparent
    />
  );
}

export default function Scene({ snapshot, onNodeClick }: SceneProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [broadcastingNodes, setBroadcastingNodes] = useState<Set<string>>(new Set());

  // Calculate node positions in a circular layout
  const nodePositions = useMemo(() => {
    const positions = new Map<string, [number, number, number]>();
    const radius = 3;
    const angleStep = (2 * Math.PI) / snapshot.nodes.length;

    snapshot.nodes.forEach((node, i) => {
      const angle = i * angleStep;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      positions.set(node.id, [x, 0, z]);
    });

    return positions;
  }, [snapshot.nodes]);

  // Identify "hub" nodes with many connections for Pilz-Caps
  const hubNodes = useMemo(() => {
    const connections = new Map<string, number>();
    snapshot.edges.forEach(edge => {
      connections.set(edge.sourceId, (connections.get(edge.sourceId) || 0) + 1);
      connections.set(edge.targetId, (connections.get(edge.targetId) || 0) + 1);
    });

    // Nodes with 3+ connections get Pilz-Caps
    const hubs = new Set<string>();
    connections.forEach((count, nodeId) => {
      if (count >= 3) hubs.add(nodeId);
    });
    return hubs;
  }, [snapshot.edges]);

  return (
    <Canvas
      camera={{ position: [0, 5, 8], fov: 50 }}
      style={{ background: 'hsl(160, 50%, 7%)' }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Nodes */}
      {snapshot.nodes.map((node) => {
        const position = nodePositions.get(node.id)!;
        return (
          <Node
            key={node.id}
            node={node}
            position={position}
            onClick={() => onNodeClick?.(node)}
            isHovered={hoveredNode === node.id}
          />
        );
      })}

      {/* Mycelium Network - Organic threads between nodes */}
      <MyceliumNetwork
        edges={snapshot.edges}
        nodePositions={nodePositions}
        isActive={true}
      />

      {/* Pilz-Caps on hub nodes (nodes with many connections) */}
      {snapshot.nodes.map((node) => {
        const position = nodePositions.get(node.id);
        if (!position || !hubNodes.has(node.id)) return null;

        const color = node.type === 'project' ? '#F5B800' :
                     node.type === 'document' ? '#60A5FA' :
                     node.type === 'code' ? '#34D399' :
                     node.type === 'insight' ? '#F472B6' : '#9CA3AF';

        return (
          <PilzCap
            key={`pilz-${node.id}`}
            position={[position[0], position[1] + 0.4, position[2]]}
            color={color}
            isActive={true}
          />
        );
      })}

      {/* Broadcast Waves for broadcasting nodes */}
      {Array.from(broadcastingNodes).map((nodeId) => {
        const position = nodePositions.get(nodeId);
        if (!position) return null;

        return (
          <BroadcastWave
            key={`wave-${nodeId}`}
            position={position}
            color="#F5B800"
          />
        );
      })}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={20}
      />

      {/* Grid helper - subtle mycelium-like grid */}
      <gridHelper args={[20, 20, '#1F2937', '#0D1117']} />
    </Canvas>
  );
}
