'use client';
import { useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CharacterState } from '@/lib/mora/alive/engine';

export interface CharacterInteraction { x: number; y: number; touchedAt: number }
export interface CharacterSceneProps { state: CharacterState; still: boolean; active: boolean; interaction: MutableRefObject<CharacterInteraction>; onFailure: () => void }
const GOLD = '#e7c578';
const JADE = '#58bc9e';
const SEGMENTS = 64, SIDES = 10;
/** Tapered, elliptical S ribbon. Reused for every surface and capture. */
function makeTail() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.12, 0), new THREE.Vector3(-0.44, -0.35, -0.05),
    new THREE.Vector3(-0.24, -0.75, 0.04), new THREE.Vector3(0.38, -1.12, 0.08),
    new THREE.Vector3(0.38, -1.53, 0), new THREE.Vector3(-0.34, -1.98, 0.02),
  ]);
  const geometry = new THREE.TubeGeometry(curve, SEGMENTS, 0.24, SIDES, false);
  const positions = geometry.attributes.position;
  const points = curve.getPoints(SEGMENTS);
  for (let i = 0; i <= SEGMENTS; i++) {
    const taper = Math.pow(1 - i / SEGMENTS, 0.65);
    for (let j = 0; j <= SIDES; j++) {
      const index = i * (SIDES + 1) + j;
      const p = points[i];
      positions.setXYZ(index, p.x + (positions.getX(index) - p.x) * taper,
        p.y + (positions.getY(index) - p.y) * taper, p.z + (positions.getZ(index) - p.z) * taper * 0.38);
    }
  }
  geometry.computeVertexNormals();
  return { geometry, rest: Float32Array.from(positions.array) };
}
function Glow({ color, scale = 1 }: { color: string; scale?: number }) {
  const uniforms = useMemo(() => ({ tint: { value: new THREE.Color(color) } }), [color]);
  return <mesh scale={scale}>
    <sphereGeometry args={[0.63, 24, 16]} />
    <shaderMaterial uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending}
      vertexShader={'varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }'}
      fragmentShader={'uniform vec3 tint; varying vec3 n; varying vec3 v; void main(){ float a=pow(1.-abs(dot(normalize(n),normalize(v))),2.8); gl_FragColor=vec4(tint,a*.18); }'} />
  </mesh>;
}
function Being({ state, still, interaction }: Omit<CharacterSceneProps, 'active' | 'onFailure'>) {
  const body = useRef<THREE.Group>(null!);
  const eyes = useRef<THREE.Group>(null!);
  const jade = useRef<THREE.Group>(null!);
  const light = useRef<THREE.PointLight>(null!);
  const tail = useMemo(makeTail, []);
  const elapsed = useRef(0);
  const target = useMemo(() => new THREE.Vector3(), []);
  const rest = state === 'night-rest' || state === 'offline';
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!still) elapsed.current += dt;
    const t = elapsed.current;
    const busy = state === 'working' || state === 'thinking';
    const tapped = !still && performance.now() - interaction.current.touchedAt < 4500;
    // Continuous damped acceleration: curiosity -> settle -> hover. No frame-rate-dependent steps.
    const wandering = still || rest ? 0 : 1;
    target.set(tapped ? interaction.current.x * 1.3 : Math.sin(t * 0.32) * 0.55 * wandering,
      rest ? -0.45 : tapped ? interaction.current.y * 0.6 + 0.4 : Math.sin(t * 0.7) * 0.14 * wandering + 0.4,
      Math.sin(t * 0.22) * 0.22 * wandering);
    if (still) body.current.position.copy(target);
    else body.current.position.lerp(target, 1 - Math.exp(-dt * (tapped ? 2.5 : 1.6)));
    body.current.rotation.z = THREE.MathUtils.damp(body.current.rotation.z, still ? 0 : Math.sin(t * 0.5) * (busy ? 0.12 : 0.06), 3, dt);
    body.current.rotation.y = THREE.MathUtils.damp(body.current.rotation.y, still ? 0 : interaction.current.x * 0.25, 3, dt);
    const blinkPhase = t % 5.7;
    const blink = !still && blinkPhase > 5.42 ? Math.max(0.07, Math.abs(blinkPhase - 5.56) / 0.14) : 1;
    eyes.current.scale.y = rest ? 0.13 : blink * (state === 'approval' || state === 'listening' ? 1.18 : busy ? 0.7 : 1);
    eyes.current.position.x = still ? 0 : interaction.current.x * 0.055;
    eyes.current.position.y = still ? 0 : interaction.current.y * 0.035;
    const orbit = still ? 0.65 : t * (busy ? 1.5 : 0.55);
    jade.current.position.set(Math.cos(orbit) * 1.13, Math.sin(orbit) * 0.33 - 0.35, Math.sin(orbit) * 0.8);
    jade.current.rotation.y = orbit;
    light.current.intensity = rest ? 0.6 : 2.2 + (still ? 0 : Math.sin(t * (busy ? 3 : 1.3)) * 0.35);
    const positions = tail.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const weight = Math.floor(i / (SIDES + 1)) / SEGMENTS;
      positions.setXYZ(i, tail.rest[i * 3] + (still ? 0 : Math.sin(t * (busy ? 3 : 1.5) - weight * 5) * weight * 0.14),
        tail.rest[i * 3 + 1], tail.rest[i * 3 + 2] + (still ? 0 : Math.sin(t * 1.4 - weight * 4) * weight * 0.18));
    }
    positions.needsUpdate = true;
    tail.geometry.computeVertexNormals();
  });
  const color = state === 'error' ? '#efa57e' : state === 'approval' ? '#ffe0a0' : GOLD;
  return <group ref={body} position={[0, 0.4, 0]}>
    <mesh geometry={tail.geometry}>
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={color} emissiveIntensity={rest ? 0.08 : 0.3} side={THREE.DoubleSide} />
    </mesh>
    <mesh scale={[0.84, 1, 0.82]} position={[0, 0.24, 0]}>
      <sphereGeometry args={[0.52, 40, 28]} />
      <meshStandardMaterial color="#fff0cf" metalness={0.35} roughness={0.32} emissive={color} emissiveIntensity={rest ? 0.12 : 0.55} />
    </mesh>
    <group position={[0, 0.24, 0]}><Glow color={color} scale={1.27} /></group>
    <group ref={eyes}>
      {[-1, 1].map(side => <group key={side} position={[side * 0.145, 0.28, 0.408]}>
        <mesh scale={[0.66, 1, 0.42]}><sphereGeometry args={[0.065, 20, 14]} /><meshStandardMaterial color="#153d33" roughness={0.2} /></mesh>
        <mesh position={[0.012, 0.018, 0.025]}><sphereGeometry args={[0.014, 10, 8]} /><meshBasicMaterial color="#ffffed" /></mesh>
      </group>)}
    </group>
    <pointLight ref={light} position={[0, 0, 1.3]} color={color} intensity={2} distance={6} decay={2} />
    <group ref={jade}>
      <mesh><sphereGeometry args={[0.16, 28, 20]} /><meshStandardMaterial color="#126549" metalness={0.5} roughness={0.25} emissive={JADE} emissiveIntensity={0.25} /></mesh>
      <mesh rotation={[0.45, 0.3, 0]}><torusGeometry args={[0.17, 0.012, 8, 40]} /><meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.22} /></mesh>
      <Glow color={JADE} scale={0.4} />
    </group>
  </group>;
}
function Dust() {
  const positions = useMemo(() => {
    const a = new Float32Array(72 * 3);
    for (let i = 0; i < 72; i++) { a[i * 3] = Math.sin(i * 79.3) * 5; a[i * 3 + 1] = Math.cos(i * 41.1) * 3; a[i * 3 + 2] = -2 - (i % 7) * 0.3; }
    return a;
  }, []);
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#b4cfbc" size={0.018} transparent opacity={0.45} depthWrite={false} /></points>;
}
export default function CharacterScene(props: CharacterSceneProps) {
  return <Canvas camera={{ position: [0, 0, 7], fov: 40 }} dpr={[1, 1.5]} frameloop={props.active && !props.still ? 'always' : 'demand'}
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: false }}
    onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', props.onFailure, { once: true }); }}
    fallback={<p>3D ist auf diesem Gerät nicht verfügbar.</p>}>
    <ambientLight intensity={0.8} color="#bdd5c8" /><directionalLight position={[-3, 4, 4]} intensity={3.5} color="#fff0c5" />
    <directionalLight position={[4, -1, -2]} intensity={2.5} color={JADE} />
    <Dust /><Being state={props.state} still={props.still} interaction={props.interaction} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}><circleGeometry args={[8, 64]} /><meshStandardMaterial color="#153c2b" metalness={0.55} roughness={0.6} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, 0]}><ringGeometry args={[1.65, 1.66, 80]} /><meshBasicMaterial color={GOLD} transparent opacity={0.35} /></mesh>
  </Canvas>;
}
