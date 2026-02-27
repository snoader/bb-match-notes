import { expect, test } from "@playwright/test";

test("resource steppers are visible and update values", async ({ page }) => {
  await page.goto("/");

  const rerollStepper = page.getByText(/^Rerolls \(0\)$/).first();
  await expect(rerollStepper).toBeVisible();

  const incRerolls = page.getByRole("button", { name: "increase rerolls" }).first();
  const decRerolls = page.getByRole("button", { name: "decrease rerolls" }).first();

  await expect(decRerolls).toBeDisabled();
  await incRerolls.click();
  await expect(page.getByText(/^Rerolls \(1\)$/).first()).toBeVisible();
  await decRerolls.click();
  await expect(page.getByText(/^Rerolls \(0\)$/).first()).toBeVisible();

  const incApothecary = page.getByRole("button", { name: "increase apothecary" }).first();
  const decApothecary = page.getByRole("button", { name: "decrease apothecary" }).first();

  await expect(decApothecary).toBeDisabled();
  await incApothecary.click();
  await expect(page.getByText(/^Apothecary \(1\)$/).first()).toBeVisible();
  await decApothecary.click();
  await expect(page.getByText(/^Apothecary \(0\)$/).first()).toBeVisible();
});
