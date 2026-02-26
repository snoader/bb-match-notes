import { expect, test } from "@playwright/test";

async function resetState(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    await window.__bbmn_test?.resetMatch();
  });
  await page.reload();
}

async function startMatch(page: import("@playwright/test").Page) {
  await page.getByTestId("start-team-a-name").fill("Team A");
  await page.getByTestId("start-team-b-name").fill("Team B");
  await page.getByTestId("start-begin-match").click();
  await expect(page.getByTestId("live-screen")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await resetState(page);
});

test("start match and add touchdown", async ({ page }) => {
  await startMatch(page);

  await page.getByTestId("action-touchdown").click();
  await expect(page.getByTestId("modal")).toBeVisible();
  await page.getByTestId("td-team-a").click();
  await page.getByTestId("td-scorer-select").locator("button").first().click();
  await page.getByTestId("td-confirm").click();

  const firstEvent = page.getByTestId("event-item").first();
  await expect(firstEvent.getByTestId("event-type")).toContainText("touchdown");
});

test("add victim-only injury and keep it after reload", async ({ page }) => {
  await startMatch(page);

  await page.getByTestId("action-injury").click();
  await page.getByTestId("inj-victim-team-a").click();
  await page.getByTestId("inj-victim-select").locator("button").first().click();
  await page.getByTestId("inj-cause-select").selectOption("FAILED_DODGE");
  await page.getByTestId("inj-result-select").selectOption("MNG");
  await expect(page.getByTestId("inj-causer-select")).toHaveCount(0);
  await expect(page.getByTestId("inj-apo-toggle")).not.toBeChecked();
  await page.getByTestId("inj-confirm").click();

  const firstEvent = page.getByTestId("event-item").first();
  await expect(firstEvent.getByTestId("event-type")).toContainText("injury");

  await page.reload();
  await expect(page.getByTestId("live-screen")).toBeVisible();
  await expect(page.getByTestId("event-item").first().getByTestId("event-type")).toContainText("injury");
});
