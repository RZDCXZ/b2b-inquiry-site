import { expect, test } from "@playwright/test";

import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import { readPresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";

test("未登录访问进入登录流程，四个预置账号获得各自后台壳层并可退出", async ({
  browser,
}) => {
  test.setTimeout(90_000);

  const credentials = await readPresetCredentials();
  const anonymousContext = await browser.newContext();
  const anonymousPage = await anonymousContext.newPage();

  await anonymousPage.goto("/admin");
  await expect(anonymousPage).toHaveURL(/\/admin\/login\?next=%2Fadmin$/);
  await expect(
    anonymousPage.getByRole("heading", { name: "登录运营后台" }),
  ).toBeVisible();
  await anonymousContext.addCookies([
    {
      domain: "127.0.0.1",
      name: "torquelis.session_token",
      path: "/",
      value: "stale-local-session",
    },
  ]);
  await anonymousPage.goto("/admin");
  await expect(anonymousPage).toHaveURL(
    /\/admin\/login\?next=%2Fadmin&reason=expired$/,
  );
  await expect(
    anonymousPage.getByText("会话已过期，请重新登录。"),
  ).toBeVisible();
  await anonymousContext.close();

  const expectations = {
    [APP_ROLES.ADMINISTRATOR]: {
      hiddenNavigation: null,
      landingHeading: "需要处理的工作",
      roleLabel: "管理员",
      summaryLabel: "待分配询盘",
      visibleNavigation: "审计日志",
    },
    [APP_ROLES.CONTENT_EDITOR]: {
      hiddenNavigation: "询盘工作台",
      landingHeading: "内容运营待办",
      roleLabel: "内容编辑",
      summaryLabel: "询盘脱敏汇总",
      visibleNavigation: "批量导入",
    },
    [APP_ROLES.SALES]: {
      hiddenNavigation: "产品内容",
      landingHeading: "我的询盘与下一步",
      roleLabel: "业务人员",
      summaryLabel: "我的下一步",
      visibleNavigation: "我的询盘",
    },
  } as const;

  for (const account of credentials.accounts) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const expected = expectations[account.role];

    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill(account.email);
    await page.getByLabel("密码").fill(account.password);
    await page.getByRole("button", { name: "登录" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { name: expected.landingHeading }),
    ).toBeVisible();
    await expect(
      page.getByText(expected.summaryLabel, { exact: true }),
    ).toBeVisible();

    const openNavigationButton = page.getByRole("button", {
      name: "打开导航",
    });
    if (await openNavigationButton.isVisible()) {
      await openNavigationButton.click();
    }
    const logoutButton = page.getByRole("button", { name: "退出登录" });

    await expect(
      page.getByText(expected.roleLabel, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: expected.visibleNavigation, exact: true }),
    ).toBeVisible();
    if (expected.hiddenNavigation) {
      await expect(
        page.getByRole("link", {
          name: expected.hiddenNavigation,
          exact: true,
        }),
      ).toHaveCount(0);
    }

    if (account.role === APP_ROLES.SALES) {
      const forbidden = await context.request.get("/api/admin/audit");
      expect(forbidden.status()).toBe(403);
      expect(await forbidden.json()).toEqual({
        error: {
          code: "FORBIDDEN",
          message: "你没有访问此功能的权限。",
        },
      });

      await page.goto("/admin/audit");
      await expect(
        page.getByRole("heading", { name: "你没有访问此功能的权限。" }),
      ).toBeVisible();
      await expect(page.getByText(/stack|prisma|database/i)).toHaveCount(0);

      if (await openNavigationButton.isVisible()) {
        await openNavigationButton.click();
      }
    }

    await expect(logoutButton).toBeVisible();
    await logoutButton.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/admin\/login\?loggedOut=1$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin$/);

    await context.close();
  }
});
