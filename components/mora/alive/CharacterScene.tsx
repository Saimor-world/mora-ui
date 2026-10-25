'use client';
import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { CharacterState } from '@/lib/mora/alive/engine';

export interface CharacterInteraction { x: number; y: number; touchedAt: number }
export interface CharacterSceneProps { state: CharacterState; still: boolean; active: boolean; interaction: MutableRefObject<CharacterInteraction>; onFailure: () => void }
const GOLD = '#e7c578', JADE = '#58bc9e', SEGMENTS = 64, SIDES = 10;
function makeTail() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.12, 0), new THREE.Vector3(-0.44, -0.35, -0.05),
    new THREE.Vector3(-0.24, -0.75, 0.04), new THREE.Vector3(0.38, -1.12, 0.08),
    new THREE.Vector3(0.38, -1.53, 0), new THREE.Vector3(-0.34, -1.98, 0.02),
  ]);
  const geometry = new THREE.TubeGeometry(curve, SEGMENTS, 0.24, SIDES, false);
  const positions = geometry.attributes.position, points = curve.getPoints(SEGMENTS);
  for (let i = 0; i <= SEGMENTS; i++) {
    const taper = Math.pow(1 - i / SEGMENTS, 0.65), p = points[i];
    for (let j = 0; j <= SIDES; j++) {
      const index = i * (SIDES + 1) + j;
      positions.setXYZ(index, p.x + (positions.getX(index) - p.x) * taper,
        p.y + (positions.getY(index) - p.y) * taper, p.z + (positions.getZ(index) - p.z) * taper * 0.38);
    }
  }
  geometry.computeVertexNormals();
  return { geometry, rest: Float32Array.from(positions.array) };
}
function glow(color: string, scale: number) {
  const material = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(color) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p;}',
    fragmentShader: 'uniform vec3 tint; varying vec3 n; varying vec3 v; void main(){float a=pow(1.-abs(dot(normalize(n),normalize(v))),2.8); gl_FragColor=vec4(tint,a*.18);}',
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.63, 24, 16), material); mesh.scale.setScalar(scale); return mesh;
}
function buildCharacter() {
  const body = new THREE.Group(), eyes = new THREE.Group(), jade = new THREE.Group();
  const tail = makeTail();
  const gold = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.7, roughness: 0.3, emissive: GOLD, emissiveIntensity: 0.3, side: THREE.DoubleSide });
  body.add(new THREE.Mesh(tail.geometry, gold));
  const headMaterial = new THREE.MeshStandardMaterial({ color: '#fff0cf', metalness: 0.35, roughness: 0.32, emissive: GOLD, emissiveIntensity: 0.55 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 40, 28), headMaterial);
  head.scale.set(0.84, 1, 0.82); head.position.y = 0.24; body.add(head);
  const aura = glow(GOLD, 1.27); aura.position.y = 0.24; body.add(aura);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 14), new THREE.MeshStandardMaterial({ color: '#153d33', roughness: 0.2 }));
    eye.position.set(side * 0.145, 0.28, 0.408); eye.scale.set(0.66, 1, 0.42); eyes.add(eye);
    const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffed' }));
    highlight.position.set(side * 0.145 + 0.012, 0.298, 0.433); eyes.add(highlight);
  }
  body.add(eyes);
  const light = new THREE.PointLight(GOLD, 2, 6, 2); light.position.set(0, 0, 1.3); body.add(light);
  jade.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 28, 20), new THREE.MeshStandardMaterial({ color: '#126549', metalness: 0.5, roughness: 0.25, emissive: JADE, emissiveIntensity: 0.25 })));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 8, 40), new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.8, roughness: 0.22 })); rim.rotation.set(0.45, 0.3, 0); jade.add(rim, glow(JADE, 0.4)); body.add(jade);
  return { body, eyes, jade, light, tail, gold, headMaterial, aura };
}
/** Native Three.js avoids R3F 8's React-18 reconciler conflict with Next 15 App Router. */
export default function CharacterScene(props: CharacterSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props); latest.current = props;
  const runtime = useRef<{ redraw: () => void } | null>(null);
  useEffect(() => {
    const element = host.current; if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { latest.current.onFailure(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 7);
    scene.add(new THREE.AmbientLight('#bdd5c8', 0.8));
    const sun = new THREE.DirectionalLight('#fff0c5', 3.5); sun.position.set(-3, 4, 4); scene.add(sun);
    const bounce = new THREE.DirectionalLight(JADE, 2.5); bounce.position.set(4, -1, -2); scene.add(bounce);
    const character = buildCharacter(); scene.add(character.body);
    const positions = new Float32Array(72 * 3);
    for (let i = 0; i < 72; i++) { positions[i * 3] = Math.sin(i * 79.3) * 5; positions[i * 3 + 1] = Math.cos(i * 41.1) * 3; positions[i * 3 + 2] = -2 - (i % 7) * 0.3; }
    const dust = new THREE.BufferGeometry(); dust.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    scene.add(new THREE.Points(dust, new THREE.PointsMaterial({ color: '#b4cfbc', size: 0.018, transparent: true, opacity: 0.45, depthWrite: false })));
    const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({ color: '#153c2b', metalness: 0.55, roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -2; scene.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.65, 1.66, 80), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35 })); ring.rotation.x = -Math.PI / 2; ring.position.y = -1.99; scene.add(ring);
    const target = new THREE.Vector3();
    let frame = 0, elapsed = 0, previous = performance.now(), disposed = false;
    function draw(time: number) {
      frame = 0; if (disposed) return;
      const { state, still, active, interaction } = latest.current;
      const dt = Math.min(Math.max((time - previous) / 1000, 0), 0.05); previous = time;
      if (!still && active) elapsed += dt;
      const t = elapsed, rest = state === 'night-rest' || state === 'offline', busy = state === 'working' || state === 'thinking';
      const tapped = !still && time - interaction.current.touchedAt < 4500, wandering = still || rest ? 0 : 1;
      target.set(tapped ? interaction.current.x * 1.3 : Math.sin(t * 0.32) * 0.55 * wandering,
        rest ? -0.45 : tapped ? interaction.current.y * 0.6 + 0.4 : Math.sin(t * 0.7) * 0.14 * wandering + 0.4,
        Math.sin(t * 0.22) * 0.22 * wandering);
      const { body, eyes, jade, light, tail, gold, headMaterial, aura } = character;
      if (still) body.position.copy(target); else body.position.lerp(target, 1 - Math.exp(-dt * (tapped ? 2.5 : 1.6)));
      body.rotation.z = still ? 0 : THREE.MathUtils.damp(body.rotation.z, Math.sin(t * 0.5) * (busy ? 0.12 : 0.06), 3, dt);
      body.rotation.y = still ? 0 : THREE.MathUtils.damp(body.rotation.y, interaction.current.x * 0.25, 3, dt);
      const phase = t % 5.7, blink = !still && phase > 5.42 ? Math.max(0.07, Math.abs(phase - 5.56) / 0.14) : 1;
      eyes.scale.y = rest ? 0.13 : blink * (state === 'approval' || state === 'listening' ? 1.18 : busy ? 0.7 : 1);
      eyes.position.set(still ? 0 : interaction.current.x * 0.055, still ? 0 : interaction.current.y * 0.035, 0);
      const orbit = still ? 0.65 : t * (busy ? 1.5 : 0.55);
      jade.position.set(Math.cos(orbit) * 1.13, Math.sin(orbit) * 0.33 - 0.35, Math.sin(orbit) * 0.8); jade.rotation.y = orbit;
      const color = state === 'error' ? '#efa57e' : state === 'approval' ? '#ffe0a0' : GOLD;
      gold.color.set(color); gold.emissive.set(color); gold.emissiveIntensity = rest ? 0.08 : 0.3;
      headMaterial.emissive.set(color); headMaterial.emissiveIntensity = rest ? 0.12 : 0.55;
      (aura.material as THREE.ShaderMaterial).uniforms.tint.value.set(color); light.color.set(color);
      light.intensity = rest ? 0.6 : 2.2 + (still ? 0 : Math.sin(t * (busy ? 3 : 1.3)) * 0.35);
      const vertices = tail.geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const weight = Math.floor(i / (SIDES + 1)) / SEGMENTS;
        vertices.setXYZ(i, tail.rest[i * 3] + (still ? 0 : Math.sin(t * (busy ? 3 : 1.5) - weight * 5) * weight * 0.14),
          tail.rest[i * 3 + 1], tail.rest[i * 3 + 2] + (still ? 0 : Math.sin(t * 1.4 - weight * 4) * weight * 0.18));
      }
      vertices.needsUpdate = true; tail.geometry.computeVertexNormals(); renderer.render(scene, camera);
      if (active && !still) frame = requestAnimationFrame(draw);
    }
    const redraw = () => { if (frame) cancelAnimationFrame(frame); previous = performance.now(); draw(previous); };
    const resize = () => { const width = element!.clientWidth, height = element!.clientHeight; if (!width || !height) return; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); redraw(); };
    const lost = (event: Event) => { event.preventDefault(); latest.current.onFailure(); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    const observer = new ResizeObserver(resize); observer.observe(element); runtime.current = { redraw }; resize();
    return () => {
      disposed = true; runtime.current = null; cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', lost);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m)); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  useEffect(() => { runtime.current?.redraw(); }, [props.active, props.still, props.state]);
  return <div ref={host} style={{ width: '100%', height: '100%' }} />;
}
