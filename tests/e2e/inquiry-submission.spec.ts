import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

function clientAddress(projectName: string, scenario: string) {
  return `${projectName}:${scenario}`;
}

const validRequestForm = {
  company: "Northline Distribution",
  contactName: "Maya Chen",
  countryRegion: "Singapore",
  expectedQuantity: "240 pieces quarterly",
  honeypot: "",
  locale: "en",
  message: "Please confirm availability for our replacement filter program.",
  privacyConsent: "on",
  workEmail: "maya@example.com",
};

test("采购者从产品详情提交询盘并刷新安全回执而不重复提交", async ({
  page,
}, testInfo) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": clientAddress(testInfo.project.name, "product"),
  });
  await page.goto("/en/products/TQ-FL-4827/high-efficiency-fuel-filter");
  await page.getByRole("link", { name: "Inquire about this product" }).click();

  await expect(page).toHaveURL(/\/en\/inquiry\?product=TQ-FL-4827$/u);
  await expect(page.getByText("TQ-FL-4827", { exact: true })).toBeVisible();
  await page.getByLabel("Name (Required)").fill("Maya Chen");
  await page.getByLabel("Work email (Required)").fill("maya@example.com");
  await page.getByLabel("Company (Required)").fill("Northline Distribution");
  await page.getByLabel("Country or region (Required)").fill("Singapore");
  await page
    .getByLabel("Expected purchase quantity (Required)")
    .fill("240 pieces quarterly");
  await page
    .getByLabel("Message (Required)")
    .fill("Please confirm availability for our replacement filter program.");
  await page
    .getByLabel("I agree to the privacy and demo data notice. (Required)")
    .check();
  await page.waitForTimeout(3_100);
  await page.getByRole("button", { name: "Send inquiry" }).click();

  await expect(page).toHaveURL(
    /\/en\/inquiry\/success\?reference=TQI(?:-[A-Z2-9]{4}){4}$/u,
  );
  const reference = await page.getByTestId("inquiry-reference").textContent();
  expect(reference).toMatch(/^TQI(?:-[A-Z2-9]{4}){4}$/u);
  await expect(page.getByText("maya@example.com")).toHaveCount(0);
  await expect(
    page.getByText(
      "Please confirm availability for our replacement filter program.",
    ),
  ).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId("inquiry-reference")).toHaveText(
    reference ?? "",
  );
});

test("采购者可从联系导航提交不关联产品的中文通用询盘", async ({
  page,
}, testInfo) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": clientAddress(testInfo.project.name, "general"),
  });
  await page.goto("/zh-cn");

  if ((page.viewportSize()?.width ?? 1_280) <= 820) {
    await page.getByRole("button", { name: "打开或关闭导航" }).click();
  }
  await page.getByRole("link", { exact: true, name: "联系" }).click();

  await expect(page).toHaveURL(/\/zh-cn\/inquiry$/u);
  await expect(page.getByText("产品上下文 · 只读")).toHaveCount(0);
  await page.getByLabel("姓名 (必填)").fill("陈玛雅");
  await page.getByLabel("工作邮箱 (必填)").fill("maya@example.com");
  await page.getByLabel("公司 (必填)").fill("北线分销");
  await page.getByLabel("国家或地区 (必填)").fill("新加坡");
  await page.getByLabel("预计采购数量 (必填)").fill("每季度 240 件");
  await page
    .getByLabel("留言 (必填)")
    .fill("我们希望了解贴牌与定制包装需求的演示处理流程。");
  await page.getByLabel("我同意隐私与演示数据说明。 (必填)").check();
  await page.waitForTimeout(3_100);
  await page.getByRole("button", { name: "提交询盘" }).click();

  await expect(page).toHaveURL(/\/zh-cn\/inquiry\/success\?reference=TQI/u);
  await expect(page.getByText("关联产品", { exact: true })).toHaveCount(0);
});

test("浏览器重复发送同一令牌时返回同一参考号", async ({ page }, testInfo) => {
  await page.goto("/en/inquiry");
  const token = await page.locator('input[name="token"]').inputValue();
  await page.waitForTimeout(3_100);

  const first = await page.request.post("/api/inquiries", {
    form: { ...validRequestForm, token },
    headers: {
      "x-forwarded-for": clientAddress(testInfo.project.name, "duplicate"),
    },
    maxRedirects: 0,
  });
  const repeated = await page.request.post("/api/inquiries", {
    form: { ...validRequestForm, token },
    headers: {
      "x-forwarded-for": clientAddress(testInfo.project.name, "duplicate"),
    },
    maxRedirects: 0,
  });

  expect(first.status()).toBe(303);
  expect(repeated.status()).toBe(303);
  expect(repeated.headers().location).toBe(first.headers().location);
  await page.goto(first.headers().location!);
  await expect(page.getByTestId("inquiry-reference")).toBeVisible();
});

test("服务端校验错误聚焦摘要并链接到错误字段", async ({ page }, testInfo) => {
  await page.goto("/en/inquiry");
  const token = await page.locator('input[name="token"]').inputValue();
  const response = await page.request.post("/api/inquiries", {
    form: {
      ...validRequestForm,
      token,
      workEmail: "not-an-email",
    },
    headers: {
      "x-forwarded-for": clientAddress(testInfo.project.name, "invalid"),
    },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  await page.goto(response.headers().location!);

  const summary = page.locator(".inquiry-error-summary");
  await expect(summary).toBeFocused();
  await expect(
    summary.getByRole("link", { name: "Work email" }),
  ).toHaveAttribute("href", "#workEmail");
  await expect(
    page.getByText("Enter a valid work email address."),
  ).toBeVisible();
  await expect(page.locator("#workEmail")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#contactName")).toHaveAttribute(
    "maxlength",
    "120",
  );
  await expect(page.locator("#targetMarket")).toHaveAttribute(
    "maxlength",
    "160",
  );
});

test("蜜罐提交获得不暴露风控结果的安全回执", async ({ page }, testInfo) => {
  await page.goto("/en/inquiry");
  const token = await page.locator('input[name="token"]').inputValue();
  await page.waitForTimeout(3_100);

  const response = await page.request.post("/api/inquiries", {
    form: {
      ...validRequestForm,
      honeypot: "https://spam.example",
      token,
    },
    headers: {
      "x-forwarded-for": clientAddress(testInfo.project.name, "honeypot"),
    },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  await page.goto(response.headers().location!);
  await expect(
    page.getByText("INQUIRY RECEIVED", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/spam|honeypot|risk/iu)).toHaveCount(0);
});

test("简单内容风险提交获得不暴露风控结果的安全回执", async ({
  page,
}, testInfo) => {
  await page.goto("/en/inquiry");
  const token = await page.locator('input[name="token"]').inputValue();
  await page.waitForTimeout(3_100);

  const response = await page.request.post("/api/inquiries", {
    form: {
      ...validRequestForm,
      message:
        "Review https://one.example, https://two.example and https://three.example.",
      token,
    },
    headers: {
      "x-forwarded-for": clientAddress(testInfo.project.name, "content-risk"),
    },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  await page.goto(response.headers().location!);
  await expect(
    page.getByText("INQUIRY RECEIVED", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/spam|honeypot|risk/iu)).toHaveCount(0);
});

test("同一来源超速提交仍获得确定且安全的公开回执", async ({
  page,
}, testInfo) => {
  const pages = [page];

  for (let index = 1; index < 5; index += 1) {
    pages.push(await page.context().newPage());
  }

  await Promise.all(pages.map((formPage) => formPage.goto("/en/inquiry")));
  const tokens = await Promise.all(
    pages.map((formPage) =>
      formPage.locator('input[name="token"]').inputValue(),
    ),
  );
  await page.waitForTimeout(3_100);

  const responses = [];
  for (const [index, token] of tokens.entries()) {
    responses.push(
      await page.request.post("/api/inquiries", {
        form: {
          ...validRequestForm,
          token,
          workEmail: `rate-${index}@example.com`,
        },
        headers: {
          "x-forwarded-for": clientAddress(testInfo.project.name, "rate-limit"),
        },
        maxRedirects: 0,
      }),
    );
  }

  expect(responses.every((response) => response.status() === 303)).toBe(true);
  await page.goto(responses[4]!.headers().location!);
  await expect(
    page.getByText("INQUIRY RECEIVED", { exact: true }),
  ).toBeVisible();
});
