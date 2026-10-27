import { chromium } from '@playwright/test';
const b=await chromium.launch({executablePath:'/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'});
for (const [w,h,d] of [[1024,459,2],[1366,768,1],[1536,864,1.25],[1280,800,1]]){
 const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:d}); await ctx.addCookies([{name:'mora_auth_token',value:'mock',url:'http://localhost:3311'}]);
 const p=await ctx.newPage(); await p.route('**/api/core/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await p.goto('http://localhost:3311/os',{waitUntil:'networkidle'}).catch(()=>{}); await p.waitForTimeout(3000);
 await p.setViewportSize({width:w+137,height:h+61}); await p.waitForTimeout(800); await p.setViewportSize({width:w,height:h}); await p.waitForTimeout(800);
 const r=await p.evaluate(()=>Object.fromEntries(['html','.os-root','.os-shell','.os-atmo','.os-shell__main','.os-shell__topbar','.os-dock'].map(s=>{const e=document.querySelector(s); if(!e) return [s,null]; const b=e.getBoundingClientRect(); return [s,[b.left,b.top,b.right,b.bottom].map(Math.round)]})));
 console.log(w,h,d,JSON.stringify(r)); await ctx.close(); }
await b.close();
