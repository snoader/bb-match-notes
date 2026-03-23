import { expect, test } from "@playwright/test";

test("resource controls are visible and apothecary uses a yes/no toggle", async ({ page }) => {
  await page.goto("/");

  const clickStepper = async (testId: string) => {
    const button = page.getByTestId(testId);
    await expect(button).toBeVisible();
    await button.click({ force: true });
  };

  const rerollStepper = page.getByText(/^Rerolls \(0\)$/).first();
  await expect(rerollStepper).toBeVisible();

  const decRerolls = page.getByTestId("team-a-rerolls-decrease");

  await expect(decRerolls).toBeDisabled();
  await clickStepper("team-a-rerolls-increase");
  await expect(page.getByText(/^Rerolls \(1\)$/).first()).toBeVisible();
  await clickStepper("team-a-rerolls-decrease");
  await expect(page.getByText(/^Rerolls \(0\)$/).first()).toBeVisible();

  const apoNo = page.getByTestId("team-a-apothecary-no");
  const apoYes = page.getByTestId("team-a-apothecary-yes");

  await expect(apoNo).toHaveAttribute("aria-pressed", "true");
  await expect(apoYes).toHaveAttribute("aria-pressed", "false");
  await apoYes.click();
  await expect(apoYes).toHaveAttribute("aria-pressed", "true");
  await expect(apoNo).toHaveAttribute("aria-pressed", "false");
  await apoNo.click();
  await expect(apoNo).toHaveAttribute("aria-pressed", "true");
});
