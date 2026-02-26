import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await window.__bbmn_test?.reset?.();
  });
  await page.goto("/");
});

test("start match, record kickoff, add touchdown and see timeline", async ({ page }) => {
  await page.getByTestId("start-team-a-name").fill("Reikland Reavers");
  await page.getByTestId("start-team-b-name").fill("Gouged Eye");
  await page.getByTestId("start-begin-match").click();

  await expect(page.getByTestId("live-screen")).toBeVisible();

  const kickoffButton = page.getByTestId("kickoff-record");
  if (await kickoffButton.isVisible()) {
    await kickoffButton.click();
    await page.getByTestId("kickoff-event-select").selectOption({ index: 1 });
    await page.getByTestId("kickoff-confirm").click();
  }

  await page.getByTestId("action-touchdown").click();
  await page.getByTestId("td-team-a").click();
  await page.getByTestId("td-scorer-select").selectOption({ index: 1 });
  await page.getByTestId("td-confirm").click();

  const eventItems = page.getByTestId("event-item");
  await expect(eventItems.first()).toBeVisible();

  const latestEvent = eventItems.first();
  await expect(latestEvent).toHaveAttribute("data-event-type", "touchdown");
});
