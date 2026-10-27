import { chromium } from '@playwright/test';
import fs from 'fs';
const owl=fs.readFileSync('/workspace/owl-live.json','utf8'); const today=fs.readFileSync('/workspace/today-live.json','utf8'); const LIVE=JSON.parse(fs.readFileSync('/workspace/os-live.json','utf8')); const CID=LIVE.universe.data.company.id;
const [,, name, label='', w='1440', h='900']=process.argv;
const base='http://localhost:3311';
const b=await chromium.launch({executablePath:'/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'});
const ctx=await b.newContext({viewport:{width:+w,height:+h}, timezoneId:process.env.TZID||'Europe/Berlin'});
const page=await ctx.newPage(); page.on('console',m=>{if(m.type()==='error')console.log('CON',m.text().slice(0,300))}); page.on('pageerror',e=>console.log('ERR',e.message.slice(0,200)));
await page.route('**/api/core/**', async r=>{ const u=r.request().url(); let body={};
  if(u.includes('/v3/auth/session')) body={user_id:'user-nextchapter',email:'nextchaptergermany@gmail.com',full_name:'Marius',name:'Marius',role:'owner',tenant_id:'tenant-saimor-hq',active_company_id:CID};
  for(const [k,p] of [['universe','/v3/universe'],['mail','/v3/mail/messages'],['companies','/v3/companies'],['departments','/v3/departments'],['tree','/v3/tree'],['folders','/v3/folders'],['nodes','/v3/nodes'],['tasks','/v3/tasks']]) if(u.includes(p)){ await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(LIVE[k])}); return; }
  if(u.includes('/v3/today')) { await r.fulfill({status:200,contentType:'application/json',body:today}); return; }
  if(u.includes('/v3/auth/me')) body={id:'u',name:'Marius',email:'nextchaptergermany@gmail.com',role:'owner',tenant_id:'tenant-saimor-hq'};
  if(u.includes('/v3/nightwatch/owl')) { await r.fulfill({status:200,contentType:'application/json',body:owl}); return; }
  await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)}); });
await ctx.addCookies([{name:'mora_auth_token',value:'mock',url:base},{name:'mora_session',value:'local_demo_fallback',url:base}]);
await page.goto(base+'/os',{waitUntil:'networkidle',timeout:180000}).catch(e=>console.log(e.message));
await page.waitForTimeout(6000); const sk=page.getByText('Überspringen').first(); if(await sk.count()){await sk.click(); await page.waitForTimeout(1500);}

await page.locator(`.os-dock__item[data-feature=settings] :is(a,button)`).first().click(); await page.waitForTimeout(4000);
const card=page.locator('[data-testid=mora-wardrobe]');
const top=async()=>{ await card.evaluate(e=>{ let p=e.parentElement; while(p){ if(p.scrollHeight>p.clientHeight+20 && /(auto|scroll)/.test(getComputedStyle(p).overflowY)){ const r=e.getBoundingClientRect(), pr=p.getBoundingClientRect(); p.scrollTop+= r.top-pr.top-70; break;} p=p.parentElement; } }); await page.waitForTimeout(500); };
await top();

const tid=id=>page.locator(`[data-testid=${id}]`);
fs.rmSync('/tmp/edgif',{recursive:true,force:true}); fs.mkdirSync('/tmp/edgif');
const bb=await card.boundingBox(); const clip={x:Math.max(0,bb.x),y:Math.max(0,bb.y),width:Math.min(bb.width,+w-bb.x),height:Math.min(bb.height,+h-bb.y)};
let n=0; const snap=async(count=1,gap=110)=>{ for(let i=0;i<count;i++){ await page.screenshot({path:`/tmp/edgif/f${String(n++).padStart(4,'0')}.png`,clip}); await page.waitForTimeout(gap);} };
await page.mouse.move(5,5); await snap(8);
await tid('wd-head-wizard').hover(); await snap(5);
await tid('wd-head-crown').click(); await snap(10,90);
await tid('wd-var-silber').click(); await snap(5);
await tid('wd-tab-face').click(); await snap(3); await tid('wd-face-sunglasses').click(); await snap(8,90);
await tid('wd-tab-neck').click(); await tid('wd-neck-medallion').click(); await snap(8,90);
await tid('wd-turn').click(); await snap(12,90);
await tid('wd-random').click(); await snap(10,90);
await tid('wd-random').click(); await snap(10,90);
await tid('wd-undo').click(); await snap(10,90);
console.log('frames',n); await b.close();
