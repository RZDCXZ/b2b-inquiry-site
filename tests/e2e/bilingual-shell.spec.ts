import { expect, test } from "@playwright/test";

test("the public shell is bilingual and the root always redirects to English", async ({
  browser,
}) => {
  const chineseContext = await browser.newContext({ locale: "zh-CN" });
  const page = await chineseContext.newPage();

  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(
    page.getByRole("heading", {
      name: "Find the right filter, without the guesswork.",
    }),
  ).toBeVisible();

  const partTab = page.getByRole("tab", { name: "PART / REFERENCE" });
  await partTab.focus();
  await partTab.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "VEHICLE" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("Vehicle make, model or engine")).toBeVisible();

  await page.getByRole("link", { name: "简中" }).click();
  await expect(page).toHaveURL(/\/zh-cn$/);
  await expect(
    page.getByRole("heading", { name: "准确找到滤清器，不靠猜测。" }),
  ).toBeVisible();

  await chineseContext.close();
});
