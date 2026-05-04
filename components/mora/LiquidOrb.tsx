"use client";

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useOrbStore } from '@/lib/store/orbStore';

let WEBGL_UNAVAILABLE = false;
let WEBGL_CONTEXT_LOST_LOGGED = false;
const WEBGL_DISABLED_BY_ENV = (() => {
    const flag = process.env.NEXT_PUBLIC_DISABLE_WEBGL;
    if (flag === 'true') return true;
    if (flag === 'false') return false;
    return process.env.NODE_ENV !== 'production';
})();

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
    const hasProactiveAlert = useOrbStore((s) => s.hasProactiveAlert);
    const effectiveColor = hasProactiveAlert ? '#f59e0b' : props.color;
    const [webglFailed, setWebglFailed] = useState(() => WEBGL_UNAVAILABLE || WEBGL_DISABLED_BY_ENV);
    const glRef = useRef<THREE.WebGLRenderer | null>(null);

    const markWebglFailed = useCallback((reason: string) => {
        if (!WEBGL_CONTEXT_LOST_LOGGED) {
            console.warn(`[LiquidOrb] ${reason}, switching to CSS fallback`);
            WEBGL_CONTEXT_LOST_LOGGED = true;
        }
        WEBGL_UNAVAILABLE = true;
        setWebglFailed(true);
    }, []);

    // Check WebGL availability on mount
    useEffect(() => {
        if (WEBGL_DISABLED_BY_ENV) {
            WEBGL_UNAVAILABLE = true;
            if (!WEBGL_CONTEXT_LOST_LOGGED && process.env.NODE_ENV !== 'production') {
                console.warn('[LiquidOrb] WebGL disabled by config, using CSS fallback');
                WEBGL_CONTEXT_LOST_LOGGED = true;
            }
            setWebglFailed(true);
            return;
        }
        if (WEBGL_UNAVAILABLE) {
            setWebglFailed(true);
            return;
        }
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                markWebglFailed('WebGL not available');
            }
        } catch (e) {
            markWebglFailed('WebGL check failed');
        }
    }, [markWebglFailed]);

    // Cleanup renderer on unmount to reduce context churn
    useEffect(() => {
        return () => {
            if (glRef.current) {
                try {
                    glRef.current.dispose();
                    glRef.current.forceContextLoss();
                } catch {
                    // Ignore disposal errors
                } finally {
                    glRef.current = null;
                }
            }
        };
    }, []);

    // If WebGL failed, show CSS fallback immediately
    if (webglFailed) {
        return <CSSFallbackOrb color={props.color} state={props.state} />;
    }

    return (
        <div className="w-full h-full relative cursor-pointer">
            <Canvas
                camera={{ position: [0, 0, 4], fov: 45 }}
                gl={{ alpha: true, antialias: true, failIfMajorPerformanceCaveat: false, powerPreference: 'low-power' }}
                onCreated={({ gl }) => {
                    glRef.current = gl;
                    // Listen for WebGL context lost events
                    gl.domElement.addEventListener('webglcontextlost', (e) => {
                        e.preventDefault();
                        markWebglFailed('WebGL context lost');
                    }, { once: true });
                }}
                dpr={[1, 1.5]}
            >
                {/* Lighting setup for "Jewel" look */}
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color={effectiveColor} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="white" />

                {/* Floating animation container */}
                <Float
                    speed={2}
                    rotationIntensity={0.5}
                    floatIntensity={0.5}
                    floatingRange={[-0.1, 0.1]}
                >
                    <LiquidMesh {...props} color={effectiveColor} />
                </Float>

                {/* Environment for shiny reflections (Pseudo-Glass) */}
                <Environment preset="city" />
            </Canvas>
        </div>
    );
};

/**
 * CSS-Only Fallback Orb - PREMIUM MYSTICAL VERSION
 * Used when WebGL is unavailable or context is lost.
 * Now with 3D depth, inner swirls, ethereal mist, and magical subsurface glow.
 */
export const CSSFallbackOrb: React.FC<LiquidOrbProps> = ({ color, state }) => {
    const hasProactiveAlert = useOrbStore((s) => s.hasProactiveAlert);
    const effectiveColor = hasProactiveAlert ? '#f59e0b' : color;
    // State-based animations
    const pulseSpeed = state === 'thinking' ? '3s' : state === 'alert' ? '1.5s' : hasProactiveAlert ? '2s' : '6s';
    const glowIntensity = state === 'alert' ? 50 : state === 'thinking' ? 36 : 30;

    return (
        <div className="w-full h-full relative">
            {/* LAYER 0: Ethereal Mist (Outer Atmosphere) */}
            <div
                className="absolute inset-[-30%] rounded-full animate-pulse"
                style={{
                    background: `radial-gradient(circle at center, ${effectiveColor}30 0%, ${effectiveColor}10 30%, transparent 60%)`,
                    filter: 'blur(40px)',
                    animationDuration: `${parseFloat(pulseSpeed) * 1.5}s`,
                }}
            />

            {/* LAYER 1: Deep Shadow (3D Base) */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `radial-gradient(circle at 70% 70%, transparent 30%, rgba(0,0,0,0.8) 100%)`,
                    transform: 'translate(3%, 3%)',
                    filter: 'blur(8px)',
                }}
            />

            {/* LAYER 2: Subsurface Glow (Inner Energy) */}
            <div
                className="absolute inset-[-20%] rounded-full animate-pulse"
                style={{
                    background: `radial-gradient(circle at center, ${effectiveColor}50 0%, ${effectiveColor}25 40%, transparent 70%)`,
                    filter: `blur(${glowIntensity}px)`,
                    animationDuration: pulseSpeed,
                }}
            />

            {/* LAYER 3: Main Orb Body */}
            <div
                className="absolute inset-0 rounded-full overflow-hidden"
                style={{
                    background: `
                        radial-gradient(circle at 35% 35%, ${effectiveColor}FF 0%, ${effectiveColor}CC 20%, ${effectiveColor}80 50%, ${effectiveColor}40 80%, transparent 100%)
                    `,
                    boxShadow: `
                        inset -10px -10px 30px rgba(0,0,0,0.6),
                        inset 8px 8px 20px rgba(255,255,255,0.2),
                        0 0 ${glowIntensity}px ${effectiveColor}80,
                        0 10px 40px rgba(0,0,0,0.5)
                    `,
                }}
            >
                {/* LAYER 3a: Inner Swirl Energy */}
                <div
                    className="absolute inset-0 rounded-full animate-spin"
                    style={{
                        background: `conic-gradient(from 0deg at 50% 50%, transparent 0%, ${effectiveColor}40 25%, transparent 50%, ${effectiveColor}30 75%, transparent 100%)`,
                        filter: 'blur(8px)',
                        animationDuration: '16s',
                    }}
                />

                {/* LAYER 3b: Secondary Swirl (Counter-rotation) */}
                <div
                    className="absolute inset-[10%] rounded-full"
                    style={{
                        background: `conic-gradient(from 45deg at 50% 50%, transparent 0%, ${effectiveColor}30 30%, transparent 60%, ${effectiveColor}20 90%, transparent 100%)`,
                        filter: 'blur(6px)',
                        animation: `spin 18s linear infinite reverse`,
                    }}
                />

                {/* LAYER 3c: Glass Highlight (Top-Left) */}
                <div
                    className="absolute rounded-full"
                    style={{
                        width: '50%',
                        height: '50%',
                        top: '8%',
                        left: '8%',
                        background: 'radial-gradient(circle at center, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)',
                        filter: 'blur(4px)',
                    }}
                />

                {/* LAYER 3d: Secondary Highlight (Bottom-Right Rim) */}
                <div
                    className="absolute rounded-full"
                    style={{
                        width: '30%',
                        height: '30%',
                        bottom: '15%',
                        right: '15%',
                        background: 'radial-gradient(circle at center, rgba(255,255,255,0.25) 0%, transparent 60%)',
                        filter: 'blur(6px)',
                    }}
                />
            </div>

            {/* LAYER 4: Outer Ring Glow */}
            <div
                className="absolute inset-[-5%] rounded-full animate-pulse"
                style={{
                    border: `2px solid ${effectiveColor}40`,
                    boxShadow: `0 0 25px ${effectiveColor}30`,
                    animationDuration: pulseSpeed,
                }}
            />

            {/* LAYER 5: Breathing Pulse Ring */}
            <div
                className="absolute inset-[-10%] rounded-full"
                style={{
                    border: `1px solid ${effectiveColor}25`,
                    opacity: 0.35,
                }}
            />

            {/* LAYER 6: Mystical Particle Ring */}
            <div
                className="absolute inset-[-15%] rounded-full animate-spin"
                style={{
                    background: `conic-gradient(from 0deg, transparent 0%, ${effectiveColor}20 5%, transparent 8%, transparent 20%, ${effectiveColor}15 23%, transparent 26%, transparent 40%, ${effectiveColor}10 43%, transparent 46%, transparent 60%, ${effectiveColor}20 63%, transparent 66%, transparent 80%, ${effectiveColor}15 83%, transparent 86%)`,
                    filter: 'blur(2px)',
                    animationDuration: '45s',
                }}
            />
        </div>
    );
};
