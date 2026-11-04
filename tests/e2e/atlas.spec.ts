import { expect, test, type Page } from "@playwright/test";

async function waitForMap(page: Page) {
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __TRANSMAP_MAP__?: { loaded(): boolean } }).__TRANSMAP_MAP__?.loaded() ?? false), { timeout: 30_000 })
    .toBe(true);
}

test.describe("desktop atlas", () => {
  test.skip(({ isMobile }) => isMobile, "desktop layout");

  test("opens a working world map with events from several continents", async ({ page }) => {
    await page.goto("/");
    await waitForMap(page);
    await expect(page.getByTestId("filter-count")).toContainText("45 di 45");
    const rendered = await page.evaluate(() => {
      const map = (window as unknown as { __TRANSMAP_MAP__: { queryRenderedFeatures(o: object): { properties: Record<string, unknown> }[] } }).__TRANSMAP_MAP__;
      return map.queryRenderedFeatures({ layers: ["tm-events", "tm-clusters"] }).length;
    });
    expect(rendered).toBeGreaterThan(5);
  });

  test("filters by category and by century, including BCE", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Medicina e salute pubblica").check();
    await expect(page.getByTestId("filter-count")).toContainText("9 di 45");
    await page.getByTestId("reset-filters").click();
    await page.getByRole("radio", { name: "Secolo" }).click();
    await page.locator("#tm-century").fill("3");
    await page.getByLabel("Secolo — Era").selectOption("bce");
    await expect(page.getByTestId("timeline-selection")).toContainText("III secolo a.C.");
    await page.getByTestId("tab-list").click();
    await expect(page.getByTestId("list-item-ashoka-edicts")).toBeVisible();
    await expect(page.getByTestId("list-item-vajont-1963")).toHaveCount(0);
  });

  test("keeps events without coordinates accessible in the list", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("tab-list").click();
    await expect(page.getByTestId("list-item-influenza-1918")).toBeVisible();
    await expect(page.getByText("Eventi senza coordinate")).toBeVisible();
  });

  test("search opens an event card with sources and uncertainty", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: "Cerca eventi, luoghi, temi" }).fill("banqiao");
    await page.getByRole("option", { name: /Banqiao/ }).click();
    const card = page.getByTestId("event-detail");
    await expect(card.getByRole("heading", { name: "Collasso della diga di Banqiao" })).toBeVisible();
    await expect(card.getByText("Stime o fatti contestati").first()).toBeVisible();
    await expect(card.getByTestId("metric-deaths_direct")).toContainText("26.000");
    await card.getByText("Documentazione").click();
    await expect(card.getByText(/1975 Banqiao Dam failure/)).toBeVisible();
  });

  test("compares Vajont and Banqiao with methodologically separated metrics", async ({ page }) => {
    await page.goto("/?sel=vajont-1963");
    await page.getByTestId("event-detail").getByRole("button", { name: "Confronta" }).click();
    await page.getByTestId("open-compare").click();
    const panel = page.getByTestId("compare-panel");
    await panel.getByRole("combobox").fill("banqiao");
    await panel.getByRole("option", { name: /Banqiao/ }).click();
    await expect(panel.getByTestId("curated-notes")).toBeVisible();
    const direct = panel.getByTestId("compare-row-same-definition-deaths_direct");
    await expect(direct).toContainText("Collasso della diga di Banqiao ≈ 13,6× Disastro del Vajont");
    await expect(direct).toContainText("10,4× – 44,7×");
    await expect(direct.getByTestId("per-capita")).toContainText("per milione");
    const cross = panel.getByTestId("cross-definition");
    await cross.locator("summary").click();
    await expect(cross).toContainText("definizioni diverse");
    await expect(cross.getByTestId("warning-definitions-differ")).toBeVisible();
    await expect(page).toHaveURL(/cmp=vajont-1963%2Cbanqiao-1975|cmp=vajont-1963,banqiao-1975/);
  });

  test("navigates to related events", async ({ page }) => {
    await page.goto("/?sel=sputnik-1");
    const card = page.getByTestId("event-detail");
    await expect(card.getByRole("heading", { name: "Lancio dello Sputnik 1" })).toBeVisible();
    await card.getByTestId("related-event").getByRole("button", { name: "Il primo collegamento ARPANET" }).click();
    await expect(page.getByTestId("event-detail").getByRole("heading", { name: "Il primo collegamento ARPANET" })).toBeVisible();
  });

  test("suggests events beyond the chosen horizon", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("open-horizon").click();
    await page.getByTestId("horizon-select").selectOption("southern-europe");
    const panel = page.getByTestId("horizon-panel");
    await expect(panel.getByText("Conosci «Disastro del Vajont»?")).toBeVisible();
    await expect(panel.getByText("Esplora «Collasso della diga di Banqiao»")).toBeVisible();
    await expect(panel.getByText(/non misura ciò che le persone conoscono/)).toBeVisible();
  });

  test("closes panels with Escape and offers a skip link", async ({ page }) => {
    await page.goto("/?sel=caral");
    await expect(page.getByTestId("right-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("right-panel")).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Vai al contenuto principale" })).toBeFocused();
  });

  test("switches theme and persists it", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("is ready for English", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "tm-locale", value: "en", url: baseURL! }]);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByTestId("open-horizon")).toContainText("Beyond your horizon");
    await expect(page.getByTestId("filter-count")).toContainText("45 of 45 events");
  });

  test("analytics page states the limits of the database", async ({ page }) => {
    await page.goto("/analisi");
    await expect(page.getByTestId("analytics-caveat")).toContainText("non corrisponde alla densità reale");
    await expect(page.getByTestId("card-graph")).toBeVisible();
    await page.getByTestId("numeric-metric").selectOption("deaths_direct");
    await expect(page.getByTestId("card-numeric")).toContainText("Collasso della diga di Banqiao");
  });

  test("event pages are server-rendered", async ({ page }) => {
    await page.goto("/eventi/great-zimbabwe");
    await expect(page.getByRole("heading", { level: 1, name: "Grande Zimbabwe" })).toBeVisible();
    await page.goto("/metodo");
    await expect(page.getByRole("heading", { name: "Regole del confronto" })).toBeVisible();
  });
});

test.describe("mobile atlas", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile layout");

  test("uses bottom sheets for the list and the event card", async ({ page }) => {
    await page.goto("/");
    await waitForMap(page);
    await expect(page.getByTestId("mobile-nav")).toBeVisible();
    await page.getByTestId("mobile-list").click();
    await page.getByTestId("sheet-list").getByTestId("list-item-m-pesa").click();
    await expect(page.getByTestId("event-detail").getByRole("heading", { name: "M-Pesa e il denaro mobile in Kenya" })).toBeVisible();
    await page.getByTestId("close-panel").click();
    await page.getByTestId("mobile-timeline").click();
    await expect(page.getByTestId("sheet-timeline").getByTestId("timeline")).toBeVisible();
  });

  test("shows the comparison on a small screen", async ({ page }) => {
    await page.goto("/?cmp=vajont-1963,banqiao-1975&panel=compare");
    await expect(page.getByTestId("compare-panel")).toBeVisible();
    await expect(page.getByTestId("compare-row-same-definition-deaths_direct")).toContainText("13,6×");
  });
});

test.describe("API", () => {
  test.skip(({ isMobile }) => isMobile, "API once");

  test("validates input and reports errors", async ({ request }) => {
    expect((await request.get("/api/compare?ids=vajont-1963")).status()).toBe(400);
    expect((await request.get("/api/events/does-not-exist")).status()).toBe(404);
    expect((await request.get("/api/events?year=0")).status()).toBe(400);
    const res = await request.get("/api/events?century=20&categories=disasters-accidents");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.events.map((e: { id: string }) => e.id)).toContain("vajont-1963");
    const discover = await (await request.get("/api/discover?horizon=southern-europe&seeds=vajont-1963")).json();
    expect(discover.suggestions[0].event.id).toBe("banqiao-1975");
  });
});
