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
  await page.goto("/en/inquiry");
  const token = await page.locator('input[name="token"]').inputValue();
  await page.waitForTimeout(3_100);
  const response = await page.request.post("/api/inquiries", {
    form: {
      company: `Assignment ${projectName}`,
      contactName: "Maya Assignment",
      countryRegion: "Singapore",
      expectedQuantity: "240 pieces quarterly",
      honeypot: "",
      locale: "en",
      message: "Private owner-only assignment browser fixture.",
      phoneOrWhatsapp: "+65 6000 4827",
      privacyConsent: "on",
      targetMarket: "Southeast Asia",
      token,
      workEmail: `assignment-${projectName}@example.com`,
    },
    headers: {
      "x-forwarded-for": `${projectName}:${token.slice(0, 12)}:assignment-owner-privacy`,
    },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  const location = response.headers().location;
  expect(location).toBeTruthy();
  const referenceNumber = new URL(location!).searchParams.get("reference");
  expect(referenceNumber).toMatch(/^TQI(?:-[A-Z2-9]{4}){4}$/u);
  return referenceNumber!;
}

async function assignFromDetail(
  page: Page,
  ownerName: string,
  reason: string,
  buttonName: "分配询盘" | "重新分配",
) {
  await page.getByRole("button", { name: buttonName }).click();
  await page.getByLabel("业务人员").selectOption({ label: ownerName });
  await page
    .getByLabel(buttonName === "重新分配" ? "重新分配原因" : "分配原因")
    .fill(reason);
  await page
    .getByRole("button", {
      name: buttonName === "重新分配" ? "确认重新分配" : "确认分配",
    })
    .click();
}

test("首次分配、并发冲突、重新分配和内容编辑隐私边界", async ({
  browser,
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const credentials = await readPresetCredentials();
  const administrator = credentials.accounts.find(
    ({ role }) => role === "administrator",
  )!;
  const contentEditor = credentials.accounts.find(
    ({ role }) => role === "content_editor",
  )!;
  const salesAccounts = credentials.accounts.filter(
    ({ role }) => role === "sales",
  );
  expect(salesAccounts).toHaveLength(2);
  const [firstOwner, secondOwner] = salesAccounts;
  const referenceNumber = await createInquiry(page, testInfo.project.name);
  const detailPath = `/admin/inquiries/${encodeURIComponent(referenceNumber)}`;

  const administratorContext = await browser.newContext();
  const administratorPage = await login(administratorContext, administrator);
  await administratorPage.goto("/admin/inquiries");
  await expect(
    administratorPage.getByRole("link", { exact: true, name: referenceNumber }),
  ).toBeVisible();
  await administratorPage.goto(detailPath);
  await expect(
    administratorPage.getByRole("heading", { name: referenceNumber }),
  ).toBeVisible();
  await expect(
    administratorPage.getByText(
      `assignment-${testInfo.project.name}@example.com`,
    ),
  ).toBeVisible();

  const assignmentTrigger = administratorPage.getByRole("button", {
    name: "分配询盘",
  });
  await assignmentTrigger.click();
  await expect(administratorPage.getByLabel("业务人员")).toBeFocused();
  await administratorPage.keyboard.press("Escape");
  await expect(
    administratorPage.getByRole("dialog", { name: "分配当前负责人" }),
  ).not.toBeVisible();
  await expect(assignmentTrigger).toBeFocused();

  const staleAdministratorPage = await administratorContext.newPage();
  await staleAdministratorPage.goto(detailPath);
  await assignFromDetail(
    administratorPage,
    firstOwner!.name,
    "按目标市场首次分配",
    "分配询盘",
  );
  await expect(
    administratorPage
      .locator(".inquiry-summary-strip")
      .getByText(firstOwner!.name, { exact: true }),
  ).toBeVisible();

  await assignFromDetail(
    staleAdministratorPage,
    secondOwner!.name,
    "旧标签页重复分配",
    "分配询盘",
  );
  const conflictAlert = staleAdministratorPage
    .getByRole("dialog", { name: "分配当前负责人" })
    .getByRole("alert");
  await expect(conflictAlert.getByText("分配冲突")).toBeVisible();
  await expect(conflictAlert).toBeFocused();
  await expect(
    staleAdministratorPage.getByText(/最新修改人：陈屿/u),
  ).toBeVisible();

  const firstOwnerContext = await browser.newContext();
  const firstOwnerPage = await login(firstOwnerContext, firstOwner!);
  await firstOwnerPage.goto(detailPath);
  await expect(
    firstOwnerPage.getByText(`assignment-${testInfo.project.name}@example.com`),
  ).toBeVisible();
  await expect(
    firstOwnerPage.getByRole("heading", { name: "责任与来源" }),
  ).toBeVisible();

  await administratorPage.reload();
  await assignFromDetail(
    administratorPage,
    secondOwner!.name,
    "原负责人休假，转交当日值班人员",
    "重新分配",
  );
  await expect(
    administratorPage.getByText("原负责人休假，转交当日值班人员"),
  ).toBeVisible();

  await firstOwnerPage.reload();
  await expect(
    firstOwnerPage.getByRole("heading", {
      name: "你不再是这张询盘的当前负责人。",
    }),
  ).toBeVisible();
  await expect(
    firstOwnerPage.getByText(`assignment-${testInfo.project.name}@example.com`),
  ).toHaveCount(0);

  const secondOwnerContext = await browser.newContext();
  const secondOwnerPage = await login(secondOwnerContext, secondOwner!);
  await secondOwnerPage.goto(detailPath);
  await expect(
    secondOwnerPage.getByText(
      `assignment-${testInfo.project.name}@example.com`,
    ),
  ).toBeVisible();
  await expect(secondOwnerPage.getByText("按目标市场首次分配")).toBeVisible();

  const contentEditorContext = await browser.newContext();
  const contentEditorPage = await login(contentEditorContext, contentEditor);
  await expect(
    contentEditorPage.getByText("询盘脱敏汇总", { exact: true }),
  ).toBeVisible();
  await expect(
    contentEditorPage.getByRole("link", { name: "询盘工作台" }),
  ).toHaveCount(0);
  await contentEditorPage.goto(detailPath);
  await expect(
    contentEditorPage.getByRole("heading", {
      name: "你没有访问此功能的权限。",
    }),
  ).toBeVisible();
  await expect(
    contentEditorPage.getByText(
      `assignment-${testInfo.project.name}@example.com`,
    ),
  ).toHaveCount(0);
  await contentEditorPage.goto("/admin/outbox");
  await expect(
    contentEditorPage.getByRole("heading", {
      name: "你没有访问此功能的权限。",
    }),
  ).toBeVisible();
  await expect(
    contentEditorPage.getByText("inquiry_assigned_to_current_owner"),
  ).toHaveCount(0);

  await Promise.all([
    administratorContext.close(),
    firstOwnerContext.close(),
    secondOwnerContext.close(),
    contentEditorContext.close(),
  ]);
});
