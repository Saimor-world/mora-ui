import * as THREE from 'three';
import { LIGHT_PALETTE as P } from './characterForm';

const NOISE = `
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float cloud(vec3 p){return noise3(p)*.57+noise3(p*2.03)*.28+noise3(p*4.11)*.15;}
`;

/** Satin opal: gentle internal light without a separate flame, shell or filaments. */
export function lightMaterial(opacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }, motion: { value: 1 }, warmth: { value: 1 },
      opacity: { value: opacity }, sleep: { value: 0 },
      cream: { value: new THREE.Color(P.cream) }, gold: { value: new THREE.Color(P.gold) },
      mint: { value: new THREE.Color(P.mint) },
    },
    transparent: true, depthWrite: true, side: THREE.FrontSide,
    vertexShader: `uniform float time;uniform float motion;
      varying vec3 n;varying vec3 view;varying vec3 local;
      void main(){vec3 p=position;local=position;
        p.x+=sin(time*.7+p.y*1.6)*.012*motion;
        n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(p,1.);
        view=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform vec3 cream;uniform vec3 gold;uniform vec3 mint;
      uniform float opacity;uniform float warmth;
      varying vec3 n;varying vec3 view;varying vec3 local;
      void main(){vec3 nn=normalize(n);vec3 vv=normalize(view);
        float front=clamp(dot(nn,vv),0.,1.);
        float diffuse=max(0.,dot(nn,normalize(vec3(-.65,.8,1.))));
        float inner=exp(-dot(local.xy*vec2(1.8,.8),local.xy*vec2(1.8,.8)));
        vec3 color=mix(gold*.52,cream*.98,pow(front,.55));
        color*=.72+diffuse*.28;color+=cream*inner*.32;
        float reflection=exp(-dot((local.xy-vec2(.3,.1))*2.,(local.xy-vec2(.3,.1))*2.));
        color+=mint*reflection*.055;color*=mix(.35,1.,warmth);
        gl_FragColor=vec4(color,opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function jadeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { base: { value: new THREE.Color(P.jade) }, mint: { value: new THREE.Color(P.mint) } },
    vertexShader: 'varying vec3 p;varying vec3 n;varying vec3 v;void main(){p=position;n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: `uniform vec3 base;uniform vec3 mint;varying vec3 p;varying vec3 n;varying vec3 v;${NOISE}
      vec3 hash33(vec3 v){return fract(sin(vec3(dot(v,vec3(127.1,311.7,74.7)),dot(v,vec3(269.5,183.3,246.1)),dot(v,vec3(113.5,271.9,124.6))))*43758.5453);}
      float boundary(vec3 q){vec3 cell=floor(q),f=fract(q);float first=10.,second=10.;
        for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
          vec3 offset=vec3(float(x),float(y),float(z));vec3 r=offset+hash33(cell+offset)-f;float d=dot(r,r);
          if(d<first){second=first;first=d;}else if(d<second){second=d;}}
        return sqrt(second)-sqrt(first);}
      void main(){vec3 q=p*13.;float mineral=cloud(q*1.6);vec3 warped=q+vec3(noise3(q*1.5),noise3(q*1.5+8.),noise3(q*1.5-4.))*.7;
        float seam=boundary(warped);float vein=1.-smoothstep(.012,.055,seam);
        float fine=1.-smoothstep(.006,.02,boundary(warped*1.9+5.));
        vec3 nn=normalize(n),vv=normalize(v),light=normalize(vec3(-.6,.8,1.));
        float diffuse=max(0.,dot(nn,light)),rim=pow(1.-clamp(dot(nn,vv),0.,1.),3.);
        float spec=pow(max(0.,dot(reflect(-light,nn),vv)),85.);
        float window=pow(max(0.,dot(reflect(-normalize(vec3(-.4,1.,.3)),nn),vv)),16.);
        vec3 color=mix(vec3(.001,.009,.006),base,(.12+mineral*.48))*(.4+diffuse*.8);
        color+=mint*(vein*(.025+mineral*.08)+fine*.006)+base*rim*.45;
        color+=vec3(1.,.96,.78)*(spec*.9+window*.16);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function halo(color: string, size: number, strength: number) {
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(color) }, strength: { value: strength } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 xy;void main(){xy=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 tint;uniform float strength;varying vec2 xy;void main(){float r=dot(xy,xy);float a=exp(-r*4.5)*(1.-smoothstep(.45,1.,r));gl_FragColor=vec4(tint,a*strength);}',
  }));
}

