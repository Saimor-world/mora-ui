import { chromium } from '@playwright/test';
const [,, port, name, query=''] = process.argv;
const base=`http://localhost:${port}`;
const b=await chromium.launch({executablePath:'/home/box/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'});
const ctx=await b.newContext({viewport:{width:1440,height:900}, timezoneId:'Europe/Berlin'});
await ctx.addInitScript(()=>{localStorage.setItem('last_activity',new Date().toISOString());localStorage.setItem('saimor_dev_token','mock');});
const page=await ctx.newPage(); page.on('framenavigated',f=>{if(f===page.mainFrame())console.log('nav',f.url())}); page.on('request',q=>{const u=q.url(); if(u.includes('/api/')&&!u.includes('/api/core/'))console.log('req',u)}); page.on('pageerror',e=>console.log('err',e.message));
const profile={user_id:'u-demo',email:'demo@saimor.world',full_name:'Marius (Demo)',role:'admin',tenant_id:'t-demo',operational_state:'operational',setup_required:false,active_company_id:'c1',active_company_name:'Saimôr',company_count:1,scope_source:'mock'};
await page.route('**/api/core/**', async r=>{ const u=r.request().url(); let body=[]; if(/\/v3\/health/.test(u)) body={status:'ok'}; if(process.env.LOG)console.log('core',u.replace(/^.*\/api\/core/,''));
  if(u.includes('/v3/auth/session')) body=profile;
  else if(/\/v3\/companies(\?|$)/.test(u)) body=[{id:'c1',name:'Saimôr'}];
  else if(u.includes('/v3/mora/today')) body={};
  else if(/\/v3\/(departments|tree)(\?|$)/.test(u)) { body=[['Finanzen','finance','#d4a24c'],['Post & Termine','post','#7aa7d9'],['Werkstatt','engineering','#7fc8a9'],['Wissen','knowledge','#b39ddb'],['Wache','watch','#e57373']].map(([n,s],i)=>({id:'d'+i,tenant_id:'t-demo',company_id:'c1',name:n,slug:s,order:i,visibility:'visible',spaces:[{id:'s'+i,name:'Bereich',folders:[]}]})); if(u.includes('/v3/tree')) body={departments:body}; }
  else if(u.includes('/users/me/memberships')) body={department_memberships:[]};
  await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)}); });
await ctx.addCookies([{name:'mora_auth_token',value:'mock',url:base},{name:'mora_session',value:'local_demo_fallback',url:base}]);
await page.goto(base+'/home'+query,{waitUntil:'load',timeout:60000}).catch(e=>console.log(e.message));
await page.waitForTimeout(8000);
if(process.env.UNIV){ await page.getByRole('button',{name:/^Universe$/}).last().click().catch(e=>console.log('noclick',e.message)); await page.mouse.move(720,40); await page.waitForTimeout(6000); }
const pl=await page.locator('[data-planet-name]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return e.dataset.planetName+'@'+Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2)+' r'+Math.round(r.width/2)})); console.log('planets',pl.join(' | '));
await page.screenshot({path:`/workspace/os-shots/${name}.png`}); console.log(name, page.url());
await b.close();
