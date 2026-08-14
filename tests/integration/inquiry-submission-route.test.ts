import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { POST as handleInquiryPost } from "@/app/api/inquiries/route";
import { issueInquiryForm } from "@/src/application/public-inquiry";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { replaceInquiryAndNotificationData } from "@/src/application/inquiry-demo-reset";
import { listNotificationOutbox } from "@/src/modules/notifications/server/notification-outbox-query";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);

function createRequest(token: string) {
  const form = new FormData();
  form.set("company", "Northline Distribution");
  form.set("contactName", "Maya Chen");
  form.set("countryRegion", "Singapore");
  form.set("expectedQuantity", "240 pieces quarterly");
  form.set("honeypot", "");
  form.set(
    "message",
    "Please confirm availability for our replacement filter program.",
  );
  form.set("privacyConsent", "on");
  form.set("privateLabelNeeded", "on");
  form.set("token", token);
  form.set("workEmail", "maya@example.com");

  return new Request("http://127.0.0.1:3000/api/inquiries", {
    body: form,
    headers: { "x-forwarded-for": "198.51.100.40" },
    method: "POST",
  });
}

describe("询盘 POST/Redirect/GET", () => {
  beforeEach(async () => {
    await replaceInquiryAndNotificationData(prisma);
  });

  afterAll(async () => {
    await replaceInquiryAndNotificationData(prisma);
    await prisma.$disconnect();
  });

  it("POST 成功后用 303 跳转到只带不可推测参考号的成功页", async () => {
    const issuedAt = new Date(Date.now() - 5_000);
    const form = await issueInquiryForm({
      locale: "en",
      now: issuedAt,
      prisma,
      productPartNumber: "TQ-FL-4827",
    });

    const response = await handleInquiryPost(createRequest(form?.token ?? ""));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toMatch(
      /^http:\/\/127\.0\.0\.1:3000\/en\/inquiry\/success\?reference=TQI(?:-[A-Z2-9]{4}){4}$/u,
    );
  });

  it("同一令牌重复 POST 得到完全相同的成功页且只有一条通知", async () => {
    const form = await issueInquiryForm({
      locale: "en",
      now: new Date(Date.now() - 5_000),
      prisma,
    });

    const first = await handleInquiryPost(createRequest(form?.token ?? ""));
    const repeated = await handleInquiryPost(createRequest(form?.token ?? ""));

    expect(repeated.status).toBe(303);
    expect(repeated.headers.get("location")).toBe(
      first.headers.get("location"),
    );
    await expect(listNotificationOutbox({ prisma })).resolves.toHaveLength(1);
  });

  it("服务端字段校验失败时用 303 返回安全表单错误且不创建通知", async () => {
    const form = await issueInquiryForm({
      locale: "en",
      now: new Date(Date.now() - 5_000),
      prisma,
    });
    const request = createRequest(form?.token ?? "");
    const invalidForm = await request.formData();
    invalidForm.set("workEmail", "not-an-email");
    invalidForm.set("locale", "en");

    const response = await handleInquiryPost(
      new Request("http://127.0.0.1:3000/api/inquiries", {
        body: invalidForm,
        method: "POST",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://127.0.0.1:3000/en/inquiry?error=invalid&fields=workEmail",
    );
    await expect(listNotificationOutbox({ prisma })).resolves.toEqual([]);
  });
});
