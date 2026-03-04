import { expect, test } from "@playwright/test";

test("resource steppers are visible and update values", async ({ page }) => {
  await page.goto("/");

  const rerollStepper = page.getByText(/^Rerolls \(0\)$/).first();
  await expect(rerollStepper).toBeVisible();

  const incRerolls = page.getByTestId("team-a-rerolls-increase");
  const decRerolls = page.getByTestId("team-a-rerolls-decrease");

  await expect(decRerolls).toBeDisabled();
  await incRerolls.click();
  await expect(page.getByText(/^Rerolls \(1\)$/).first()).toBeVisible();
  await decRerolls.click();
  await expect(page.getByText(/^Rerolls \(0\)$/).first()).toBeVisible();

  const incApothecary = page.getByTestId("team-a-apothecary-increase");
  const decApothecary = page.getByTestId("team-a-apothecary-decrease");

  await expect(decApothecary).toBeDisabled();
  await incApothecary.click();
  await expect(page.getByText(/^Apothecary \(1\)$/).first()).toBeVisible();
  await decApothecary.click();
  await expect(page.getByText(/^Apothecary \(0\)$/).first()).toBeVisible();
});
