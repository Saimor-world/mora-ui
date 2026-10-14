// Universe-Screenshots NUR mit echten Daten: FIXTURE = Export aus der echten CORE-Datenbank
// (siehe mora/real-universe-export.json, erzeugt lesend über services/universe_model + api/v3/planets).
// Keine erfundenen Abteilungen mehr – früher stand hier Finanzen/Post/Werkstatt/Wissen/Wache als Fake.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const [,, port, name, query=''] = process.argv;
const FIXTURE = process.env.FIXTURE; const COMPANY = process.env.COMPANY || '';
if (!FIXTURE) { console.error('FIXTURE fehlt: echte Export-Datei angeben (keine Fake-Daten).'); process.exit(2); }
const real = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const entry = Object.entries(real.by_company).find(([k]) => !COMPANY || k.toLowerCase().includes(COMPANY.toLowerCase()));
const uni = entry ? entry[1] : real.default; const company = uni.company;
const depts = uni.planets.filter(p => p.kind === 'domain').map((p, i) => ({ id: p.department_id, tenant_id: 'tenant-saimor-hq', company_id: company.id, name: p.label, slug: p.domain_type, order: i, visibility: 'visible',
  spaces: (p.moons || []).map(m => ({ id: m.key.replace('space:', ''), name: m.label, folders: [] })) }));
const base=`http://localhost:${port}`;
const b=await chromium.launch({executablePath:'/home/box/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'});
const W=+(process.env.W||1440), H=+(process.env.H||900);
const ctx=await b.newContext({viewport:{width:W,height:H}, deviceScaleFactor: +(process.env.DPR||2), timezoneId:'Europe/Berlin'});
await ctx.addInitScript(()=>{localStorage.setItem('last_activity',new Date().toISOString());localStorage.setItem('saimor_dev_token','mock');});
if(process.env.PRE) await ctx.addInitScript(process.env.PRE);
const page=await ctx.newPage(); page.on('pageerror',e=>console.log('err',e.message));
const profile={user_id:'owner',email:'owner@saimor.world',full_name:'Marius',role:'system_owner',tenant_id:'tenant-saimor-hq',operational_state:'operational',setup_required:false,active_company_id:company.id,active_company_name:company.name,company_count:(real.companies||[]).length,scope_source:'real-export'};
await page.route('**/api/core/**', async r=>{ const u=r.request().url(); let body=[]; if(/\/v3\/health/.test(u)) body={status:'ok'};
  if(u.includes('/v3/auth/session')) body=profile;
  else if(/\/v3\/universe(\?|$)/.test(u)) body={ data: { ...uni, companies: real.companies } };
  else if(/\/v3\/companies(\?|$)/.test(u)) body=(real.companies||[]).map(c=>({id:c.id,name:c.name,is_demo:c.sector==='demo'}));
  else if(u.includes('/v3/mora/today')) body={};
  else if(/\/v3\/(departments|tree)(\?|$)/.test(u)) { body=depts; if(u.includes('/v3/tree')) body={departments:depts}; }
  else if(u.includes('/users/me/memberships')) body={department_memberships:[]};
  await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)}); });
await ctx.addCookies([{name:'mora_auth_token',value:'mock',url:base},{name:'mora_session',value:'local_demo_fallback',url:base}]);
await ctx.addInitScript((cid)=>{localStorage.setItem('last_company_id',cid);localStorage.setItem('saimor_active_company',cid);}, company.id);
await page.goto(base+'/home'+query,{waitUntil:'load',timeout:90000}).catch(e=>console.log(e.message));
await page.waitForTimeout(9000); await page.mouse.move(300,300); await page.mouse.move(700,500); await page.waitForTimeout(1500); console.log('body', (await page.locator('body').innerText()).slice(0,200).replace(/\n/g,' '));
if(process.env.UNIV){ await page.getByTestId('universe-toggle').first().click().catch(e=>console.log('noclick',e.message)); await page.mouse.move(W/2,40); await page.waitForTimeout(6000); }
if(process.env.EVAL){ await page.evaluate(process.env.EVAL); await page.waitForTimeout(+(process.env.EVALWAIT||1400)); }
if(process.env.PROBE){ console.log('PROBE', JSON.stringify(await page.evaluate(process.env.PROBE))); }
if(process.env.HOVER){ await page.locator(`[data-planet-kind][data-mora-label="${process.env.HOVER}"]`).first().hover({force:true}); await page.waitForTimeout(900); }
else if(process.env.CLICK){ await page.locator(`[data-planet-kind][data-mora-label="${process.env.CLICK}"]`).first().click({force:true}); await page.mouse.move(W/2,70); await page.waitForTimeout(1600); }
else if(!process.env.NOMOVE) { await page.mouse.move(W/2,70); await page.waitForTimeout(900); }
const pl=await page.locator('[data-planet-kind]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return (e.getAttribute('data-mora-label'))+'{'+e.style.getPropertyValue('--territory-size')+' '+e.style.left+','+e.style.top+' '+e.style.transform+'}['+e.dataset.planetKind+'/'+e.dataset.planetState+']@'+Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2)})); console.log('planets',pl.length, pl.join(' | '));
if(process.env.FRAMES){ const bb=await page.locator('[data-mora-orb]').first().boundingBox(); const clip={x:bb.x+bb.width/2-60,y:bb.y+bb.height/2-60,width:120,height:120}; const n=+process.env.FRAMES; for(let i=0;i<n;i++){ if(process.env.FRAMESTATES){ const st=process.env.FRAMESTATES.split(','); const k=Math.floor(i/(n/st.length)); if(i%Math.floor(n/st.length)===0) await page.evaluate(s=>window.dispatchEvent(new CustomEvent('mora:presence',{detail:{state:s}})), st[k]); } await page.screenshot({path:`/tmp/frames/f${String(i).padStart(4,'0')}.png`, clip}); await page.waitForTimeout(66);} }
await page.screenshot({path:`/workspace/os-shots/${name}.png`}); console.log(name, page.url());
await b.close();
