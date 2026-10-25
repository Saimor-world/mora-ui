import * as THREE from 'three';
import { LIGHT_PALETTE as P } from './characterForm';

type Station = [number, number, number, number];
/** Curved, cambered light sheets; each has its own changing width and real depth. */
function membrane(rows: Station[], strength: number, phase: number) {
  const path = new THREE.CatmullRomCurve3(rows.map(([x,y,z]) => new THREE.Vector3(x,y,z)));
  const width = new THREE.CatmullRomCurve3(rows.map((row,i) => new THREE.Vector3(row[3],i,0)));
  const length=72, across=12, positions:number[]=[], uv:number[]=[], indices:number[]=[];
  for(let i=0;i<=length;i++) {
    const t=i/length, center=path.getPoint(t), tangent=path.getTangent(t);
    const side=new THREE.Vector3(-tangent.y,tangent.x,.12*Math.sin(t*Math.PI+phase)).normalize();
    const half=Math.max(.001,width.getPoint(t).x);
    for(let j=0;j<=across;j++) {
      const s=j/across, point=center.clone().addScaledVector(side,(s*2-1)*half);
      point.z+=Math.sin(s*Math.PI)*half*.45;
      positions.push(point.x,point.y,point.z);uv.push(s,t);
      if(i<length&&j<across){const n=i*(across+1)+j,next=n+across+1;indices.push(n,next,n+1,n+1,next,next+1);}
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.ShaderMaterial({
    uniforms:{time:{value:0},motion:{value:1},sleep:{value:0},warmth:{value:1},cream:{value:new THREE.Color(P.cream)},gold:{value:new THREE.Color(P.gold)},opacity:{value:strength},phase:{value:phase}},
    transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,
    vertexShader:`uniform float time;uniform float motion;uniform float sleep;uniform float phase;
      varying vec2 sheet;varying vec3 n;varying vec3 view;
      void main(){vec3 p=position;sheet=uv;
        float tail=1.-smoothstep(-1.4,-.1,p.y);float crest=smoothstep(.7,1.7,p.y);
        p.z+=sin(uv.y*5.-time*1.15+phase)*sin(uv.x*3.14159)*.065*motion;
        p.x+=sin(time*.9+uv.y*4.+phase)*tail*.035*motion;
        p.x-=sleep*crest*1.1;p.y-=sleep*crest;
        vec4 mv=modelViewMatrix*vec4(p,1.);n=normalize(normalMatrix*normal);view=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 cream;uniform vec3 gold;uniform float opacity;uniform float warmth;uniform float phase;
      varying vec2 sheet;varying vec3 n;varying vec3 view;
      void main(){float edge=pow(abs(sheet.x*2.-1.),14.);float tip=sin(sheet.y*3.14159);
        float fold=pow(clamp(.5+.5*cos(sheet.x*14.+sheet.y*9.+phase),0.,1.),18.);
        vec3 nn=n*inversesqrt(max(dot(n,n),.000001));vec3 vv=view*inversesqrt(max(dot(view,view),.000001));
        float facing=clamp(abs(dot(nn,vv)),0.,1.);float fresnel=(1.-facing)*(1.-facing);
        float taper=smoothstep(0.,.06,sheet.y)*(1.-smoothstep(.91,1.,sheet.y));
        float center=max(0.,sin(sheet.x*3.14159));
        vec3 color=mix(gold*1.45,cream*1.4,center*center*.55);
        color+=gold*(edge*3.+fold*.5+fresnel);color*=mix(.38,1.,warmth);
        float a=opacity*(.10+edge*.85+fold*.16+fresnel*.12)*taper*sqrt(max(.02,tip));
        // Zero-coverage tips must not enter the HDR/MSAA target with undefined or unbounded RGB.
        if(!(a>.003))discard;
        if(!(color.r>=0.)||!(color.g>=0.)||!(color.b>=0.))discard;
        gl_FragColor=vec4(min(color,vec3(8.)),min(a,1.));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(geometry,material);
}
export function createMembranes() {
  const crest=new THREE.Group(),tail=new THREE.Group();
  // The outer crest turns left and rejoins the same tip; it is not a duplicate head silhouette.
  crest.add(membrane([[-.38,.63,.02,.002],[-.62,.91,-.01,.08],[-.59,1.15,-.01,.13],[-.25,1.48,.01,.075],[.43,1.76,0,.001]],.72,.3));
  crest.add(membrane([[.24,.68,.17,.001],[-.12,1.01,.16,.11],[-.12,1.28,.08,.065],[.43,1.76,0,.001]],.65,1.8));
  // Separate overlapping flowing membranes follow the torso; no rotated triangular copies.
  tail.add(membrane([[.01,-.09,.01,.002],[-.04,-.40,.09,.16],[-.30,-.75,.13,.22],[-.70,-1.09,.05,.10],[-.98,-1.36,0,.001]],.90,.4));
  tail.add(membrane([[.01,-.19,-.03,.001],[-.22,-.57,.10,.12],[-.64,-.88,.07,.15],[-1.08,-.94,.01,.002]],.72,2.1));
  tail.add(membrane([[.05,-.23,-.06,.001],[.14,-.58,-.02,.13],[-.15,-.93,.03,.14],[-.73,-1.25,0,.001]],.75,3.9));
  tail.add(membrane([[-.05,-.36,.11,.001],[-.42,-.76,.16,.075],[-.91,-1.10,.08,.04],[-1.11,-1.16,0,.001]],.55,5.1));
  const materials:THREE.ShaderMaterial[]=[];
  for(const group of [crest,tail])group.traverse(object=>{if(object instanceof THREE.Mesh)materials.push(object.material);});
  return {crest,tail,materials};
}
