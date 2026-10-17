import { expect, test } from "@playwright/test";

// Browser regression: OS uses a full-screen scroll-locked canvas by design.
// The standalone Commerce Lab must remain a genuine document on phone + PC.
for (const width of [375, 390, 1440]) {
  test(`Commerce Lab scrolls vertically at ${width}px and never overflows horizontally`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 780 : 820 });

    // No live CORE account and no payment required for responsive smoke.
    await page.route("**/api/core/v3/xrpl-commerce-lab/capabilities", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { enabled: false, mode: "disabled", network: "xrpl:1" },
          meta: { api_version: "v3" },
        }),
      });
    });

    await page.goto("/xrpl-commerce-lab");
    await expect(page.getByTestId("xrpl-commerce-lab")).toBeVisible();
    await expect(page.getByText("Nur Simulation")).toBeVisible();

    const initial = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
      visibleHeight: window.innerHeight,
      htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
    }));
    expect(initial.documentWidth).toBeLessThanOrEqual(initial.viewport + 2);
    expect(initial.scrollHeight).toBeGreaterThan(initial.visibleHeight + 250);
    expect(initial.htmlOverflowY).not.toBe("hidden");
    expect(initial.bodyOverflowY).not.toBe("hidden");

    if (width < 600) {
      const nav = page.getByRole("navigation", { name: /Commerce Lab.*mobile Bereiche/ });
      await expect(nav).toBeVisible();
      await nav.getByRole("link", { name: "Echte Testnet-Prüfung" }).click();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(120);
      await expect(page.getByRole("heading", { name: "XRPL Testnet · Ledger prüfen" })).toBeVisible();
      await nav.getByRole("link", { name: "Simulation" }).click();
      await expect(page.locator("#lab-simulation")).toBeInViewport({ ratio: 0.05 });
    } else {
      await page.mouse.wheel(0, 800);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(180);
    }

    await expect(page.getByText("LIVE SETTLEMENT: DEAKTIVIERT")).toBeAttached();
  });
}
