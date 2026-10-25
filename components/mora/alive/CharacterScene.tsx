'use client';
import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { CharacterState } from '@/lib/mora/alive/engine';
import { createLightForm, ellipseThread, lightThread, LIGHT_PALETTE as P } from './characterForm';
import { halo, jadeMaterial, lightMaterial } from './characterMaterials';

export interface CharacterInteraction { x: number; y: number; touchedAt: number }
export interface CharacterSceneProps { state: CharacterState; still: boolean; active: boolean; interaction: MutableRefObject<CharacterInteraction>; onFailure: () => void }
function faceStroke(points: THREE.Vector3[], radius: number) {
  const path = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2]);
  return new THREE.Mesh(new THREE.TubeGeometry(path, 24, radius, 8, false),
    new THREE.MeshBasicMaterial({ color: '#493b21' }));
}
function buildCharacter() {
  const body = new THREE.Group(), face = new THREE.Group(), jade = new THREE.Group();
  const headMaterial = lightMaterial(.94, 1), torsoMaterial = lightMaterial(.63, 0);
  body.add(new THREE.Mesh(createLightForm('head'), headMaterial), new THREE.Mesh(createLightForm('body'), torsoMaterial));
  const aura = halo(P.gold, 3.9, .11); aura.position.set(0, .24, -.5); body.add(aura);
  // Filaments follow the actual flame surface and extend its silhouette, rather than adding a metal shell.
  const paths = [
    [[-.40,.55,.17],[-.56,.87,.04],[-.42,1.19,.01],[.04,1.55,0],[.43,1.76,0]],
    [[.43,1.76,0],[-.03,1.36,.052],[-.08,1.04,.16],[.20,.76,.27]],
    [[-.48,.45,.22],[-.39,.76,.20],[-.23,1.02,.15],[-.25,1.19,.08]],
    [[.02,-.12,.04],[.10,-.42,.13],[-.08,-.72,.13],[-.47,-1.07,.07],[-.94,-1.36,0]],
    [[-.94,-1.36,0],[-.42,-1.14,.04],[.08,-.81,.03],[.22,-.43,.03],[.03,-.15,.03]],
    [[-.13,-.30,.04],[-.34,-.61,.09],[-.75,-.83,.02],[-1.05,-.84,0],[-.69,-1.08,.03]],
  ];
  for (const points of paths) body.add(lightThread(points, .004, .50, P.cream));
  const ribbons = new THREE.Group();
  ribbons.add(ellipseThread(1.10, .55, -.35, .24), ellipseThread(.98, .50, -.42, -.20));
  ribbons.rotation.z = .13; body.add(ribbons);
  const openEyes: THREE.Group[] = [], closedEyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(side * .20, .31, .374);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(.069, 24, 16), new THREE.MeshBasicMaterial({ color: '#173b2e' }));
    iris.scale.set(.69, 1.1, .35); eye.add(iris);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(.016, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff9df' }));
    glint.position.set(-.014, .025, .021); eye.add(glint); openEyes.push(eye); face.add(eye);
    const closed = faceStroke([new THREE.Vector3(-.070,0,0), new THREE.Vector3(0,.065,.003), new THREE.Vector3(.070,0,0)], .010);
    closed.position.copy(eye.position); closed.position.z += .006; closedEyes.push(closed); face.add(closed);
  }
  const smile = faceStroke([new THREE.Vector3(-.046,0,0),new THREE.Vector3(0,-.043,.006),new THREE.Vector3(.046,0,0)], .007);
  smile.position.set(.015, .148, .332); face.add(smile); body.add(face);
  jade.add(new THREE.Mesh(new THREE.SphereGeometry(.205, 40, 28), jadeMaterial()));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.212, .009, 8, 64), new THREE.MeshStandardMaterial({ color: P.gold, metalness: .65, roughness: .26, emissive: P.gold, emissiveIntensity: .2 }));
  rim.rotation.set(.15,.25,-.3); jade.add(rim);
  const jadeAura = halo(P.mint, .9, .10); jadeAura.position.z = -.25; jade.add(jadeAura); body.add(jade);
  const light = new THREE.PointLight(P.gold, 1.5, 5, 2); light.position.set(0,.5,1); body.add(light);
  return { body, face, openEyes, closedEyes, jade, ribbons, light, headMaterial, torsoMaterial, aura };
}
/** Native Three.js retains the existing Next/React runtime and shares one body with the Website. */
export default function CharacterScene(props: CharacterSceneProps) {
  const host = useRef<HTMLDivElement>(null), latest = useRef(props); latest.current = props;
  const runtime = useRef<{ redraw: () => void } | null>(null);
  useEffect(() => {
    const element = host.current; if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { latest.current.onFailure(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
    camera.position.set(0,.12,7.1); camera.lookAt(0,.12,0);
    scene.add(new THREE.AmbientLight(P.mint, .8));
    const sun = new THREE.DirectionalLight(P.cream, 3); sun.position.set(-3,4,4); scene.add(sun);
    const character = buildCharacter(); scene.add(character.body);
    const dust = new THREE.BufferGeometry(), positions = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) { positions[i*3] = Math.sin(i*79.3)*2.0; positions[i*3+1] = Math.cos(i*41.1)*1.8; positions[i*3+2] = Math.sin(i*17.1)*1.3-.5; }
    dust.setAttribute('position', new THREE.BufferAttribute(positions,3));
    const sparks = new THREE.Points(dust, new THREE.PointsMaterial({ color: P.gold, size: .012, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(sparks);
    const landing = halo(P.gold, 3.2, .10); landing.rotation.x = -Math.PI/2; landing.position.y = -1.57; scene.add(landing);
    for (const radius of [.68,.87,1.16]) {
      const ring = ellipseThread(radius,radius,-1.56,0);
      ring.traverse(object => { if (object instanceof THREE.Mesh) (object.material as THREE.MeshBasicMaterial).opacity *= .28; }); scene.add(ring);
    }
    const target = new THREE.Vector3();
    let frame=0, elapsed=0, orbit=.22, velocity=.4, previous=performance.now(), disposed=false;
    function draw(time: number) {
      frame=0; if (disposed) return;
      const { state, still, active, interaction } = latest.current;
      const dt=Math.min(Math.max((time-previous)/1000,0),.05); previous=time;
      if (!still && active) elapsed+=dt;
      const t=elapsed, rest=state==='night-rest'||state==='offline', busy=state==='working'||state==='thinking';
      const tapped=!still && time-interaction.current.touchedAt<4500;
      target.set(still||rest?0:tapped?interaction.current.x*.65:Math.sin(t*.32)*.22,
        rest?-.15:still?0:tapped?interaction.current.y*.25:Math.sin(t*.9)*.08,0);
      const {body,face,openEyes,closedEyes,jade,ribbons,light,headMaterial,torsoMaterial,aura}=character;
      if (still) body.position.copy(target); else body.position.lerp(target,1-Math.exp(-dt*(tapped?2.5:1.6)));
      body.rotation.z=still?0:THREE.MathUtils.damp(body.rotation.z,rest?-.18:Math.sin(t*.65)*(busy?.10:.035),3,dt);
      body.rotation.y=still?0:THREE.MathUtils.damp(body.rotation.y,interaction.current.x*.18,3,dt);
      const blink=!still && t%5.7>5.45, curious=!rest&&(tapped||['listening','thinking','working','approval'].includes(state));
      openEyes.forEach(eye=>{eye.visible=curious&&!blink;eye.scale.y=busy?.85:1;});
      closedEyes.forEach(eye=>{eye.visible=!curious||blink;});
      face.position.set(still?0:interaction.current.x*.025,still?0:interaction.current.y*.018,0);
      if (!still && active) {velocity=THREE.MathUtils.damp(velocity,rest?.08:busy?1.1:.4,2,dt);orbit+=dt*velocity;}
      jade.position.set(Math.cos(orbit)*1.06,.25+Math.sin(orbit)*.36,Math.sin(orbit)*.60);jade.rotation.y=orbit*.4;
      ribbons.rotation.y=still?0:t*.12;ribbons.rotation.z=.13+(still?0:Math.sin(t*.4)*.08);
      const dim=state==='error'||rest;
      for (const material of [headMaterial,torsoMaterial]) {
        material.uniforms.time.value=t;material.uniforms.motion.value=still||rest?0:busy?1.4:1;
        material.uniforms.warmth.value=dim?.28:1;
        material.uniforms.cream.value.set(dim?'#bcb0ce':P.cream);
        material.uniforms.gold.value.set(dim?'#8e819d':state==='approval'?'#f3bb61':P.gold);
      }
      aura.material.uniforms.strength.value=rest?.035:.11;
      light.intensity=rest?.4:1.5;sparks.rotation.y=still?0:t*.025;
      renderer.render(scene,camera);
      if (active&&!still) frame=requestAnimationFrame(draw);
    }
    const redraw=()=>{if(frame)cancelAnimationFrame(frame);previous=performance.now();draw(previous);};
    const resize=()=>{const width=element!.clientWidth,height=element!.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();redraw();};
    const lost=(event:Event)=>{event.preventDefault();latest.current.onFailure();};
    renderer.domElement.addEventListener('webglcontextlost',lost);
    const observer=new ResizeObserver(resize);observer.observe(element);runtime.current={redraw};resize();
    return()=>{
      disposed=true;runtime.current=null;cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',lost);
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
      scene.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>materials.add(m));});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();
    };
  },[]);
  useEffect(()=>{runtime.current?.redraw();},[props.active,props.still,props.state]);
  return <div ref={host} style={{width:'100%',height:'100%'}}/>;
}
