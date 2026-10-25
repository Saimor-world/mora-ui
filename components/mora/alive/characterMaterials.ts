import * as THREE from 'three';
import { LIGHT_PALETTE as P } from './characterForm';

const NOISE = `
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float cloud(vec3 p){return noise3(p)*.57+noise3(p*2.03)*.28+noise3(p*4.11)*.15;}
`;

export function lightMaterial(opacity: number, flow: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }, motion: { value: 1 }, warmth: { value: 1 }, opacity: { value: opacity },
      sleep: { value: 0 }, flow: { value: flow }, cream: { value: new THREE.Color(P.cream) }, gold: { value: new THREE.Color(P.gold) },
    },
    transparent: true, depthWrite: false, side: THREE.FrontSide,
    vertexShader: `
      uniform float time; uniform float motion; uniform float flow; uniform float sleep;
      varying vec3 n; varying vec3 view; varying vec3 local;
      void main(){vec3 p=position;float w=flow>.5?smoothstep(.75,1.8,p.y):(1.-smoothstep(-1.4,-.1,p.y));
        p.x+=sin(time*1.1+p.y*2.8)*w*.045*motion;
        p.z+=sin(time*1.25-p.y*3.)*w*.055*motion;
        float crest=smoothstep(.7,1.7,p.y);p.x-=sleep*crest*1.1;p.y-=sleep*crest;
        local=p;n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(p,1.);view=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `
      uniform vec3 cream;uniform vec3 gold;uniform float opacity;uniform float warmth;uniform float flow;
      varying vec3 n;varying vec3 view;varying vec3 local;
      ${NOISE}
      void main(){vec3 nn=normalize(n);vec3 vv=normalize(view);float front=abs(dot(nn,vv));float edge=pow(1.-front,2.);
        float tip=smoothstep(.72,1.7,local.y);float silk=cloud(local*4.);
        vec3 lamp=normalize(vec3(-.65,.8,1.));float diffuse=max(0.,dot(nn,lamp));
        float highlight=pow(max(0.,dot(reflect(-lamp,nn),vv)),35.);
        float inner=exp(-dot((local.xy-vec2(-.12,.38))*vec2(2.,1.5),(local.xy-vec2(-.12,.38))*vec2(2.,1.5)));
        vec3 color=mix(gold*.32,cream*.95,clamp(diffuse*.8+front*.15,0.,1.));
        color+=gold*(edge*.9+inner*.12)+cream*highlight*.8;
        float filaments=pow(max(0.,sin(local.y*8.+local.x*14.+silk*6.)),28.);
        color+=gold*filaments*.06*edge;color=mix(color*.35,color,warmth);
        float alpha=opacity*mix(.55,.98,pow(front,.5))*mix(1.,.50,tip);
        if(flow<.5){color=mix(gold*1.5,cream*1.5,front*.65);alpha=opacity*(.25+front*.65+filaments*.10);}
        gl_FragColor=vec4(color,alpha);
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
      void main(){vec3 q=p*17.;float mineral=cloud(q*1.6);vec3 warped=q+vec3(noise3(q*1.5),noise3(q*1.5+8.),noise3(q*1.5-4.))*.32;
        float seam=boundary(warped);float vein=1.-smoothstep(.012,.055,seam);
        float fine=1.-smoothstep(.006,.02,boundary(warped*1.9+5.));
        vec3 nn=normalize(n),vv=normalize(v),light=normalize(vec3(-.6,.8,1.));
        float diffuse=max(0.,dot(nn,light)),rim=pow(1.-max(0.,dot(nn,vv)),3.);
        float spec=pow(max(0.,dot(reflect(-light,nn),vv)),85.);
        float window=pow(max(0.,dot(reflect(-normalize(vec3(-.4,1.,.3)),nn),vv)),16.);
        vec3 color=mix(vec3(.001,.009,.006),base,(.12+mineral*.48))*(.4+diffuse*.8);
        color+=mint*(vein*(.08+mineral*.24)+fine*.025)+base*rim*.45;
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

/** Small orbital caustic: a light source carried by the jade, not a screen-space emoji. */
export function jadeSpark() {
  return new THREE.Mesh(new THREE.PlaneGeometry(.44,.44), new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(P.gold) } }, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 xy;void main(){xy=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 tint;varying vec2 xy;void main(){float ray=exp(-abs(xy.x)*85.-abs(xy.y)*6.)+exp(-abs(xy.y)*85.-abs(xy.x)*6.);float core=exp(-dot(xy,xy)*130.);gl_FragColor=vec4(tint*3.,clamp(ray+core,0.,1.)*.8);}',
  }));
}
