import { expect, test } from "@playwright/test";

test("resource steppers are visible and update values", async ({ page }) => {
  await page.goto("/");

  const clickStepper = async (testId: string) => {
    const button = page.getByTestId(testId);
    await expect(button).toBeVisible();
    await button.click({ force: true });
  };

  const rerollStepper = page.getByText(/^Rerolls \(0\)$/).first();
  await expect(rerollStepper).toBeVisible();

  const incRerolls = page.getByTestId("team-a-rerolls-increase");
  const decRerolls = page.getByTestId("team-a-rerolls-decrease");

  await expect(decRerolls).toBeDisabled();
  await clickStepper("team-a-rerolls-increase");
  await expect(page.getByText(/^Rerolls \(1\)$/).first()).toBeVisible();
  await clickStepper("team-a-rerolls-decrease");
  await expect(page.getByText(/^Rerolls \(0\)$/).first()).toBeVisible();

  const incApothecary = page.getByTestId("team-a-apothecary-increase");
  const decApothecary = page.getByTestId("team-a-apothecary-decrease");

  await expect(decApothecary).toBeDisabled();
  await clickStepper("team-a-apothecary-increase");
  await expect(page.getByText(/^Apothecary \(1\)$/).first()).toBeVisible();
  await clickStepper("team-a-apothecary-decrease");
  await expect(page.getByText(/^Apothecary \(0\)$/).first()).toBeVisible();
});
