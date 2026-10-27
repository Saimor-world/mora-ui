import fs from 'fs';
const src=fs.readFileSync('.bg-shot.mjs','utf8').replace(/await page\.screenshot[\s\S]*$/,`
const r=await page.evaluate(()=>{const out=[];const want=['Deine Abteilungen','Zuletzt bewegt','Dein Horizont','110 Elemente','Den Kalenderstand','Frag MÔRA','Intelligence'];
for(const el of document.querySelectorAll('body *')){const t=(el.childNodes[0]?.nodeValue||el.getAttribute('placeholder')||'').trim(); if(want.some(w=>t.startsWith(w))){let p=el,chain=[];for(let i=0;i<7&&p;i++){const b=p.getBoundingClientRect();chain.push((p.className&&p.className.baseVal===undefined?String(p.className).slice(0,70):p.tagName)+' '+[b.x,b.y,b.width,b.height].map(Math.round));p=p.parentElement;}out.push(t.slice(0,20)+' :: '+chain.join(' < '));}}
for(const s of ['.wd-universe','.wd-orbits','.wd-planet','svg']){const e=document.querySelector(s);if(e){const b=e.getBoundingClientRect();out.push(s+' '+[b.x,b.y,b.width,b.height].map(Math.round))}}
return out.join('\\n')});console.log(r);await b.close();`);
fs.writeFileSync('.probe2.mjs',src);
