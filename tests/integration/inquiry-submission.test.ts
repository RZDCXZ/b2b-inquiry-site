import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  issueInquiryForm,
  submitInquiry,
} from "@/src/application/public-inquiry";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import {
  getInquiryByReference,
  getQuarantinedInquiryByReference,
} from "@/src/modules/inquiry-operations/server/inquiry-query";
import { replaceInquiryAndNotificationData } from "@/src/application/inquiry-demo-reset";
import { listNotificationOutbox } from "@/src/modules/notifications/server/notification-outbox-query";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);

const validForm = {
  company: "Northline Distribution",
  contactName: "Maya Chen",
  countryRegion: "Singapore",
  customPackagingNeeded: false,
  expectedQuantity: "240 pieces quarterly",
  honeypot: "",
  message: "Please confirm availability for our replacement filter program.",
  phoneOrWhatsapp: "+65 6000 0000",
  privacyConsent: true,
  privateLabelNeeded: true,
  targetMarket: "Southeast Asia",
  workEmail: "maya@example.com",
} as const;

describe("幂等且可防垃圾的询盘提交", () => {
  beforeEach(async () => {
    await replaceInquiryAndNotificationData(prisma);
  });

  afterAll(async () => {
    await replaceInquiryAndNotificationData(prisma);
    await prisma.$disconnect();
  });

  it("产品询盘原子创建待分配询盘和管理员通知发件箱记录", async () => {
    const issuedAt = new Date("2026-08-14T08:00:00.000Z");
    const form = await issueInquiryForm({
      locale: "en",
      now: issuedAt,
      prisma,
      productPartNumber: "TQ-FL-4827",
    });

    expect(form?.product?.partNumber).toBe("TQ-FL-4827");

    const result = await submitInquiry({
      clientAddress: "198.51.100.10",
      fingerprintSecret: "integration-test-secret",
      form: validForm,
      now: new Date("2026-08-14T08:00:05.000Z"),
      prisma,
      token: form?.token ?? "",
    });

    expect(result).toMatchObject({
      duplicate: false,
      receipt: {
        locale: "en",
        productPartNumber: "TQ-FL-4827",
      },
    });
    expect(result.receipt.referenceNumber).toMatch(/^TQI(?:-[A-Z2-9]{4}){4}$/u);

    await expect(
      getInquiryByReference({
        prisma,
        referenceNumber: result.receipt.referenceNumber,
      }),
    ).resolves.toMatchObject({
      company: "Northline Distribution",
      interfaceLanguage: "en",
      productId: "product-tq-fl-4827",
      sourcePage: "/en/products/TQ-FL-4827/high-efficiency-fuel-filter",
      status: "pending_assignment",
      submittedAt: new Date("2026-08-14T08:00:05.000Z"),
    });

    await expect(listNotificationOutbox({ prisma })).resolves.toEqual([
      expect.objectContaining({
        inquiryReferenceNumber: result.receipt.referenceNumber,
        recipientRole: "administrator",
        template: "new_inquiry_for_administrator",
      }),
    ]);
  });

  it("通用询盘不关联标准替换件并保存中文界面与来源页", async () => {
    const form = await issueInquiryForm({
      locale: "zh-cn",
      now: new Date("2026-08-14T08:00:00.000Z"),
      prisma,
    });
    const result = await submitInquiry({
      clientAddress: "198.51.100.11",
      fingerprintSecret: "integration-test-secret",
      form: validForm,
      now: new Date("2026-08-14T08:00:05.000Z"),
      prisma,
      token: form?.token ?? "",
    });

    expect(result.receipt).toMatchObject({
      locale: "zh-cn",
      productPartNumber: null,
    });
    await expect(
      getInquiryByReference({
        prisma,
        referenceNumber: result.receipt.referenceNumber,
      }),
    ).resolves.toMatchObject({
      interfaceLanguage: "zh_cn",
      productId: null,
      sourcePage: "/zh-cn/inquiry",
    });
  });

  it("同一一次性令牌重试返回原询盘参考号且不重复通知", async () => {
    const form = await issueInquiryForm({
      locale: "en",
      now: new Date("2026-08-14T08:00:00.000Z"),
      prisma,
    });
    const input = {
      clientAddress: "198.51.100.12",
      fingerprintSecret: "integration-test-secret",
      form: validForm,
      now: new Date("2026-08-14T08:00:05.000Z"),
      prisma,
      token: form?.token ?? "",
    };

    const first = await submitInquiry(input);
    const repeated = await submitInquiry(input);

    expect(repeated).toEqual({
      duplicate: true,
      receipt: first.receipt,
    });
    await expect(listNotificationOutbox({ prisma })).resolves.toHaveLength(1);
  });

  it("同一一次性令牌并发重试仍只创建一张询盘和一条通知", async () => {
    const form = await issueInquiryForm({
      locale: "en",
      now: new Date("2026-08-14T08:00:00.000Z"),
      prisma,
    });
    const input = {
      clientAddress: "198.51.100.16",
      fingerprintSecret: "integration-test-secret",
      form: validForm,
      now: new Date("2026-08-14T08:00:05.000Z"),
      prisma,
      token: form?.token ?? "",
    };

    const [first, repeated] = await Promise.all([
      submitInquiry(input),
      submitInquiry(input),
    ]);

    expect(first.receipt).toEqual(repeated.receipt);
    expect([first.duplicate, repeated.duplicate].sort()).toEqual([false, true]);
    await expect(listNotificationOutbox({ prisma })).resolves.toHaveLength(1);
  });

  it("蜜罐提交只进入独立垃圾询盘隔离区且不产生通知", async () => {
    const form = await issueInquiryForm({
      locale: "en",
      now: new Date("2026-08-14T08:00:00.000Z"),
      prisma,
    });
    const result = await submitInquiry({
      clientAddress: "198.51.100.13",
      fingerprintSecret: "integration-test-secret",
      form: { ...validForm, honeypot: "https://spam.example" },
      now: new Date("2026-08-14T08:00:05.000Z"),
      prisma,
      token: form?.token ?? "",
    });

    await expect(
      getInquiryByReference({
        prisma,
        referenceNumber: result.receipt.referenceNumber,
      }),
    ).resolves.toBeNull();
    await expect(
      getQuarantinedInquiryByReference({
        prisma,
        referenceNumber: result.receipt.referenceNumber,
      }),
    ).resolves.toMatchObject({ spamReasons: ["honeypot"] });
    await expect(listNotificationOutbox({ prisma })).resolves.toEqual([]);
  });

  it("简单风险规则提交只进入独立垃圾询盘隔离区", async () => {
    const form = await issueInquiryForm({
      locale: "en",
      now: new Date("2026-08-14T08:00:00.000Z"),
      prisma,
    });
    const result = await submitInquiry({
      clientAddress: "198.51.100.14",
      fingerprintSecret: "integration-test-secret",
      form: {
        ...validForm,
        message:
          "Review https://one.example, https://two.example and https://three.example.",
      },
      now: new Date("2026-08-14T08:00:05.000Z"),
      prisma,
      token: form?.token ?? "",
    });

    await expect(
      getQuarantinedInquiryByReference({
        prisma,
        referenceNumber: result.receipt.referenceNumber,
      }),
    ).resolves.toMatchObject({ spamReasons: ["suspicious_content"] });
    await expect(listNotificationOutbox({ prisma })).resolves.toEqual([]);
  });

  it("同一来源十五分钟内第五次提交进入隔离区且前四次各产生一次通知", async () => {
    const results = [];

    for (let index = 0; index < 5; index += 1) {
      const issuedAt = new Date(
        Date.parse("2026-08-14T08:00:00.000Z") + index * 10_000,
      );
      const form = await issueInquiryForm({
        locale: "en",
        now: issuedAt,
        prisma,
      });
      results.push(
        await submitInquiry({
          clientAddress: "198.51.100.15",
          fingerprintSecret: "integration-test-secret",
          form: { ...validForm, workEmail: `buyer-${index}@example.com` },
          now: new Date(issuedAt.getTime() + 5_000),
          prisma,
          token: form?.token ?? "",
        }),
      );
    }

    await expect(listNotificationOutbox({ prisma })).resolves.toHaveLength(4);
    await expect(
      getQuarantinedInquiryByReference({
        prisma,
        referenceNumber: results[4]!.receipt.referenceNumber,
      }),
    ).resolves.toMatchObject({ spamReasons: ["rate_limit"] });
  });
});
