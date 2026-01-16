"use client";

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface LiquidOrbProps {
    color: string;
    state: 'idle' | 'thinking' | 'alert' | 'focus';
    intensity?: number;
}

/**
 * 3D LIQUID COMPONENT
 * The actual mesh that distorts and pulses.
 */
const LiquidMesh: React.FC<LiquidOrbProps> = ({ color, state, intensity = 1 }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<any>(null); // MeshDistortMaterial types are tricky

    // Animation targets
    const targetDistort = useMemo(() => {
        switch (state) {
            case 'thinking': return 0.6; // High turbulence
            case 'alert': return 0.8; // Spiky
            case 'focus': return 0.3; // Tectonically stable
            default: return 0.4; // Gentle flow
        }
    }, [state]);

    const targetSpeed = useMemo(() => {
        switch (state) {
            case 'thinking': return 4;
            case 'alert': return 8;
            case 'focus': return 1;
            default: return 1.5;
        }
    }, [state]);

    useFrame((state, delta) => {
        if (!meshRef.current || !materialRef.current) return;

        // Smooth rotation
        meshRef.current.rotation.y += delta * 0.2;
        meshRef.current.rotation.z += delta * 0.1;

        // Lerp distortion for smooth state transitions
        materialRef.current.distort = THREE.MathUtils.lerp(
            materialRef.current.distort,
            targetDistort,
            delta * 2
        );

        materialRef.current.speed = THREE.MathUtils.lerp(
            materialRef.current.speed,
            targetSpeed,
            delta * 2
        );

        // Color lerp is handled by React Three Fiber usually, but we can ensure smoothness here if needed
    });

    return (
        <Sphere args={[1, 64, 64]} ref={meshRef} scale={1.8}>
            <MeshDistortMaterial
                ref={materialRef}
                color={color}
                envMapIntensity={0.8}
                clearcoat={1}
                clearcoatRoughness={0.1}
                metalness={0.2}
                roughness={0.2}
                distort={0.4} // Initial
                speed={1.5} // Initial
            />
        </Sphere>
    );
};

/**
 * LIQUID ORB CANVAS
 * Setup the 3D scene with automatic WebGL fallback.
 */
export const LiquidOrb: React.FC<LiquidOrbProps> = (props) => {
    const [webglFailed, setWebglFailed] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Check WebGL availability on mount
    useEffect(() => {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                console.warn('[LiquidOrb] WebGL not available, using CSS fallback');
                setWebglFailed(true);
            }
        } catch (e) {
            console.warn('[LiquidOrb] WebGL check failed:', e);
            setWebglFailed(true);
        }
    }, []);

    // If WebGL failed, show CSS fallback immediately
    if (webglFailed) {
        return <CSSFallbackOrb color={props.color} state={props.state} />;
    }

    return (
        <div className="w-full h-full relative cursor-pointer">
            <Canvas
                camera={{ position: [0, 0, 4], fov: 45 }}
                gl={{ alpha: true, antialias: true, failIfMajorPerformanceCaveat: false }}
                onCreated={({ gl }) => {
                    // Listen for WebGL context lost events
                    gl.domElement.addEventListener('webglcontextlost', (e) => {
                        e.preventDefault();
                        console.warn('[LiquidOrb] WebGL context lost, switching to CSS fallback');
                        setWebglFailed(true);
                    });
                }}
            >
                {/* Lighting setup for "Jewel" look */}
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color={props.color} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="white" />

                {/* Floating animation container */}
                <Float
                    speed={2}
                    rotationIntensity={0.5}
                    floatIntensity={0.5}
                    floatingRange={[-0.1, 0.1]}
                >
                    <LiquidMesh {...props} />
                </Float>

                {/* Environment for shiny reflections (Pseudo-Glass) */}
                <Environment preset="city" />
            </Canvas>
        </div>
    );
};

/**
 * CSS-Only Fallback Orb
 * Used when WebGL is unavailable or context is lost.
 */
export const CSSFallbackOrb: React.FC<LiquidOrbProps> = ({ color, state }) => {
    return (
        <div
            className="w-full h-full rounded-full animate-pulse"
            style={{
                background: `radial-gradient(circle at 30% 30%, ${color}90 0%, ${color}60 40%, ${color}30 70%, transparent 100%)`,
                boxShadow: `0 0 40px ${color}40, inset 0 0 20px ${color}20`,
            }}
        />
    );
};
