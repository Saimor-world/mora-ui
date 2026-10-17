import { expect, test } from "@playwright/test";

/** Public synthetic Lab is independent of CORE login; assert real page scrolling. */
for (const width of [390, 1280]) {
  test(`XRPL Commerce Lab scrolls without OS session at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/xrpl-commerce-lab");
    await expect(page.getByTestId("xrpl-commerce-lab")).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/commerce-lab-scroll/);

    const initial = await page.evaluate(() => ({
      viewport: window.innerHeight,
      documentHeight: Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
      ),
    }));
    expect(initial.documentHeight).toBeGreaterThan(initial.viewport + 100);

    await page.evaluate(() => {
      window.scrollTo(0, 1000);
      document.body.scrollTop = 1000;
      document.documentElement.scrollTop = 1000;
    });
    await expect.poll(async () => page.evaluate(() => Math.max(
      window.scrollY, document.body.scrollTop, document.documentElement.scrollTop,
    ))).toBeGreaterThan(100);

    await expect(page.getByText("LIVE SETTLEMENT: DEAKTIVIERT")).toBeAttached();
  });
}
