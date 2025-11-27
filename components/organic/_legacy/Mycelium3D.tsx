"use client";

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// MYCELIUM 3D - Semantic Network Visualization
// ============================================================================
// Das Myzelium IST die Daten - organisch, lebendig, semantisch vernetzt
// Nodes = Sporen, Connections = Hyphen, Cluster = Fruchtkörper
// ============================================================================

interface MyceliumNode {
    id: string;
    title: string;
    type: string;
    position: [number, number, number];
    color: string;
    size: number;
    connections: string[]; // IDs of connected nodes
}

interface Mycelium3DProps {
    nodes: MyceliumNode[];
    onNodeClick?: (nodeId: string) => void;
    activeNodeId?: string | null;
    variant?: 'department' | 'space' | 'folder' | 'node';
}

// Node Component - Organic Spore
function MyceliumSpore({
    node,
    isActive,
    onClick
}: {
    node: MyceliumNode;
    isActive: boolean;
    onClick: () => void;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = React.useState(false);

    // Breathing animation
    useFrame((state) => {
        if (meshRef.current) {
            const pulse = Math.sin(state.clock.elapsedTime * 2 + node.position[0]) * 0.1 + 1;
            meshRef.current.scale.setScalar(
                (isActive ? 1.5 : hovered ? 1.2 : 1) * pulse
            );
        }
    });

    return (
        <group position={node.position}>
            <mesh
                ref={meshRef}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                    setHovered(false);
                    document.body.style.cursor = 'default';
                }}
            >
                <sphereGeometry args={[node.size, 16, 16]} />
                <meshPhongMaterial
                    color={isActive ? '#CEB676' : hovered ? '#10B981' : node.color}
                    emissive={isActive ? '#CEB676' : hovered ? '#10B981' : node.color}
                    emissiveIntensity={isActive ? 0.5 : hovered ? 0.3 : 0.2}
                    transparent
                    opacity={0.85}
                />
            </mesh>

            {/* Glow effect */}
            <pointLight
                color={isActive ? '#CEB676' : node.color}
                intensity={isActive ? 0.8 : 0.3}
                distance={3}
            />

            {/* Label */}
            {(hovered || isActive) && (
                <Html distanceFactor={10} position={[0, node.size + 0.5, 0]}>
                    <div className="px-3 py-1 bg-mora-forest/90 backdrop-blur-sm border border-mora-gold/30 rounded-full text-xs text-emerald-100 whitespace-nowrap pointer-events-none">
                        {node.title}
                    </div>
                </Html>
            )}
        </group>
    );
}

// Connection Component - Organic Hypha
function MyceliumHypha({
    start,
    end,
    isActive
}: {
    start: [number, number, number];
    end: [number, number, number];
    isActive: boolean;
}) {
    const lineRef = useRef<THREE.Line>(null);

    // Create curved path (more organic)
    const curve = useMemo(() => {
        const midPoint = new THREE.Vector3(
            (start[0] + end[0]) / 2 + (Math.random() - 0.5) * 2,
            (start[1] + end[1]) / 2 + (Math.random() - 0.5) * 2,
            (start[2] + end[2]) / 2 + (Math.random() - 0.5) * 2
        );
        return new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(...start),
            midPoint,
            new THREE.Vector3(...end)
        );
    }, [start, end]);

    const points = curve.getPoints(20);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // Animate flow
    useFrame((state) => {
        if (lineRef.current) {
            const material = lineRef.current.material as THREE.LineBasicMaterial;
            material.opacity = isActive
                ? 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.2
                : 0.2 + Math.sin(state.clock.elapsedTime) * 0.1;
        }
    });

    return (
        <line ref={lineRef} geometry={geometry}>
            <lineBasicMaterial
                color={isActive ? '#CEB676' : '#10B981'}
                transparent
                opacity={0.3}
                linewidth={isActive ? 2 : 1}
            />
        </line>
    );
}

// Main Scene Component
function MyceliumScene({
    nodes,
    onNodeClick,
    activeNodeId
}: Omit<Mycelium3DProps, 'variant'>) {
    const groupRef = useRef<THREE.Group>(null);

    // Gentle rotation
    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.001;
        }
    });

    // Build connection map
    const connections = useMemo(() => {
        const conns: Array<{
            start: [number, number, number];
            end: [number, number, number];
            isActive: boolean;
        }> = [];

        nodes.forEach((node) => {
            node.connections.forEach((targetId) => {
                const targetNode = nodes.find((n) => n.id === targetId);
                if (targetNode) {
                    const isActive =
                        activeNodeId === node.id ||
                        activeNodeId === targetId;

                    conns.push({
                        start: node.position,
                        end: targetNode.position,
                        isActive,
                    });
                }
            });
        });

        return conns;
    }, [nodes, activeNodeId]);

    return (
        <group ref={groupRef}>
            {/* Ambient lighting */}
            <ambientLight intensity={0.3} color="#0A2A25" />
            <directionalLight position={[10, 10, 5]} intensity={0.5} color="#10B981" />
            <pointLight position={[0, 0, 0]} intensity={0.4} color="#CEB676" />

            {/* Connections (Hyphae) */}
            {connections.map((conn, i) => (
                <MyceliumHypha
                    key={i}
                    start={conn.start}
                    end={conn.end}
                    isActive={conn.isActive}
                />
            ))}

            {/* Nodes (Spores) */}
            {nodes.map((node) => (
                <MyceliumSpore
                    key={node.id}
                    node={node}
                    isActive={activeNodeId === node.id}
                    onClick={() => onNodeClick?.(node.id)}
                />
            ))}
        </group>
    );
}

// Main Export Component
export function Mycelium3D({
    nodes,
    onNodeClick,
    activeNodeId,
    variant = 'folder'
}: Mycelium3DProps) {
    if (nodes.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-emerald-500/30 text-sm">
                <div className="text-center">
                    <div className="text-2xl mb-2">∅</div>
                    <div>No nodes to visualize</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative">
            <Canvas
                camera={{ position: [0, 0, 20], fov: 50 }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance'
                }}
                style={{ background: 'transparent' }}
            >
                <MyceliumScene
                    nodes={nodes}
                    onNodeClick={onNodeClick}
                    activeNodeId={activeNodeId}
                />
                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    autoRotate={false}
                    maxDistance={50}
                    minDistance={5}
                />
            </Canvas>

            {/* Overlay Info */}
            <div className="absolute bottom-4 left-4 text-[10px] text-emerald-500/30 uppercase tracking-wider pointer-events-none font-mono">
                Mycelium Network • {nodes.length} Nodes • {variant.toUpperCase()} View
            </div>
        </div>
    );
}
