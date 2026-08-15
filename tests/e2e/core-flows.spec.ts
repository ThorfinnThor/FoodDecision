import { expect, test } from "@playwright/test";

test("Finder clears only its implicit vegan filter when the goal changes", async ({ page }) => {
  await page.goto("/de/finder");
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: /Vegan Vegane Kennzeichnung/ }).click();
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByRole("checkbox", { name: /Nur vegan/ })).toBeChecked();

  await page.getByRole("button", { name: "Zurück" }).click();
  await page.getByRole("button", { name: /Proteinreich/ }).click();
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByRole("checkbox", { name: /Nur vegan/ })).not.toBeChecked();
  await expect(page.getByRole("heading", { name: "Grenzen und Ausschlüsse" })).toBeFocused();
});

test("comparison search exposes a listbox only when options exist", async ({ page }) => {
  await page.goto("/de/compare");
  const search = page.getByRole("combobox", { name: /Produkt A/ });
  await search.fill("x");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await search.fill("zzzzzz");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.getByText("Kein passendes Produkt gefunden.")).toBeVisible();
});

test("prepared comparison filters are shareable and follow browser history", async ({ page }) => {
  await page.goto("/de/compare");
  const filter = page.locator(".prepared-comparison-filter select");
  test.skip(await filter.count() === 0, "fixture catalog has no prepared comparisons");
  const category = await filter.locator("option").nth(1).getAttribute("value");
  expect(category).toBeTruthy();
  await filter.selectOption(category!);
  await expect(page).toHaveURL(`/de/compare?category=${category}`);
  await expect(page.locator(".prepared-comparison-card")).toHaveCount(1);
  await page.goBack();
  await expect(filter).toHaveValue("");
  await page.goForward();
  await expect(filter).toHaveValue(category!);
});

test("self comparison and invalid catalog pages recover to canonical URLs", async ({ page }) => {
  const slug = "nordhafer-barista-ohne-zucker";
  await page.goto(`/de/compare/${slug}-vs-${slug}`);
  await expect(page).toHaveURL(`/de/compare?first=${slug}`);

  await page.goto("/de/products?page=999");
  await expect(page).toHaveURL("/de/products");
  await expect(page.locator(".catalog-result-line")).toContainText("Seite 1 von 1");
});

test("core catalog pages do not overflow a mobile viewport", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "mobile project only");
  await page.goto("/de/products");
  const dimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
  const menuButton = page.getByRole("button", { name: "Menü", exact: true });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Mobile Navigation" })).toBeVisible();

  await page.goto("/de/compare/nordhafer-barista-ohne-zucker-vs-oatly-style-haferdrink-classic");
  const comparisonDimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
  expect(comparisonDimensions.body).toBeLessThanOrEqual(comparisonDimensions.viewport);
  await expect(page.locator(".comparison-table tbody tr")).toHaveCount(7);
});
