import { spawn } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = 'C:\\Users\\mf4hr\\.gemini\\antigravity\\brain\\edcdaa1a-74d0-43af-b5d8-fd0c7ef8c50c';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function waitUrl(url, timeoutMs = 120000) {
  const start = Date.now();
  console.log(`[capture] Waiting for ${url}...`);
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        console.log(`[capture] Probed ${url} -> status 200`);
        return true;
      }
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  console.log('[capture] Starting next dev...');
  const nextProcess = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
    shell: true,
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, NEXT_PUBLIC_OS_PREVIEW: 'local' },
  });

  const cleanup = () => {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(nextProcess.pid), '/f', '/t']);
      } else {
        nextProcess.kill('SIGTERM');
      }
    } catch {
      // ignore
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(1); });

  try {
    const testUrl = `${BASE_URL}/os?firma=morgenrot&als=marius`;
    await waitUrl(testUrl);
    console.log('[capture] Server is ready!');

    const browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
    });

    const sizes = [
      { name: 'desktop-1440', width: 1440, height: 900 },
      { name: 'ipad-1024', width: 1024, height: 768 },
      { name: 'mobile-390', width: 390, height: 844 },
    ];

    const users = [
      { id: 'inhaber', als: 'marius' },
      { id: 'lena', als: 'lena' },
      { id: 'tarek', als: 'tarek' },
    ];

    for (const u of users) {
      for (const size of sizes) {
        console.log(`[capture] Capturing ${u.id} at ${size.name}...`);
        const context = await browser.newContext({
          viewport: { width: size.width, height: size.height },
          deviceScaleFactor: 2,
        });
        await context.addCookies([
          { name: 'mora_auth_token', value: 'demo-token', domain: 'localhost', path: '/' },
          { name: 'mora_auth_token', value: 'demo-token', domain: '127.0.0.1', path: '/' },
          { name: 'mora_session', value: 'demo-session', domain: 'localhost', path: '/' },
          { name: 'mora_session', value: 'demo-session', domain: '127.0.0.1', path: '/' },
        ]);
        const page = await context.newPage();
        const userUrl = `${BASE_URL}/os?firma=morgenrot&als=${u.als}`;
        await page.goto(userUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await new Promise((r) => setTimeout(r, 3000));

        const outPath = path.join(OUT_DIR, `cockpit-${u.id}-${size.name}.png`);
        await page.screenshot({ path: outPath });
        console.log(`[capture] Saved ${outPath}`);

        // For inhaber desktop, capture planet click & pixel mode
        if (u.id === 'inhaber' && size.name === 'desktop-1440') {
          try {
            const planetBtn = page.locator('[data-testid="open-kueche"]').or(page.locator('button:has-text("Küche")')).first();
            if (await planetBtn.count() > 0) {
              await planetBtn.click();
              await new Promise((r) => setTimeout(r, 1500));
              const deptPath = path.join(OUT_DIR, 'cockpit-inhaber-kueche-sheet.png');
              await page.screenshot({ path: deptPath });
              console.log(`[capture] Saved ${deptPath}`);
              // Close sheet
              const closeBtn = page.getByRole('button', { name: 'Schließen' });
              if (await closeBtn.count() > 0) await closeBtn.click();
            }
          } catch (e) {
            console.warn('[capture] Planet sheet capture notice:', e.message);
          }

          try {
            const pixelBtn = page.locator('button:has-text("Pixel")').first();
            if (await pixelBtn.count() > 0) {
              await pixelBtn.click();
              await new Promise((r) => setTimeout(r, 1500));
              const pixelPath = path.join(OUT_DIR, 'cockpit-inhaber-pixel-view.png');
              await page.screenshot({ path: pixelPath });
              console.log(`[capture] Saved ${pixelPath}`);
            }
          } catch (e) {
            console.warn('[capture] Pixel view capture notice:', e.message);
          }
        }

        await context.close();
      }
    }

    await browser.close();
    console.log('[capture] All screenshots captured successfully!');
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  console.error('[capture] Error:', err);
  process.exit(1);
});
