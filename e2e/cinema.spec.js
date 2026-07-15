import { expect, test } from "@playwright/test";

const HOME = "/cinema.html";

async function waitForCinemaReady(page) {
  await page.waitForFunction(
    () => document.getElementById("loader")?.classList.contains("is-done"),
    { timeout: 120_000 }
  );
  // Handlers bind immediately after loader.finish(); one frame is enough.
  await page.waitForTimeout(100);
}

async function fillPageStep(page) {
  await page.locator("#br-name").fill("Playwright Tester");
  await page.locator("#br-email").fill("playwright@example.com");
  await page.locator("#br-brand").fill("E2E Brand Co");
}

async function openSurvey(page) {
  await page.locator("#apply-page-step").scrollIntoViewIfNeeded();
  await fillPageStep(page);
  await page.locator("[data-open-build-survey]").click();
  await expect(page.locator("#build-survey")).toBeVisible();
  await expect(page.locator("#build-survey")).toHaveAttribute("aria-hidden", "false");
}

test.describe("DW Funnel cinema e2e", () => {
  test.beforeEach(async ({ page }) => {
    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.__consoleErrors = consoleErrors;

    // Prefer static cinema path so e2e does not wait on WebGL frame decoding.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await waitForCinemaReady(page);
  });

  test("homepage boots without fatal module errors", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("#apply-page-step")).toBeAttached();
    await expect(page.locator("#build-survey")).toBeAttached();

    const fatal = (page.__consoleErrors || []).filter((msg) =>
      /Failed to fetch dynamically imported module|SyntaxError|is not defined|Unexpected token/i.test(
        msg
      )
    );
    expect(fatal, `Unexpected console errors:\n${fatal.join("\n")}`).toEqual([]);
  });

  test("FAQ accordion opens and closes without stuck height", async ({ page }) => {
    const first = page.locator(".faq-item").nth(0);
    const second = page.locator(".faq-item").nth(1);
    const secondBody = second.locator(".faq-item__a");

    await first.scrollIntoViewIfNeeded();
    await expect(first).toHaveAttribute("open", "");

    await second.locator("summary").click();
    await expect(second).toHaveAttribute("open", "");
    await expect
      .poll(async () => secondBody.evaluate((el) => el.getBoundingClientRect().height))
      .toBeGreaterThan(20);

    await second.locator("summary").click();
    await expect(second).not.toHaveAttribute("open", "");
    await expect
      .poll(async () => secondBody.evaluate((el) => el.getBoundingClientRect().height))
      .toBeLessThan(8);
  });

  test("demo lightbox uses .html URL without trailing slash", async ({ page }) => {
    await page.evaluate(() => {
      window.__workRollerSuppressClick = () => false;
      const btn = document.querySelector('.work-card__link[data-demo="/demos/auren.html?embed=1"]');
      if (!btn) throw new Error("Demo button not found");
      btn.click();
    });

    const lightbox = page.locator("#demo-lightbox");
    await expect(lightbox).toBeVisible();
    await expect(lightbox).toHaveAttribute("aria-hidden", "false");

    const iframe = page.locator(".demo-lightbox__iframe");
    await expect
      .poll(async () => iframe.getAttribute("src"), { timeout: 10_000 })
      .toMatch(/\/demos\/auren\.html\?/);

    const src = await iframe.getAttribute("src");
    expect(src).toContain("/demos/auren.html?");
    expect(src).not.toContain("/demos/auren.html/");
    expect(src).toContain("embed=1");
    expect(src).toContain("lightbox=1");

    await page.locator('[data-demo-close][aria-label="Close preview"]').click();
    await expect(lightbox).toBeHidden();
  });

  test("build survey validates empty final submit by returning to step 1", async ({ page }) => {
    await openSurvey(page);

    await page.locator("[data-survey-next]").click();
    await expect(page.locator('[data-survey-step="1"]')).toBeVisible();
    await expect(page.locator('.form-field[data-field="offer"]')).toHaveClass(/is-invalid/);

    await page.locator("#br-offer").fill("High-ticket coaching offer");
    await page.locator("#traffic-ads").check();
    await page.locator("[data-survey-next]").click();
    await expect(page.locator('[data-survey-step="2"]')).toBeVisible();

    await page.locator("#br-problem").fill("Traffic arrives but nobody books a call.");
    await page.locator("#br-page").fill("https://example.com/landing");
    await page.locator("[data-survey-next]").click();
    await expect(page.locator('[data-survey-step="3"]')).toBeVisible();

    await page.locator("#budget-3k5k").check();
    await page.locator("[data-survey-next]").click();
    await expect(page.locator('[data-survey-step="4"]')).toBeVisible();

    await page.evaluate(() => {
      const checked = document.querySelector('input[name="estimatedBudget"]:checked');
      if (checked) checked.checked = false;
    });

    await page.locator("[data-survey-next]").click();
    await expect(page.locator('[data-survey-step="3"]')).toBeVisible();
    await expect(page.locator('.form-fieldset[data-field="estimatedBudget"]')).toHaveClass(/is-invalid/);
  });

  test("build survey completes successfully with mocked API", async ({ page }) => {
    let posted = null;

    await page.route("**/api/build-request", async (route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          id: "e2e-mock",
          captured: true,
          notified: true,
          remainingToday: 2,
        }),
      });
    });

    await openSurvey(page);

    await page.locator("#br-offer").fill("Conversion-focused landing systems");
    await page.locator("#traffic-content").check();
    await page.locator("[data-survey-next]").click();

    await page.locator("#br-problem").fill("Leads bounce before the form.");
    await page.locator("#br-page").fill("https://example.com");
    await page.locator("[data-survey-next]").click();

    await page.locator("#budget-5k10k").check();
    await page.locator("#br-notes").fill("Playwright e2e run");
    await page.locator("[data-survey-next]").click();

    await expect(page.locator('[data-survey-step="4"]')).toBeVisible();
    await expect(page.locator("[data-survey-review]")).toContainText("Playwright Tester");

    await page.locator("[data-survey-next]").click();
    await expect(page.locator(".build-survey__success")).toBeVisible();
    await expect(page.locator(".build-survey__success .apply-success__heading")).toContainText(
      "We'll take a look"
    );

    expect(posted).toBeTruthy();
    expect(posted.name).toBe("Playwright Tester");
    expect(posted.email).toBe("playwright@example.com");
    expect(posted.businessBrand).toBe("E2E Brand Co");
    expect(posted.offer).toContain("Conversion-focused");
    expect(posted.estimatedBudget).toBe("$5K–10K");
    expect(posted.trafficSources).toContain("CONTENT");
  });

  test("missing page-step fields close survey and refocus contact form", async ({ page }) => {
    await openSurvey(page);

    await page.locator("#br-offer").fill("Offer copy");
    await page.locator("#traffic-dms").check();
    await page.locator("[data-survey-next]").click();
    await page.locator("#br-problem").fill("Problem copy");
    await page.locator("[data-survey-next]").click();
    await page.locator("#budget-1k3k").check();
    await page.locator("[data-survey-next]").click();
    await expect(page.locator('[data-survey-step="4"]')).toBeVisible();

    await page.evaluate(() => {
      document.querySelector("#br-name").value = "";
      document.querySelector("#br-email").value = "";
      document.querySelector("#br-brand").value = "";
    });

    await page.locator("[data-survey-next]").click();
    await expect(page.locator("#build-survey")).toBeHidden();
    await expect(page.locator("#br-name")).toBeFocused();
    await expect(page.locator('.form-field[data-field="name"]')).toHaveClass(/is-invalid/);
  });
});
