import { expect, test } from "@playwright/test";

test("产品详情按当前语言提供规格 PDF 下载入口与安全文件名", async ({
  page,
}) => {
  await page.goto("/en/products/TQ-FL-4827/high-efficiency-fuel-filter");

  const englishDownload = page.getByRole("link", {
    exact: true,
    name: "Download specification PDF",
  });
  await expect(englishDownload).toBeVisible();
  await expect(englishDownload).toHaveAttribute(
    "href",
    "/en/products/TQ-FL-4827/high-efficiency-fuel-filter/specification.pdf",
  );
  await englishDownload.hover();
  await expect(englishDownload).toHaveCSS(
    "background-color",
    "rgb(16, 40, 61)",
  );
  await expect(englishDownload).toHaveCSS("color", "rgb(255, 255, 255)");

  const englishDownloadEvent = page.waitForEvent("download");
  await englishDownload.click();
  expect((await englishDownloadEvent).suggestedFilename()).toBe(
    "TQ-FL-4827-specification-en.pdf",
  );

  await page.goto(
    "/zh-cn/products/TQ-FL-4827/%E9%AB%98%E6%95%88%E7%87%83%E6%B2%B9%E6%BB%A4%E6%B8%85%E5%99%A8",
  );

  const chineseDownload = page.getByRole("link", {
    exact: true,
    name: "下载规格 PDF",
  });
  await expect(chineseDownload).toBeVisible();
  await expect(chineseDownload).toHaveAttribute(
    "href",
    "/zh-cn/products/TQ-FL-4827/%E9%AB%98%E6%95%88%E7%87%83%E6%B2%B9%E6%BB%A4%E6%B8%85%E5%99%A8/specification.pdf",
  );
});
