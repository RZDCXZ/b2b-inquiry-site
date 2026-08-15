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

test("角色总览收敛业务数据，管理员可筛选只读审计且不存在写接口", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const credentials = await readPresetCredentials();
  const administrator = credentials.accounts.find(
    ({ role }) => role === "administrator",
  )!;
  const contentEditor = credentials.accounts.find(
    ({ role }) => role === "content_editor",
  )!;
  const sales = credentials.accounts.find(({ role }) => role === "sales")!;

  const administratorContext = await browser.newContext();
  const administratorPage = await login(administratorContext, administrator);
  await expect(
    administratorPage.getByRole("heading", { name: "询盘状态分布" }),
  ).toBeVisible();
  await expect(
    administratorPage.getByRole("heading", { name: "来源分布" }),
  ).toBeVisible();
  await expect(
    administratorPage.getByRole("heading", { name: "关闭结果" }),
  ).toBeVisible();

  await administratorPage.goto("/admin/audit");
  await expect(administratorPage.getByText("审计记录只读")).toBeVisible();
  await expect(administratorPage.getByLabel("操作人")).toBeVisible();
  await expect(administratorPage.getByLabel("动作")).toBeVisible();
  await expect(administratorPage.getByLabel("目标类型")).toBeVisible();
  await administratorPage.getByLabel("动作").selectOption("LOGIN");
  await administratorPage.getByRole("button", { name: "应用筛选" }).click();
  await expect(administratorPage).toHaveURL(/action=LOGIN/u);
  await expect(
    administratorPage.locator(".admin-audit-row").filter({
      hasText: "后台登录",
    }),
  ).not.toHaveCount(0);
  await expect(
    administratorPage.getByRole("button", { name: /编辑|删除/u }),
  ).toHaveCount(0);
  const deleteResponse =
    await administratorContext.request.delete("/api/admin/audit");
  expect(deleteResponse.status()).toBe(405);
  await administratorContext.close();

  const contentContext = await browser.newContext();
  const contentPage = await login(contentContext, contentEditor);
  await expect(
    contentPage.getByText("待发布产品", { exact: true }),
  ).toBeVisible();
  await expect(
    contentPage
      .getByLabel("当前角色摘要")
      .getByText("最近导入", { exact: true }),
  ).toBeVisible();
  await expect(
    contentPage.getByRole("heading", { name: "询盘状态分布" }),
  ).toHaveCount(0);
  await expect(
    contentPage.getByRole("link", { name: "通知发件箱" }),
  ).toHaveCount(0);
  await contentPage.goto("/admin/audit");
  await expect(
    contentPage.getByRole("heading", { name: "你没有访问此功能的权限。" }),
  ).toBeVisible();
  await contentContext.close();

  const salesContext = await browser.newContext();
  const salesPage = await login(salesContext, sales);
  await expect(
    salesPage.getByLabel("当前角色摘要").getByText("我的询盘", { exact: true }),
  ).toBeVisible();
  await expect(
    salesPage
      .getByLabel("当前角色摘要")
      .getByText("我的到期跟进", { exact: true }),
  ).toBeVisible();
  await expect(salesPage.getByRole("link", { name: "内容发布" })).toHaveCount(
    0,
  );
  await salesContext.close();
});
