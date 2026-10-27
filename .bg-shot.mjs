import { chromium } from '@playwright/test';
import fs from 'fs';
const owl=fs.readFileSync('/workspace/owl-live.json','utf8'); const today=fs.readFileSync('/workspace/today-live.json','utf8'); const LIVE=JSON.parse(fs.readFileSync('/workspace/os-live.json','utf8')); const CID=LIVE.universe.data.company.id;
const [,, name, label='', w='1440', h='900']=process.argv;
const base='http://localhost:3311';
const b=await chromium.launch({executablePath:'/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'});
const ctx=await b.newContext({viewport:{width:+w,height:+h}, timezoneId:'Europe/Berlin'});
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
if(label.startsWith('v:')){ await page.locator(`.os-dock__item[data-feature=${label.slice(2)}] :is(a,button)`).first().click(); await page.waitForTimeout(6000); } else if(label){ await page.getByRole('button',{name:/^Universe/i}).first().click().catch(async()=>{await page.getByText('UNIVERSE').first().click()}); await page.waitForTimeout(7000); }
const el=null; console.log('brief', !!el, 'owl', !!(await page.$('[data-testid=owl-card]')));
if(el) await el.scrollIntoViewIfNeeded();
await page.screenshot({path:`/workspace/os-shots/${name}.png`, fullPage:false}); console.log(name, page.url());
await b.close();
