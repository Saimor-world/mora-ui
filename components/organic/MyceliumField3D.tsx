"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { MyceliumNode } from '@/lib/utils/myceliumDataMapper';
import { MyceliumShaders } from './shaders/MyceliumShaders';

interface MyceliumField3DProps {
    nodes?: MyceliumNode[];
    onNodeClick?: (nodeId: string) => void;
    activeNodeId?: string | null;
}

const SCALE_FACTOR = 0.5; // Adjust spread

// We need to attach attributes in a useEffect because <instancedMesh> creates the geometry instance
const SporeCloudWithAttributes = (props: MyceliumField3DProps) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { nodes } = props;

    // Data preparation for Instances
    const { count, positionArray, colorArray, scaleArray, phaseArray } = useMemo(() => {
        const count = nodes?.length || 0;
        const colorArray = new Float32Array(count * 3);
        const positionArray = new Float32Array(count * 3);
        const scaleArray = new Float32Array(count);
        const phaseArray = new Float32Array(count);

        nodes?.forEach((node, i) => {
            const c = new THREE.Color(node.color || '#ffffff');
            c.toArray(colorArray, i * 3);

            const x = (node.position[0] - 0.5) * 100 * SCALE_FACTOR;
            const y = (node.position[1] - 0.5) * 100 * SCALE_FACTOR; // Invert Y for screen coords?
            const z = (node.position[2]) * 40 * SCALE_FACTOR;

            positionArray[i * 3] = x;
            positionArray[i * 3 + 1] = -y; // SVG y is down, 3D y is up
            positionArray[i * 3 + 2] = z;

            scaleArray[i] = Math.max(node.size * 8, 2.0);
            phaseArray[i] = Math.random() * Math.PI * 2;
        });

        return { count, colorArray, positionArray, scaleArray, phaseArray };
    }, [nodes]);

    useEffect(() => {
        if (meshRef.current) {
            const geometry = meshRef.current.geometry;
            geometry.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(positionArray, 3));
            geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colorArray, 3));
            geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scaleArray, 1));
            geometry.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phaseArray, 1));
        }
    }, [count, positionArray, colorArray, scaleArray, phaseArray]);

    // Redefine frame loop here to access meshRef correctly
    const shaderRef = useRef<THREE.ShaderMaterial>(null);
    const hoverRef = useRef<number>(-1);
    const { camera, raycaster, pointer } = useThree();

    useFrame((state) => {
        if (shaderRef.current) {
            shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;

            raycaster.setFromCamera(pointer, camera);
            if (meshRef.current) {
                const intersects = raycaster.intersectObject(meshRef.current);
                if (intersects.length > 0) {
                    const instanceId = intersects[0].instanceId;
                    if (instanceId !== undefined) {
                        hoverRef.current = instanceId;
                        shaderRef.current.uniforms.uHoverId.value = instanceId;
                        document.body.style.cursor = 'pointer';
                    }
                } else {
                    hoverRef.current = -1;
                    shaderRef.current.uniforms.uHoverId.value = -1;
                    document.body.style.cursor = 'auto';
                }
            }

            if (props.activeNodeId && nodes) {
                const selectedIndex = nodes.findIndex(n => n.id === props.activeNodeId);
                shaderRef.current.uniforms.uSelectedId.value = selectedIndex;
            } else {
                shaderRef.current.uniforms.uSelectedId.value = -1;
            }
        }
    });

    const handleClick = (e: any) => {
        e.stopPropagation();
        if (hoverRef.current !== -1 && nodes && props.onNodeClick) {
            const node = nodes[hoverRef.current];
            if (node) props.onNodeClick(node.id);
        }
    };

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} onClick={handleClick}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial
                ref={shaderRef}
                vertexShader={MyceliumShaders.vertex}
                fragmentShader={MyceliumShaders.fragment}
                uniforms={{
                    uTime: { value: 0 },
                    uHoverId: { value: -1 },
                    uSelectedId: { value: -1 }
                }}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
            />
        </instancedMesh>
    );
};

// Connections Component (Simple Lines for now)
const Connections = ({ nodes }: { nodes: MyceliumNode[] }) => {
    const lines = useMemo(() => {
        // Let's implement LineSegments manually for performance
        const points: number[] = [];
        const colors: number[] = [];

        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        nodes.forEach(node => {
            if (!node.connections) return;
            node.connections.forEach(targetId => {
                const target = nodeMap.get(targetId);
                if (target && node.id < target.id) {
                    // Start
                    points.push(
                        (node.position[0] - 0.5) * 100 * SCALE_FACTOR,
                        -(node.position[1] - 0.5) * 100 * SCALE_FACTOR,
                        node.position[2] * 40 * SCALE_FACTOR
                    );

                    // End
                    points.push(
                        (target.position[0] - 0.5) * 100 * SCALE_FACTOR,
                        -(target.position[1] - 0.5) * 100 * SCALE_FACTOR,
                        target.position[2] * 40 * SCALE_FACTOR
                    );

                    // Color (mix)
                    // Semantic (diff types) vs Structural
                    const isSemantic = node.type !== target.type;
                    const c = isSemantic ? new THREE.Color('#10B981') : new THREE.Color('#065f46');
                    colors.push(c.r, c.g, c.b);
                    colors.push(c.r, c.g, c.b);
                }
            });
        });

        if (points.length === 0) return null;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        return (
            <lineSegments geometry={geometry}>
                <lineBasicMaterial vertexColors opacity={0.2} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
            </lineSegments>
        );
    }, [nodes]);

    return <>{lines}</>;
};


export const MyceliumField3D = (props: MyceliumField3DProps) => {
    return (
        <div className="w-full h-full bg-[#030806]">
            <Canvas camera={{ position: [0, 0, 40], fov: 50 }}>
                <PerspectiveCamera makeDefault position={[0, 0, 40]} />
                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={false /* 2.5D Mode */}
                    mouseButtons={{
                        LEFT: THREE.MOUSE.PAN,
                        MIDDLE: THREE.MOUSE.DOLLY,
                        RIGHT: THREE.MOUSE.ROTATE
                    }}
                />

                <SporeCloudWithAttributes {...props} />
                <Connections nodes={props.nodes || []} />

                <Environment preset="city" />
            </Canvas>
        </div>
    );
};
