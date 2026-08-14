import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import type { PresetAccountCredential } from "@/src/modules/identity-access/server/preset-credentials";
import { readPresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";

async function login(
  context: BrowserContext,
  account: PresetAccountCredential,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.getByLabel("邮箱").fill(account.email);
  await page.getByLabel("密码").fill(account.password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/admin$/u);
  return page;
}

async function createInquiry(page: Page, projectName: string): Promise<string> {
  let lastLocation = "missing Location header";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.goto("/en/inquiry");
    const token = await page.locator('input[name="token"]').inputValue();
    await page.waitForTimeout(3_100);
    const response = await page.request.post("/api/inquiries", {
      form: {
        company: `Lifecycle ${projectName}`,
        contactName: "Maya Lifecycle",
        countryRegion: "Singapore",
        expectedQuantity: "240 pieces quarterly",
        honeypot: "",
        locale: "en",
        message: "Follow-up quote and closure browser fixture.",
        phoneOrWhatsapp: "+65 6000 4827",
        privacyConsent: "on",
        targetMarket: "Southeast Asia",
        token,
        workEmail: `lifecycle-${projectName}@example.com`,
      },
      headers: {
        "x-forwarded-for": `${projectName}:${attempt}:${token.slice(0, 12)}:follow-up-lifecycle`,
      },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(303);
    lastLocation = response.headers().location ?? lastLocation;
    const referenceNumber = new URL(lastLocation, page.url()).searchParams.get(
      "reference",
    );

    if (referenceNumber) {
      expect(referenceNumber).toMatch(/^TQI(?:-[A-Z2-9]{4}){4}$/u);
      return referenceNumber;
    }
  }

  throw new Error(`无法创建生命周期测试询盘；最后重定向：${lastLocation}`);
}

test("当前负责人联系、报价、关闭后管理员重新打开并保留时间线", async ({
  browser,
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const credentials = await readPresetCredentials();
  const administrator = credentials.accounts.find(
    ({ role }) => role === "administrator",
  )!;
  const sales = credentials.accounts.find(({ role }) => role === "sales")!;
  const referenceNumber = await createInquiry(page, testInfo.project.name);
  const detailPath = `/admin/inquiries/${encodeURIComponent(referenceNumber)}`;

  const administratorContext = await browser.newContext();
  const administratorPage = await login(administratorContext, administrator);
  await administratorPage.goto(detailPath);
  await administratorPage.getByRole("button", { name: "分配询盘" }).click();
  const assignmentDialog = administratorPage.getByRole("dialog", {
    name: "分配当前负责人",
  });
  await assignmentDialog.getByLabel("业务人员").selectOption({
    label: sales.name,
  });
  await assignmentDialog.getByLabel("分配原因").fill("按目标市场首次分配");
  await assignmentDialog.getByRole("button", { name: "确认分配" }).click();
  await expect(
    administratorPage.locator(".inquiry-summary-strip").getByText(sales.name),
  ).toBeVisible();

  const salesContext = await browser.newContext();
  const salesPage = await login(salesContext, sales);
  await salesPage.goto(detailPath);

  await expect(
    salesPage.getByRole("button", { name: "追加报价记录" }),
  ).toHaveCount(0);
  await expect(salesPage.getByRole("button", { name: "关闭询盘" })).toHaveCount(
    0,
  );
  await salesPage.getByRole("button", { name: "追加联系记录" }).click();
  const contactDialog = salesPage.getByRole("dialog", {
    name: "追加联系记录",
  });
  await contactDialog
    .locator("form")
    .evaluate((form: HTMLFormElement) => (form.noValidate = true));
  await contactDialog.getByRole("button", { name: "追加联系记录" }).click();
  const validationSummary = contactDialog.locator(
    ".admin-action-message.is-error",
  );
  await expect(validationSummary).toBeFocused();
  await expect(
    validationSummary.getByRole("link", { name: "摘要" }),
  ).toHaveAttribute("href", "#lifecycle-summary");
  await expect(
    contactDialog.getByText("请填写 2–2000 字的摘要。"),
  ).toBeVisible();
  await expect(contactDialog.locator("#lifecycle-summary")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await contactDialog
    .getByLabel("摘要")
    .fill("通过工作邮箱确认了车型与预计采购量。");
  await contactDialog.getByLabel("下一步日期（选填）").fill("2026-08-18");
  await contactDialog.getByRole("button", { name: "追加联系记录" }).click();
  await expect(
    salesPage.locator(".inquiry-summary-strip").getByText("跟进中"),
  ).toBeVisible();
  await expect(
    salesPage.getByText("通过工作邮箱确认了车型与预计采购量。"),
  ).toBeVisible();

  await salesPage.getByRole("button", { name: "追加报价记录" }).click();
  const quoteDialog = salesPage.getByRole("dialog", { name: "追加报价记录" });
  await quoteDialog.getByLabel("报价金额").fill("2880.00");
  await quoteDialog.getByLabel("币种").selectOption("USD");
  await quoteDialog.getByLabel("有效期").fill("2026-09-15");
  await quoteDialog
    .getByLabel("摘要")
    .fill("已按 240 pcs 发送演示报价，等待确认包装要求。");
  await quoteDialog.getByLabel("下一步日期（选填）").fill("2026-08-20");
  await quoteDialog.getByRole("button", { name: "追加报价记录" }).click();
  await expect(
    salesPage.locator(".inquiry-summary-strip").getByText("已报价"),
  ).toBeVisible();
  await expect(salesPage.getByText(/USD 2880\.00/u)).toBeVisible();
  await expect(
    salesPage.getByText("已按 240 pcs 发送演示报价，等待确认包装要求。"),
  ).toBeVisible();

  await salesPage.getByRole("button", { name: "关闭询盘" }).click();
  const closeDialog = salesPage.getByRole("dialog", { name: "关闭询盘" });
  await closeDialog.getByRole("radio", { exact: true, name: "成交" }).check();
  await closeDialog
    .getByLabel("关闭说明（选填）")
    .fill("采购者确认接受本次演示报价。");
  await closeDialog.getByRole("button", { name: "关闭询盘" }).click();
  await expect(
    salesPage.locator(".inquiry-summary-strip").getByText("已关闭"),
  ).toBeVisible();
  await expect(
    salesPage.locator(".inquiry-summary-strip").getByText("成交", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    salesPage.getByRole("button", { name: "重新打开询盘" }),
  ).toHaveCount(0);

  await administratorPage.reload();
  await administratorPage.getByRole("button", { name: "重新打开询盘" }).click();
  const reopenDialog = administratorPage.getByRole("dialog", {
    name: "重新打开询盘",
  });
  await reopenDialog
    .getByLabel("重开说明（选填）")
    .fill("采购者补充了包装条款，需要重新跟进。");
  await reopenDialog.getByRole("button", { name: "重新打开询盘" }).click();
  await expect(
    administratorPage.locator(".inquiry-summary-strip").getByText("已分配"),
  ).toBeVisible();
  await expect(
    administratorPage
      .locator(".inquiry-timeline")
      .getByText("重新打开询盘", { exact: true }),
  ).toBeVisible();
  await expect(
    administratorPage.getByText("采购者确认接受本次演示报价。"),
  ).toBeVisible();
  await expect(administratorPage.getByText(/USD 2880\.00/u)).toBeVisible();

  await Promise.all([administratorContext.close(), salesContext.close()]);
});
