'use client';
import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { CharacterState } from '@/lib/mora/alive/engine';
import { createLightForm, LIGHT_PALETTE as P } from './characterForm';
import { halo, jadeMaterial, lightMaterial } from './characterMaterials';
import { createCharacterGlow } from './characterGlow';

export interface CharacterInteraction { x: number; y: number; touchedAt: number }
export interface CharacterSceneProps { state: CharacterState; still: boolean; active: boolean; interaction: MutableRefObject<CharacterInteraction>; onFailure: () => void }
function faceStroke(points: THREE.Vector3[], radius: number) {
  const path = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2]);
  return new THREE.Mesh(new THREE.TubeGeometry(path, 24, radius, 8, false),
    new THREE.MeshBasicMaterial({ color: '#493b21' }));
}
function buildCharacter() {
  const body = new THREE.Group(), presence = new THREE.Group();
  const face = new THREE.Group(), jade = new THREE.Group();
  const material = lightMaterial(.98);
  presence.add(new THREE.Mesh(createLightForm(), material));
  body.add(presence, jade);
  const openEyes: THREE.Group[] = [], closedEyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();eye.position.set(.045 + side * .135, .60, .255);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(.042, 24, 16),
      new THREE.MeshPhysicalMaterial({ color: '#12392d', roughness: .36,
        metalness: 0, clearcoat: .3, clearcoatRoughness: .25 }));
    iris.scale.set(.75, 1.05, .45);eye.add(iris);openEyes.push(eye);face.add(eye);
    const closed = faceStroke([new THREE.Vector3(-.032,0,0),
      new THREE.Vector3(0,.004,0),new THREE.Vector3(.032,0,0)], .005);
    closed.position.copy(eye.position);closedEyes.push(closed);face.add(closed);
  }
  presence.add(face);
  const stone = new THREE.Mesh(new THREE.SphereGeometry(.15, 32, 24), jadeMaterial());
  stone.scale.set(.88, 1.16, .82);stone.rotation.z = -.22;jade.add(stone);
  const aura = halo(P.cream, 2.5, .035);aura.position.set(-.1,0,-.5);body.add(aura);
  const light = new THREE.PointLight(P.cream, 1.1, 4, 2);
  light.position.set(-.2,.5,1);body.add(light);
  return { body, presence, face, openEyes, closedEyes, jade, light, material, aura };
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
    const glow = createCharacterGlow(renderer);
    // Only a soft environmental reflection; no floor rings, orbit trails or particles.
    const landing = halo(P.cream, 1.8, .045);
    landing.rotation.x = -Math.PI/2;landing.position.y = -1.4;scene.add(landing);
    const target = new THREE.Vector3();
    let frame=0, elapsed=0, orbit=.22, velocity=.16, aperture=0, sleep=0, painted=0, previous=performance.now(), disposed=false;
    function draw(time: number) {
      frame=0; if (disposed) return;
      const { state, still, active, interaction } = latest.current;
      if(active&&!still&&state==='night-rest'&&sleep>.99&&time-painted<50){frame=requestAnimationFrame(draw);return;}
      painted=time;
      const dt=Math.min(Math.max((time-previous)/1000,0),.05); previous=time;
      if (!still && active) elapsed+=dt;
      const t=elapsed, night=state==='night-rest', rest=night||state==='offline', busy=state==='working'||state==='thinking';
      sleep=still?(night?1:0):THREE.MathUtils.damp(sleep,night?1:0,2.5,dt);
      const tapped=!still && time-interaction.current.touchedAt<4500;
      target.set(still||rest?0:tapped?interaction.current.x*.65:Math.sin(t*.24)*.09,
        night?-.18:rest?-.1:still?0:tapped?interaction.current.y*.25:Math.sin(t*.65)*.035,0);
      const {body,presence,face,openEyes,closedEyes,jade,light,material,aura}=character;
      presence.rotation.z = -.65*sleep;presence.position.y = -.12*sleep;
      if (still) body.position.copy(target); else body.position.lerp(target,1-Math.exp(-dt*(tapped?2.5:1.6)));
      body.rotation.z=still?0:THREE.MathUtils.damp(body.rotation.z,rest?0:Math.sin(t*.45)*(busy?.035:.012),3,dt);
      body.rotation.y=still?0:THREE.MathUtils.damp(body.rotation.y,interaction.current.x*.18,3,dt);
      // Attentive idle gaze instead of the permanent closed-eye smile.
      const blink=!still && t%5.7>5.45;
      const opening=!rest&&!blink?(busy?.82:1):0;
      aperture=still?opening:THREE.MathUtils.damp(aperture,opening,blink?38:16,dt);
      openEyes.forEach(eye=>{eye.visible=aperture>.12;eye.scale.y=Math.max(.05,aperture);});
      closedEyes.forEach(eye=>{eye.visible=aperture<=.12;eye.scale.y=rest?.65:1;});
      // Small gaze shifts preserve the simple face; idle gently attends to the stone.
      face.position.set(still?0:tapped?interaction.current.x*.012:Math.cos(orbit)*.008,
        still?0:interaction.current.y*.008,0);
      if (!still && active) {velocity=THREE.MathUtils.damp(velocity,rest?.04:busy?.38:.16,2,dt);orbit+=dt*velocity;}
      jade.position.set(Math.cos(orbit)*THREE.MathUtils.lerp(.82,.58,sleep),
        THREE.MathUtils.lerp(.20,-.45,sleep)-Math.sin(orbit)*.15,
        Math.sin(orbit)*.43);jade.rotation.y=orbit*.25;
      const dim=state==='error'||state==='offline';
      material.uniforms.time.value=t;material.uniforms.sleep.value=sleep;
      material.uniforms.motion.value=still||rest?0:(busy?.8:.45);
      material.uniforms.warmth.value=dim?.28:1-sleep*.5;
      material.uniforms.opacity.value=.98;
      material.uniforms.cream.value.set(dim?'#bcb0ce':P.cream);
      material.uniforms.gold.value.set(dim?'#8e819d':state==='approval'?'#f3bb61':P.gold);
      aura.material.uniforms.strength.value=state==='offline'?.01:.035-sleep*.02;
      light.intensity=state==='offline'?.3:1.1-sleep*.5;
      glow.render(scene,camera);
      if(still&&process.env.NEXT_PUBLIC_MORA_RENDER_QA==='1')renderer.domElement.dataset.gpuNonfinite=String(glow.checkFinite());
      if (active&&!still) frame=requestAnimationFrame(draw);
    }
    const redraw=()=>{if(frame)cancelAnimationFrame(frame);previous=performance.now();draw(previous);};
    const resize=()=>{const width=element!.clientWidth,height=element!.clientHeight;if(!width||!height)return;renderer.setSize(width,height);glow.resize(Math.round(width*renderer.getPixelRatio()),Math.round(height*renderer.getPixelRatio()));camera.aspect=width/height;camera.updateProjectionMatrix();redraw();};
    const lost=(event:Event)=>{event.preventDefault();latest.current.onFailure();};
    renderer.domElement.addEventListener('webglcontextlost',lost);
    const observer=new ResizeObserver(resize);observer.observe(element);runtime.current={redraw};resize();
    return()=>{
      disposed=true;runtime.current=null;cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',lost);
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
      scene.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>materials.add(m));});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());glow.dispose();renderer.dispose();renderer.domElement.remove();
    };
  },[]);
  useEffect(()=>{runtime.current?.redraw();},[props.active,props.still,props.state]);
  return <div ref={host} style={{width:'100%',height:'100%'}}/>;
}
