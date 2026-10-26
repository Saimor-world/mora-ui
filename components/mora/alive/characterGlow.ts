import * as THREE from 'three';

/** Two half-resolution separable blurs; preserves canvas transparency instead of drawing a black bloom backdrop. */
export function createCharacterGlow(renderer: THREE.WebGLRenderer) {
  const options = { type: renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType };
  const source = new THREE.WebGLRenderTarget(1, 1, options), ping = new THREE.WebGLRenderTarget(1, 1, options), pong = new THREE.WebGLRenderTarget(1, 1, options);
  source.samples = Math.min(4, renderer.capabilities.maxSamples);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), scene = new THREE.Scene();
  const vertex = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const blur = new THREE.ShaderMaterial({ uniforms: { image: { value: source.texture }, stepSize: { value: new THREE.Vector2() }, extract: { value: 1 } },
    vertexShader: vertex, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D image;uniform vec2 stepSize;uniform float extract;varying vec2 vUv;
      vec3 sampleAt(vec2 p){vec4 c=texture2D(image,p);vec3 light=c.rgb;return mix(light,max(light-.35,0.),extract);}
      void main(){vec3 c=vec3(0.);float total=0.;
        for(int i=-4;i<=4;i++){float w=exp(-float(i*i)/8.);c+=sampleAt(vUv+stepSize*float(i))*w;total+=w;}
        gl_FragColor=vec4(c/total,1.);}`,
  });
  const combine = new THREE.ShaderMaterial({ uniforms: { image: { value: source.texture }, glow: { value: pong.texture } },
    vertexShader: vertex, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D image;uniform sampler2D glow;varying vec2 vUv;
      void main(){vec4 base=texture2D(image,vUv);vec3 bloom=texture2D(glow,vUv).rgb*.72*(1.-base.a);
        float a=clamp(base.a+max(bloom.r,max(bloom.g,bloom.b))*.8,0.,1.);
        vec3 premultiplied=base.rgb+bloom;
        gl_FragColor=vec4(premultiplied/max(a,.001),a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb*=a;
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blur); scene.add(quad);
  return {
    resize(width: number, height: number) { source.setSize(width,height);ping.setSize(Math.max(1,width>>1),Math.max(1,height>>1));pong.setSize(Math.max(1,width>>1),Math.max(1,height>>1)); },
    render(world: THREE.Scene, view: THREE.Camera) {
      renderer.setRenderTarget(source);renderer.render(world,view);
      quad.material=blur;blur.uniforms.image.value=source.texture;blur.uniforms.extract.value=1;blur.uniforms.stepSize.value.set(2/source.width,0);
      renderer.setRenderTarget(ping);renderer.render(scene,camera);
      blur.uniforms.image.value=ping.texture;blur.uniforms.extract.value=0;blur.uniforms.stepSize.value.set(0,1/ping.height);
      renderer.setRenderTarget(pong);renderer.render(scene,camera);
      quad.material=combine;renderer.setRenderTarget(null);renderer.render(scene,camera);
    },
    checkFinite() {
      if(options.type!==THREE.HalfFloatType)return 0;
      let invalid=0;
      for(const target of [source,ping,pong]){
        const pixels=new Uint16Array(target.width*target.height*4);
        renderer.readRenderTargetPixels(target,0,0,target.width,target.height,pixels);
        let hasContent=false;
        for(const value of pixels){if(value!==0)hasContent=true;if((value&0x7c00)===0x7c00)invalid++;}
        if(target===source&&!hasContent)return -1;
      }
      return invalid;
    },
    dispose() {source.dispose();ping.dispose();pong.dispose();blur.dispose();combine.dispose();quad.geometry.dispose();},
  };
}
