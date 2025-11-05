'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PilzCapProps {
  position: [number, number, number];
  color: string;
  isActive: boolean;
}

/**
 * 3D Pilz-Cap (Mushroom Cap) that grows on nodes during broadcast
 */
export default function PilzCap({ position, color, isActive }: PilzCapProps) {
  const capRef = useRef<THREE.Mesh>(null);
  const stemRef = useRef<THREE.Mesh>(null);

  // Animate growth
  useEffect(() => {
    if (!stemRef.current || !capRef.current || !isActive) return;

    const startTime = Date.now();
    const duration = 500;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (stemRef.current) {
        stemRef.current.scale.y = progress;
      }

      if (capRef.current && progress > 0.3) {
        const capProgress = (progress - 0.3) / 0.7;
        capRef.current.scale.set(capProgress, capProgress, capProgress);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [isActive]);

  // Animate the cap (breathing effect)
  useFrame(({ clock }) => {
    if (capRef.current && isActive) {
      const t = clock.getElapsedTime();
      capRef.current.scale.y = 1 + Math.sin(t * 2) * 0.1;
      capRef.current.rotation.y = t * 0.5;
    }
  });

  if (!isActive) return null;

  return (
    <group position={position}>
      {/* Stem (Stiel) */}
      <mesh ref={stemRef} position={[0, 0.8, 0]} scale={[1, 0, 1]}>
        <cylinderGeometry args={[0.05, 0.08, 0.6, 8]} />
        <meshStandardMaterial color="#E8D5B5" />
      </mesh>

      {/* Cap (Kappe) */}
      <mesh ref={capRef} position={[0, 1.3, 0]} scale={0}>
        <sphereGeometry args={[0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Dots on cap (Punkte) */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        const radius = 0.2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <mesh key={i} position={[x, 1.35, z]} scale={0.04}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#ffffff" opacity={0.8} transparent />
          </mesh>
        );
      })}
    </group>
  );
}
