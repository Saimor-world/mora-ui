// Beleuchtete Kugeln (aus universe-hero übernommen) – flach, Licht von oben links.
const PAL = {
  'gas-gold':['#5a3d17','#a77b3c','#d9b26a','#f2dcae','#b88a48'], 'ocean':['#06182e','#0f3d66','#2a73a8','#7fbcdf','#d8eef7'],
  'marble-indigo':['#130f33','#2f2870','#5d52b0','#a69de0','#e9e5ff'], 'ice':['#3d5a6b','#7ea3b6','#bcd8e4','#e9f6fb','#ffffff'],
  'copper-rock':['#2a130a','#6b331b','#a85a32','#d6905e','#f0c49a'], 'coral':['#3a1214','#7d3030','#b8574c','#e29579','#f6cbb3'],
  'nebula-violet':['#1a0a24','#45205a','#7a3f92','#b989c9','#ead2f2'], 'pearl':['#4a4a4f','#8d8b8c','#c9c4bd','#ece7df','#ffffff'],
  'sand-dune':['#3d2c17','#7d5f37','#b8935e','#dcc196','#f5e6c8'], 'forest':['#0c1f14','#1f4630','#3f7a52','#86b48a','#d3e8c9'],
  'crystal-teal':['#062428','#0f4d55','#2b8a90','#7fcfcc','#dff7f3'], 'ember':['#2a0d06','#6e2410','#b34a1d','#ea8a45','#ffd2a0'],
};
const ATM = {'gas-gold':'255,214,150','ocean':'120,190,255','marble-indigo':'170,150,255','ice':'200,235,255','copper-rock':'255,170,120','coral':'255,160,140','nebula-violet':'220,150,255','pearl':'240,236,230','sand-dune':'250,215,160','forest':'160,230,170','crystal-teal':'140,240,230','ember':'255,150,90'};
function hash(n){ n = Math.imul(n ^ 61 ^ (n >>> 16), 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; }
function vnoise(x,y,s){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi; const r=(a,b)=>hash((a*374761393+b*668265263+s*982451653)|0);
  const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf); return (r(xi,yi)*(1-u)+r(xi+1,yi)*u)*(1-v)+(r(xi,yi+1)*(1-u)+r(xi+1,yi+1)*u)*v; }
function fbm(x,y,s){ let a=0,f=1,w=.5; for(let i=0;i<5;i++){ a+=w*vnoise(x*f,y*f,s+i*17); f*=2.03; w*=.5;} return a; }
const hex = h => [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function ramp(p,t){ t=Math.max(0,Math.min(.999,t)); const k=t*(p.length-1), i=Math.floor(k), f=k-i; const a=hex(p[i]), b=hex(p[i+1]); return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f]; }
// Äquirektanguläre Textur je Planet (einmalig), danach pro Bild nur Beleuchtung + Drehung.
function makeTex(arch, seed){ const W=512,H=256, p=PAL[arch]||PAL.pearl, d=new Float32Array(W*H*3), banded = arch==='gas-gold'||arch==='sand-dune'||arch==='ice';
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const nx=x/W*8, ny=y/H*4; let t;
    if(banded){ t = .5+.38*Math.sin(ny*4.2 + fbm(nx*.6,ny*2,seed)*3.2) + .18*(fbm(nx*1.5,ny*6,seed+3)-.5); }
    else if(arch==='ocean'){ const c=fbm(nx,ny,seed); t = c>.55 ? .62+ (c-.55)*1.6 : c*.95; }
    else { t = fbm(nx+fbm(nx,ny,seed+9)*1.4, ny+fbm(nx+3,ny,seed+5)*1.4, seed); t = (t-.2)*1.5; }
    const c=ramp(p,t); const i=(y*W+x)*3; d[i]=c[0]; d[i+1]=c[1]; d[i+2]=c[2]; }
  return {W,H,d}; }
function renderSphere(tex, R, rot, lx, ly, lz, atm, dim){ // R in Gerätepixeln
  const S=Math.ceil(R*2+R*0.5), cv=document.createElement('canvas'); cv.width=cv.height=S; const g=cv.getContext('2d'); const img=g.createImageData(S,S), o=img.data, c=S/2;
  for(let py=0;py<S;py++) for(let px=0;px<S;px++){ const x=(px+.5-c)/R, y=(py+.5-c)/R, r2=x*x+y*y; const k=(py*S+px)*4;
    if(r2<=1){ const z=Math.sqrt(1-r2); // Normale; Achse leicht geneigt
      const tilt=.36, yy=y*Math.cos(tilt)-z*Math.sin(tilt), zz=y*Math.sin(tilt)+z*Math.cos(tilt);
      const lon=Math.atan2(x,zz)+rot, lat=Math.asin(Math.max(-1,Math.min(1,yy)));
      const u=((lon/(2*Math.PI))%1+1)%1, v=lat/Math.PI+.5; const ti=((Math.floor(v*(tex.H-1)))*tex.W+Math.floor(u*(tex.W-1)))*3;
      let ndl = x*lx + y*ly + z*lz; const diff = Math.max(0, ndl); // weicher Terminator
      const term = Math.pow(Math.min(1, Math.max(0,(ndl+.18)/1.18)), 1.25);
      const limb = .55+.45*Math.pow(z,.5); const amb=.035;
      const spec = Math.pow(Math.max(0, (2*ndl*z - lz)), 28) * .25 * (ndl>0?1:0);
      const L = (amb + term*1.05) * limb;
      let rr=tex.d[ti]*L+spec*255, gg=tex.d[ti+1]*L+spec*255, bb=tex.d[ti+2]*L+spec*255;
      // Atmosphäre am beleuchteten Rand
      const fres = Math.pow(1-z, 2.2) * Math.max(0, ndl+.35);
      rr += atm[0]*fres*.55; gg += atm[1]*fres*.55; bb += atm[2]*fres*.55;
      o[k]=Math.min(255,rr*dim); o[k+1]=Math.min(255,gg*dim); o[k+2]=Math.min(255,bb*dim); o[k+3]=255;
      const e = (1-Math.sqrt(r2))*R; if(e<1.2) o[k+3]=255*Math.max(0,e/1.2); // Kantenglättung
    } else { // äußerer Atmosphärensaum
      const d=Math.sqrt(r2)-1; if(d<.16){ const lit=Math.max(0,(x*lx+y*ly)/Math.sqrt(r2)+.3); const a=Math.pow(1-d/.16,2.4)*lit*.55*dim; o[k]=atm[0];o[k+1]=atm[1];o[k+2]=atm[2];o[k+3]=255*a; } }
  }
  g.putImageData(img,0,0); return cv; }


window.sphereURL=(arch,seed,px,dim=1)=>{const t=makeTex(arch,seed);const c=renderSphere(t,px/2,seed*.7,-.55,-.62,.56,(ATM[arch]||"240,236,230").split(",").map(Number),dim);return c.toDataURL();};
