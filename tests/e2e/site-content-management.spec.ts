import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { readPresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";

type PresetAccount = Awaited<
  ReturnType<typeof readPresetCredentials>
>["accounts"][number];

async function login(
  context: BrowserContext,
  account: PresetAccount,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.getByLabel("邮箱").fill(account.email);
  await page.getByLabel("密码").fill(account.password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/admin$/u);
  return page;
}

test("单语文章明确标记缺失语言，内容编辑与站点设置权限保持分离", async ({
  browser,
  page,
}) => {
  test.setTimeout(90_000);

  await page.goto("/en/resources/avoiding-cross-reference-ambiguity");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Avoiding cross-reference ambiguity",
    }),
  ).toBeVisible();
  const unavailableLanguage = page.locator(
    '.locale-switcher > span[aria-disabled="true"]',
  );
  await expect(unavailableLanguage).toContainText("简中");
  await expect(unavailableLanguage).toContainText("No version");
  await expect(unavailableLanguage.locator("a")).toHaveCount(0);

  const missingResponse = await page.goto(
    "/zh-cn/resources/avoiding-cross-reference-ambiguity",
  );
  expect(missingResponse?.status()).toBe(404);

  const credentials = await readPresetCredentials();
  const editor = credentials.accounts.find(
    ({ role }) => role === "content_editor",
  )!;
  const administrator = credentials.accounts.find(
    ({ role }) => role === "administrator",
  )!;

  const editorContext = await browser.newContext();
  const editorPage = await login(editorContext, editor);
  await editorPage.goto("/admin/content");
  await expect(
    editorPage.getByRole("heading", { name: "核心页面与文章" }),
  ).toBeVisible();
  await expect(editorPage.getByText("暂无版本", { exact: true })).toBeVisible();
  await editorPage.goto("/admin/settings");
  await expect(
    editorPage.getByRole("heading", { name: "你没有访问此功能的权限。" }),
  ).toBeVisible();

  const administratorContext = await browser.newContext();
  const administratorPage = await login(administratorContext, administrator);
  await administratorPage.goto("/admin/settings");
  await expect(
    administratorPage.getByRole("heading", {
      name: "可编辑配置与环境边界",
    }),
  ).toBeVisible();
  await expect(administratorPage.getByLabel("企业中文名称")).toBeVisible();
  await expect(
    administratorPage.getByText("后台没有安全配置入口"),
  ).toBeVisible();
  await expect(
    administratorPage.getByText(/DATABASE_URL|SESSION_SECRET/u),
  ).toHaveCount(0);

  await Promise.all([editorContext.close(), administratorContext.close()]);
});
