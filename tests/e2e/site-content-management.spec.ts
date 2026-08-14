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

test("强类型页面完整呈现内容、保持同页语言切换，并提供受保护草稿预览", async ({
  browser,
  page,
}) => {
  test.setTimeout(90_000);

  await page.goto("/en");
  await expect(
    page.getByRole("heading", { level: 2, name: "Three exact ways to search" }),
  ).toBeVisible();

  await page.goto("/en/inquiry");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "One inquiry, one clear context",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Captured by a local demo workflow",
    }),
  ).toBeVisible();

  await page.goto("/en/quality");
  await expect(
    page.locator('.locale-switcher a[href="/zh-cn/quality"]'),
  ).toBeVisible();

  const credentials = await readPresetCredentials();
  const editor = credentials.accounts.find(
    ({ role }) => role === "content_editor",
  )!;
  const editorContext = await browser.newContext();
  const editorPage = await login(editorContext, editor);

  await editorPage.goto("/admin/content/pages/about");
  const pagePreviewPromise = editorPage.waitForEvent("popup");
  await editorPage.getByRole("link", { name: "Preview English draft" }).click();
  const pagePreview = await pagePreviewPromise;
  await expect(pagePreview.getByText("未发布草稿预览")).toBeVisible();
  await expect(
    pagePreview.getByRole("heading", {
      level: 1,
      name: "A fictional manufacturer built to demonstrate a maintained inquiry system.",
    }),
  ).toBeVisible();
  await pagePreview.close();

  await editorPage.goto("/admin/content/articles/article-fitment-basics/en");
  const articlePreviewPromise = editorPage.waitForEvent("popup");
  await editorPage.getByRole("link", { name: "Preview draft" }).click();
  const articlePreview = await articlePreviewPromise;
  await expect(articlePreview.getByText("未发布草稿预览")).toBeVisible();
  await expect(
    articlePreview.getByRole("heading", {
      level: 1,
      name: "Commercial vehicle fitment basics",
    }),
  ).toBeVisible();
  await articlePreview.close();

  await editorContext.close();
});
