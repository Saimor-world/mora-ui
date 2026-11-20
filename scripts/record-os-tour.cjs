const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');

(async () => {
  await fs.mkdir('os-tour', { recursive: true });
  const browser = await chromium.launch();
  const viewport = { width: 1440, height: 900 };
  const ctx = await browser.newContext({ viewport, recordVideo: { dir: 'os-tour', size: viewport } });
  const page = await ctx.newPage();
  const notes = [];
  page.on('pageerror', e => notes.push('Seitenfehler: ' + e.message));
  await page.addInitScript(() => localStorage.setItem('saimor_product_tour_dismissed', '1'));
  const wait = () => page.waitForTimeout(1350);
  const click = async locator => { await locator.click({ timeout: 4000 }); await wait(); };
  const section = async (name, action) => {
    try { await action(); notes.push(name + ' geöffnet'); }
    catch (error) { notes.push(name + ' offen: ' + error.message.split('\n')[0]); }
  };
  try {
    await page.goto('http://localhost:3000/os');
    await page.getByTestId('os-shell').waitFor();
    await wait();
    for (const [id, title] of Object.entries({today:'Heute', universe:'Universe', post:'Post', knowledge:'Wissen', finance:'Finance', mora:'MÔRA', settings:'Einstellungen', labs:'Labs & System', home:'Home'})) {
      await section(title, async () => {
        await page.keyboard.press('Escape');
        await page.keyboard.press('Control+k');
        const dialog = page.getByRole('dialog', { name: 'Befehle' });
        await dialog.getByRole('textbox').fill(title);
        await click(dialog.getByRole('option').filter({has:page.getByText(title,{exact:true})}).first());
        await page.locator('[data-active-feature="'+id+'"]').waitFor({timeout:4000});
        for (const tab of await page.locator('main [role="tab"]:visible').all()) await click(tab);
        if (id === 'universe') {
          const planet = page.locator('button[data-testid^="open-"]:visible,button[data-testid^="world-planet-"]:visible').first();
          await section('Abteilung', async () => { await click(planet); await click(page.getByTestId('dept-room-enter')); });
          await section('Aufgabe und MÔRA am selben Arbeitsplatz', async () => {
            const card = page.locator('button[data-testid^="wk-card-"]').first();
            await click(card);
            const sheet = page.getByTestId('wk-task-sheet');
            await sheet.waitFor();
            await click(page.getByTestId('wk-task-due'));
            await page.keyboard.press('Escape');
            await click(page.getByTestId('wk-dock-mora'));
            const question = page.getByTestId('mora-stage');
            await question.waitFor();
            await wait();
            await click(page.getByRole('button', {name:'MÔRA schließen'}));
            await sheet.waitFor();
            await click(page.getByTestId('wk-dock-back'));
          });
          for (const [obj, label] of [['lectern','Buch'],['mappe','Planung']]) {
            await section(label, async () => { await click(page.getByTestId('wk-hit-'+obj)); await page.keyboard.press('Escape'); await wait(); });
          }
        }
      });
    }
    await page.setViewportSize({width:390,height:844});
    await page.goto('http://localhost:3000/os#today');
    await wait();
    notes.push('Handyansicht: '+(await page.locator('body').innerText()).slice(0,160));
  } finally {
    await ctx.close();
    await browser.close();
    await fs.rename(await page.video().path(),'os-tour/SAIMOR-OS.webm');
    await fs.writeFile('os-tour/Rundgang.txt',notes.join('\n'));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
