import { chromium } from '@playwright/test';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const [ph, lk, s] of [['build','kosmos','today'],['lounge','kosmos','universe'],['night','klar','today'],['flow','klar','universe']]) { await p.goto(`http://localhost:3000/os?phase=${ph}&look=${lk}#${s}`); await p.waitForTimeout(3500); await p.screenshot({ path: `/tmp/ph-${ph}-${lk}-${s}.png` }); }
await b.close();
