import * as THREE from 'three';
import { LIGHT_PALETTE as P } from './characterForm';

const NOISE = `
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float cloud(vec3 p){return noise3(p)*.57+noise3(p*2.03)*.28+noise3(p*4.11)*.15;}
`;

/**
 * Lit from within: a warm lamp in the lower body shines through a milky, slightly translucent skin.
 * Edges turn amber where the skin is thin; the side facing the jade picks up its green.
 */
export function lightMaterial(opacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }, motion: { value: 1 }, warmth: { value: 1 },
      opacity: { value: opacity }, sleep: { value: 0 },
      cream: { value: new THREE.Color(P.cream) }, gold: { value: new THREE.Color(P.gold) },
      mint: { value: new THREE.Color(P.mint) }, stoneDir: { value: new THREE.Vector3(1, .2, .3).normalize() },
    },
    transparent: true, depthWrite: true, side: THREE.FrontSide,
    vertexShader: `uniform float time;uniform float motion;
      varying vec3 n;varying vec3 nl;varying vec3 view;varying vec3 local;
      void main(){vec3 p=position;local=position;nl=normal;
        p.x+=sin(time*.7+p.y*1.6)*.01*motion;
        n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(p,1.);
        view=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform vec3 cream;uniform vec3 gold;uniform vec3 mint;uniform vec3 stoneDir;
      uniform float opacity;uniform float warmth;uniform float time;uniform float motion;
      varying vec3 n;varying vec3 nl;varying vec3 view;varying vec3 local;
      ${NOISE}
      void main(){vec3 nn=normalize(n);vec3 vv=normalize(view);
        float front=clamp(dot(nn,vv),0.,1.),thin=1.-front;
        vec3 lamp=normalize(vec3(-.55,.85,.9));
        float wrap=clamp((dot(nn,lamp)+.6)/1.6,0.,1.);
        // Inner lamp sits low in the body; its light breathes very slowly.
        vec2 c=(local.xy-vec2(-.06,-.25))*vec2(1.6,.95);
        float core=exp(-dot(c,c))*(.92+.08*sin(time*.9)*motion);
        float milk=cloud(local*2.6+vec3(0.,time*.03*motion,0.));
        vec3 peach=mix(gold,cream,.42);
        vec3 skin=mix(gold*.52,cream*.86,.25+.6*pow(front,1.1));
        // ACES compresses highs: keep the skin low so the inner lamp reads as light, not as white paint.
        vec3 color=skin*(.17+.28*wrap)+peach*core*.88*pow(front,.35);
        color*=.95+milk*.08;
        // Thin edges stay soft and warm: light passes through less material, no outline.
        color=mix(color,gold*vec3(.9,.68,.46),smoothstep(.15,.95,thin)*.32);
        float sheen=pow(max(0.,dot(reflect(-lamp,nn),vv)),26.);color+=cream*sheen*.1;
        // Jade reflection: a soft patch on the waist facing the stone, not a green half.
        float bounce=pow(max(0.,dot(normalize(nl),stoneDir)),4.)*exp(-pow((local.y-.15)/.55,2.));
        color=mix(color,mint*.7,bounce*.45);
        color*=mix(.35,1.,warmth);
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
        // Clouded jade: soft lighter drifts in deep green, veins only as faint traces.
        float drift=smoothstep(.35,.85,cloud(q*.55+3.));
        vec3 color=mix(vec3(.004,.03,.02),base,(.2+mineral*.42+drift*.3))*(.42+diffuse*.75);
        color+=mint*(vein*(.012+mineral*.035)+drift*.05)+base*rim*.55;
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

