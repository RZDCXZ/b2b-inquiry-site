import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { GET as getAuditRecords } from "@/app/api/admin/audit/route";
import { POST as handleAuthPost } from "@/app/api/auth/[...all]/route";
import { listOperationsAuditLogPage } from "@/src/application/operations-audit";
import { getOperationsDashboardForActor } from "@/src/application/operations-dashboard";
import { replaceInquiryAndNotificationData } from "@/src/application/inquiry-demo-reset";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import { listAuditLogPage } from "@/src/modules/identity-access/server/audit-query";
import { seedPresetAccounts } from "@/src/modules/identity-access/server/preset-accounts";
import {
  ensurePresetCredentials,
  type PresetCredentials,
} from "@/src/modules/identity-access/server/preset-credentials";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);
const now = new Date("2026-08-15T04:00:00.000Z");
const auditActorId = "ticket-18-audit-actor";
let credentials: PresetCredentials;

async function createInquiry({
  closeResult,
  currentOwnerId,
  nextStepDate,
  referenceNumber,
  sourcePage,
  status,
}: {
  closeResult?: "invalid" | "lost" | "won";
  currentOwnerId?: string;
  nextStepDate?: Date;
  referenceNumber: string;
  sourcePage: string;
  status: "assigned" | "closed" | "pending_assignment" | "quoted";
}) {
  const submission = await prisma.inquirySubmission.create({
    data: {
      clientFingerprintHash: `dashboard-${referenceNumber}`,
      completedAt: now,
      disposition: "accepted",
      expiresAt: new Date("2026-08-15T06:00:00.000Z"),
      interfaceLanguage: "en",
      issuedAt: new Date("2026-08-15T03:59:55.000Z"),
      referenceNumber,
      sourcePage,
      tokenHash: `dashboard-token-${referenceNumber}`,
    },
  });

  return prisma.inquiry.create({
    data: {
      closeResult,
      closedAt: status === "closed" ? now : undefined,
      company: `Dashboard ${referenceNumber}`,
      contactName: "Sensitive Contact",
      countryRegion: "Singapore",
      currentOwnerId,
      customPackagingNeeded: false,
      expectedQuantity: "240 pcs",
      interfaceLanguage: "en",
      message: `Sensitive message for ${referenceNumber}`,
      nextStepDate,
      phoneOrWhatsapp: "+65 6000 4827",
      privacyConsentAt: now,
      privateLabelNeeded: false,
      referenceNumber,
      sourcePage,
      status,
      submissionId: submission.id,
      submittedAt: now,
      workEmail: `${referenceNumber.toLowerCase()}@example.com`,
    },
  });
}

describe("运营总览与只读审计", () => {
  beforeAll(async () => {
    credentials = await ensurePresetCredentials();
    await seedPresetAccounts(prisma, credentials);
  });

  beforeEach(async () => {
    await replaceInquiryAndNotificationData(prisma);
    await prisma.session.deleteMany();
    await prisma.auditLog.deleteMany({
      where: { id: { startsWith: "ticket-18-" } },
    });
    await prisma.productImportBatch.deleteMany({
      where: { id: { startsWith: "ticket-18-" } },
    });
    await prisma.productImportPreview.deleteMany({
      where: { id: { startsWith: "ticket-18-" } },
    });
    await prisma.user.upsert({
      create: {
        email: "ticket-18-audit@torquelis.local",
        id: auditActorId,
        name: "审计筛选操作人",
        role: APP_ROLES.CONTENT_EDITOR,
      },
      update: {},
      where: { id: auditActorId },
    });
  });

  afterAll(async () => {
    await replaceInquiryAndNotificationData(prisma);
    await prisma.auditLog.deleteMany({
      where: { id: { startsWith: "ticket-18-" } },
    });
    await prisma.productImportBatch.deleteMany({
      where: { id: { startsWith: "ticket-18-" } },
    });
    await prisma.productImportPreview.deleteMany({
      where: { id: { startsWith: "ticket-18-" } },
    });
    await prisma.user.deleteMany({ where: { id: auditActorId } });
    await prisma.$disconnect();
  });

  it("管理员指标从业务记录重算，业务人员只得到本人任务，内容编辑不读取询盘内容", async () => {
    const administrator = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.ADMINISTRATOR },
    });
    const salesPeople = await prisma.user.findMany({
      orderBy: { id: "asc" },
      take: 2,
      where: { role: APP_ROLES.SALES },
    });
    const contentEditor = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.CONTENT_EDITOR },
    });
    const firstSales = salesPeople[0]!;
    const secondSales = salesPeople[1]!;

    await createInquiry({
      referenceNumber: "TQI-DASH-0001",
      sourcePage: "/en/inquiry",
      status: "pending_assignment",
    });
    await createInquiry({
      currentOwnerId: firstSales.id,
      nextStepDate: new Date("2026-08-14T00:00:00.000Z"),
      referenceNumber: "TQI-DASH-0002",
      sourcePage: "/en/products/TQ-FL-4827/filter",
      status: "assigned",
    });
    await createInquiry({
      currentOwnerId: firstSales.id,
      nextStepDate: new Date("2026-08-15T00:00:00.000Z"),
      referenceNumber: "TQI-DASH-0003",
      sourcePage: "/en/inquiry",
      status: "quoted",
    });
    await createInquiry({
      closeResult: "won",
      currentOwnerId: secondSales.id,
      referenceNumber: "TQI-DASH-0004",
      sourcePage: "/zh-cn/inquiry",
      status: "closed",
    });

    const actor = (user: typeof administrator): AdminActor => ({
      id: user.id,
      name: user.name,
      role: user.role,
    });
    const administratorDashboard = await getOperationsDashboardForActor({
      actor: actor(administrator),
      now,
    });
    const firstSalesDashboard = await getOperationsDashboardForActor({
      actor: actor(firstSales),
      now,
    });
    const contentDashboard = await getOperationsDashboardForActor({
      actor: actor(contentEditor),
      now,
    });
    const databaseStatusCounts = await prisma.inquiry.groupBy({
      _count: { _all: true },
      by: ["status"],
      orderBy: { status: "asc" },
    });

    if (
      administratorDashboard.kind !== "administrator" ||
      firstSalesDashboard.kind !== "sales" ||
      contentDashboard.kind !== "content_editor"
    ) {
      throw new Error("运营总览返回了与当前角色不一致的数据合同。");
    }

    expect(administratorDashboard).toMatchObject({
      closeResults: { invalid: 0, lost: 0, won: 1 },
      dueFollowUps: { dueToday: 1, overdue: 1, total: 2 },
      kind: "administrator",
      quotedCount: 1,
      unassignedCount: 1,
    });
    expect(administratorDashboard.statusCounts).toEqual({
      assigned: 1,
      closed: 1,
      in_progress:
        databaseStatusCounts.find(({ status }) => status === "in_progress")
          ?._count._all ?? 0,
      pending_assignment: 1,
      quoted: 1,
    });
    expect(administratorDashboard.sourceCounts).toEqual([
      { count: 2, source: "/en/inquiry" },
      { count: 1, source: "/en/products/TQ-FL-4827/filter" },
      { count: 1, source: "/zh-cn/inquiry" },
    ]);

    expect(firstSalesDashboard.kind).toBe("sales");
    expect(firstSalesDashboard.totalCount).toBe(2);
    expect(
      firstSalesDashboard.tasks.map(({ referenceNumber }) => referenceNumber),
    ).toEqual(["TQI-DASH-0002", "TQI-DASH-0003"]);
    expect(JSON.stringify(firstSalesDashboard)).not.toContain("TQI-DASH-0004");

    expect(contentDashboard.kind).toBe("content_editor");
    const contentJson = JSON.stringify(contentDashboard);
    for (const sensitiveValue of [
      "TQI-DASH",
      "Sensitive Contact",
      "Sensitive message",
      "+65 6000 4827",
      "@example.com",
    ]) {
      expect(contentJson).not.toContain(sensitiveValue);
    }
  });

  it("审计查询组合筛选操作人、动作、目标类型和时间并只返回只读安全视图", async () => {
    const administrator = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.ADMINISTRATOR },
    });
    const auditActor = await prisma.user.findUniqueOrThrow({
      where: { id: auditActorId },
    });
    await prisma.auditLog.createMany({
      data: [
        {
          actorRole: APP_ROLES.ADMINISTRATOR,
          actorUserId: administrator.id,
          createdAt: new Date("2026-08-14T15:59:59.000Z"),
          event: "INQUIRY_ASSIGNED",
          id: "ticket-18-audit-before",
          outcome: "SUCCESS",
          summary: "当前负责人从未分配变更为林婧。",
          targetId: "TQI-AUDIT-0001",
          targetType: "INQUIRY",
        },
        {
          actorRole: APP_ROLES.CONTENT_EDITOR,
          actorUserId: auditActor.id,
          createdAt: new Date("2026-08-15T03:00:00.000Z"),
          event: "PRODUCT_PUBLISHED",
          id: "ticket-18-audit-match",
          outcome: "SUCCESS",
          summary: "草稿 v2 形成不可变公开版本 v2。",
          targetId: "TQ-AUDIT-0001",
          targetType: "PRODUCT",
        },
        {
          actorRole: APP_ROLES.CONTENT_EDITOR,
          actorUserId: auditActor.id,
          createdAt: new Date("2026-08-15T16:00:00.000Z"),
          event: "PRODUCT_PUBLISHED",
          id: "ticket-18-audit-after",
          outcome: "SUCCESS",
          summary: "草稿 v3 形成不可变公开版本 v3。",
          targetId: "TQ-AUDIT-0002",
          targetType: "PRODUCT",
        },
      ],
    });

    const page = await listAuditLogPage({
      filters: {
        actorUserId: auditActor.id,
        dateFrom: "2026-08-15",
        dateTo: "2026-08-15",
        event: "PRODUCT_PUBLISHED",
        targetType: "PRODUCT",
      },
      prisma,
      take: 50,
    });
    const { records } = page;

    expect(records).toEqual([
      expect.objectContaining({
        action: "发布产品",
        id: "ticket-18-audit-match",
        operator: auditActor.name,
        target: "产品",
      }),
    ]);
    expect(Object.keys(records[0]!).sort()).toEqual([
      "action",
      "event",
      "id",
      "occurredAt",
      "operator",
      "operatorId",
      "outcome",
      "summary",
      "target",
      "targetId",
      "targetType",
    ]);
    expect(JSON.stringify(records)).not.toContain(auditActor.email);
  });

  it("审计对象把内部 ID 解析为产品编号、询盘参考号和导入批次号", async () => {
    const product = await prisma.product.findFirstOrThrow({
      orderBy: { partNumber: "asc" },
      select: { id: true, partNumber: true },
    });
    const inquiry = await createInquiry({
      referenceNumber: "TQI-AUDIT-TARGET-0001",
      sourcePage: "/en/inquiry",
      status: "pending_assignment",
    });
    const administrator = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.ADMINISTRATOR },
    });
    const importPreview = await prisma.productImportPreview.create({
      data: {
        addedCount: 0,
        affectedProductCount: 1,
        createdByUserId: administrator.id,
        errors: [],
        fileHash: "ticket-18-target-file-hash",
        id: "ticket-18-target-preview",
        originalFilename: "ticket-18-target.xlsx",
        payload: { products: [] },
        status: "confirmed",
        updatedCount: 1,
      },
    });
    const importBatch = await prisma.productImportBatch.create({
      data: {
        addedCount: 0,
        affectedProductCount: 1,
        createdByUserId: administrator.id,
        fileHash: "ticket-18-target-file-hash",
        id: "ticket-18-target-import-batch",
        originalFilename: "ticket-18-target.xlsx",
        previewId: importPreview.id,
        updatedCount: 1,
      },
      select: { batchNumber: true, id: true },
    });

    await prisma.auditLog.createMany({
      data: [
        {
          createdAt: new Date("2032-08-15T03:00:03.000Z"),
          event: "PRODUCT_PUBLISHED",
          id: "ticket-18-target-product",
          outcome: "SUCCESS",
          targetId: product.id,
          targetType: "PRODUCT",
        },
        {
          createdAt: new Date("2032-08-15T03:00:02.000Z"),
          event: "INQUIRY_ASSIGNED",
          id: "ticket-18-target-inquiry",
          outcome: "SUCCESS",
          targetId: inquiry.id,
          targetType: "INQUIRY",
        },
        {
          createdAt: new Date("2032-08-15T03:00:01.000Z"),
          event: "PRODUCT_IMPORT_CONFIRMED",
          id: "ticket-18-target-import",
          outcome: "SUCCESS",
          targetId: importBatch.id,
          targetType: "ProductImportBatch",
        },
      ],
    });

    const page = await listOperationsAuditLogPage({
      filters: { dateFrom: "2032-08-15", dateTo: "2032-08-15" },
      prisma,
    });

    expect(page.records.map(({ target }) => target)).toEqual([
      `产品 · ${product.partNumber}`,
      "询盘 · TQI-AUDIT-TARGET-0001",
      `产品导入批次 · B-${String(importBatch.batchNumber).padStart(3, "0")}`,
    ]);
    expect(JSON.stringify(page.records)).not.toContain(product.id);
    expect(JSON.stringify(page.records)).not.toContain(inquiry.id);
    expect(JSON.stringify(page.records)).not.toContain(importBatch.id);
  });

  it("审计查询使用稳定游标访问超过首屏限制的更早记录", async () => {
    await prisma.auditLog.createMany({
      data: [
        {
          createdAt: new Date("2031-08-15T03:00:03.000Z"),
          event: "SITE_CONFIGURATION_UPDATED",
          id: "ticket-18-page-3",
          outcome: "SUCCESS",
          summary: "站点配置 v3 更新为 v4。",
          targetId: "primary",
          targetType: "SITE_CONFIGURATION",
        },
        {
          createdAt: new Date("2031-08-15T03:00:02.000Z"),
          event: "SITE_CONFIGURATION_UPDATED",
          id: "ticket-18-page-2",
          outcome: "SUCCESS",
          summary: "站点配置 v2 更新为 v3。",
          targetId: "primary",
          targetType: "SITE_CONFIGURATION",
        },
        {
          createdAt: new Date("2031-08-15T03:00:01.000Z"),
          event: "SITE_CONFIGURATION_UPDATED",
          id: "ticket-18-page-1",
          outcome: "SUCCESS",
          summary: "站点配置 v1 更新为 v2。",
          targetId: "primary",
          targetType: "SITE_CONFIGURATION",
        },
      ],
    });

    const filters = {
      dateFrom: "2031-08-15",
      dateTo: "2031-08-15",
      event: "SITE_CONFIGURATION_UPDATED",
      targetType: "SITE_CONFIGURATION",
    } as const;
    const firstPage = await listAuditLogPage({ filters, prisma, take: 2 });
    expect(firstPage.records.map(({ id }) => id)).toEqual([
      "ticket-18-page-3",
      "ticket-18-page-2",
    ]);
    expect(firstPage.nextCursor).toBeTruthy();

    const secondPage = await listAuditLogPage({
      cursor: firstPage.nextCursor ?? undefined,
      filters,
      prisma,
      take: 2,
    });
    expect(secondPage.records.map(({ id }) => id)).toEqual([
      "ticket-18-page-1",
    ]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it("只读审计 GET 接口在授权后应用筛选并拒绝无效日期合同", async () => {
    const administrator = credentials.accounts.find(
      ({ role }) => role === APP_ROLES.ADMINISTRATOR,
    )!;
    const administratorUser = await prisma.user.findUniqueOrThrow({
      where: { email: administrator.email },
    });
    await prisma.auditLog.create({
      data: {
        actorRole: APP_ROLES.ADMINISTRATOR,
        actorUserId: administratorUser.id,
        createdAt: new Date("2030-08-15T03:00:00.000Z"),
        event: "SITE_CONFIGURATION_UPDATED",
        id: "ticket-18-api-match",
        outcome: "SUCCESS",
        summary: "站点配置 v1 更新为 v2；变更字段：默认 SEO。",
        targetId: "primary",
        targetType: "SITE_CONFIGURATION",
      },
    });
    const login = await handleAuthPost(
      new Request("http://127.0.0.1:3000/api/auth/sign-in/email", {
        body: JSON.stringify({
          email: administrator.email,
          password: administrator.password,
        }),
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:3000",
        },
        method: "POST",
      }),
    );
    const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
    expect(cookie).toBeTruthy();

    const response = await getAuditRecords(
      new Request(
        `http://127.0.0.1:3000/api/admin/audit?operator=${administratorUser.id}&action=SITE_CONFIGURATION_UPDATED&targetType=SITE_CONFIGURATION&from=2030-08-15&to=2030-08-15`,
        { headers: { cookie: cookie ?? "" } },
      ),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      nextCursor: null,
      records: [{ id: "ticket-18-api-match" }],
    });

    const invalid = await getAuditRecords(
      new Request("http://127.0.0.1:3000/api/admin/audit?from=2030-02-31", {
        headers: { cookie: cookie ?? "" },
      }),
    );
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({
      error: {
        code: "INVALID_FILTERS",
        message: "审计筛选条件无效。",
      },
    });
  });
});
