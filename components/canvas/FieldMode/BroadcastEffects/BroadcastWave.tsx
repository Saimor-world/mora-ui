'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BroadcastWaveProps {
  position: [number, number, number];
  color: string;
  onComplete?: () => void;
}

/**
 * Animated expanding wave ring (ripple effect)
 */
export default function BroadcastWave({ position, color, onComplete }: BroadcastWaveProps) {
  const waveRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());

  useFrame(() => {
    if (!waveRef.current) return;

    const elapsed = (Date.now() - startTime.current) / 1000;
    const duration = 2; // 2 seconds

    if (elapsed >= duration) {
      onComplete?.();
      return;
    }

    const progress = elapsed / duration;

    // Expand outward
    const scale = 1 + progress * 8;
    waveRef.current.scale.set(scale, scale, 1);

    // Fade out
    const material = waveRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 1 - progress;

    // Rise slightly
    waveRef.current.position.y = position[1] + progress * 0.5;
  });

  return (
    <mesh ref={waveRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1.0, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
