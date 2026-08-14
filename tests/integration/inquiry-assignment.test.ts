import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  assignInquiry,
  getInquiryDetailForActor,
  getInquiryMetricsForActor,
  listInquiriesForActor,
} from "@/src/application/admin-inquiries";
import { replaceInquiryAndNotificationData } from "@/src/application/inquiry-demo-reset";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import { replacePresetAccounts } from "@/src/modules/identity-access/server/preset-accounts";
import {
  ensurePresetCredentials,
  type PresetCredentials,
} from "@/src/modules/identity-access/server/preset-credentials";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);
const referenceNumber = "TQI-ASGN-0001-TEST";
let credentials: PresetCredentials;

async function createPendingInquiry() {
  const submittedAt = new Date("2026-08-14T01:00:00.000Z");
  const submission = await prisma.inquirySubmission.create({
    data: {
      clientFingerprintHash: "assignment-test-fingerprint",
      completedAt: submittedAt,
      disposition: "accepted",
      expiresAt: new Date("2026-08-14T03:00:00.000Z"),
      interfaceLanguage: "en",
      issuedAt: new Date("2026-08-14T00:59:50.000Z"),
      referenceNumber,
      sourcePage: "/en/inquiry",
      tokenHash: "assignment-test-token",
    },
  });
  const inquiry = await prisma.inquiry.create({
    data: {
      company: "Harborline Fleet Parts",
      contactName: "Alex Morgan",
      countryRegion: "Singapore",
      customPackagingNeeded: false,
      expectedQuantity: "240 pcs",
      interfaceLanguage: "en",
      message: "Please confirm private-label lead time.",
      phoneOrWhatsapp: "+65 6000 4827",
      privacyConsentAt: submittedAt,
      privateLabelNeeded: true,
      referenceNumber,
      sourcePage: "/en/inquiry",
      submissionId: submission.id,
      submittedAt,
      targetMarket: "Southeast Asia",
      workEmail: "alex@harborline.example",
    },
  });

  await prisma.notificationOutboxRecord.create({
    data: {
      contentPreview: `New inquiry ${referenceNumber}.`,
      createdAt: submittedAt,
      inquiryId: inquiry.id,
      inquiryReferenceNumber: referenceNumber,
      recipientRole: APP_ROLES.ADMINISTRATOR,
      template: "new_inquiry_for_administrator",
    },
  });

  return inquiry;
}

describe("询盘分配与当前负责人隐私边界", () => {
  beforeAll(async () => {
    credentials = await ensurePresetCredentials();
  });

  beforeEach(async () => {
    await replaceInquiryAndNotificationData(prisma);
    await replacePresetAccounts(prisma, credentials);
  });

  afterAll(async () => {
    await replaceInquiryAndNotificationData(prisma);
    await replacePresetAccounts(prisma, credentials);
    await prisma.$disconnect();
  });

  it("管理员首次分配时原子更新当前负责人、状态、历史、审计和负责人通知", async () => {
    const inquiry = await createPendingInquiry();
    const administrator = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.ADMINISTRATOR },
    });
    const sales = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.SALES },
    });
    const actor: AdminActor = {
      id: administrator.id,
      name: administrator.name,
      role: APP_ROLES.ADMINISTRATOR,
    };
    const assignedAt = new Date("2026-08-14T01:10:00.000Z");

    await assignInquiry({
      actor,
      expectedVersion: 1,
      newOwnerId: sales.id,
      now: assignedAt,
      prisma,
      reason: "按东南亚区域首次分配",
      referenceNumber,
    });

    await expect(
      prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } }),
    ).resolves.toMatchObject({
      currentOwnerId: sales.id,
      lastModifiedByUserId: administrator.id,
      status: "assigned",
      updatedAt: assignedAt,
      version: 2,
    });
    await expect(
      prisma.inquiryAssignment.findMany({ where: { inquiryId: inquiry.id } }),
    ).resolves.toEqual([
      expect.objectContaining({
        assignedAt,
        assignedByUserId: administrator.id,
        newOwnerId: sales.id,
        previousOwnerId: null,
        reason: "按东南亚区域首次分配",
      }),
    ]);
    await expect(
      prisma.auditLog.findMany({
        where: { event: "INQUIRY_ASSIGNED", targetId: inquiry.id },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        actorUserId: administrator.id,
        outcome: "SUCCESS",
        summary: `当前负责人从未分配变更为${sales.name}。`,
        targetType: "INQUIRY",
      }),
    ]);
    await expect(
      prisma.notificationOutboxRecord.findMany({
        orderBy: { createdAt: "asc" },
        where: { inquiryId: inquiry.id },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        recipientRole: APP_ROLES.ADMINISTRATOR,
        template: "new_inquiry_for_administrator",
      }),
      expect.objectContaining({
        createdAt: assignedAt,
        recipientRole: APP_ROLES.SALES,
        recipientUserId: sales.id,
        template: "inquiry_assigned_to_current_owner",
      }),
    ]);
  });

  it("重新分配后旧负责人立即失权、新负责人获得完整访问且历史原因保留", async () => {
    await createPendingInquiry();
    const administrator = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.ADMINISTRATOR },
    });
    const firstOwner = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.SALES },
    });
    const secondOwner = await prisma.user.create({
      data: {
        email: "second-sales@torquelis.local",
        id: "integration-second-sales",
        name: "周程",
        role: APP_ROLES.SALES,
      },
    });
    const administratorActor: AdminActor = {
      id: administrator.id,
      name: administrator.name,
      role: APP_ROLES.ADMINISTRATOR,
    };

    await assignInquiry({
      actor: administratorActor,
      expectedVersion: 1,
      newOwnerId: firstOwner.id,
      prisma,
      reason: "按东南亚区域首次分配",
      referenceNumber,
    });
    await assignInquiry({
      actor: administratorActor,
      expectedVersion: 2,
      newOwnerId: secondOwner.id,
      prisma,
      reason: "原负责人休假，转交当日值班人员",
      referenceNumber,
    });

    const firstOwnerActor: AdminActor = {
      id: firstOwner.id,
      name: firstOwner.name,
      role: APP_ROLES.SALES,
    };
    const secondOwnerActor: AdminActor = {
      id: secondOwner.id,
      name: secondOwner.name,
      role: APP_ROLES.SALES,
    };

    await expect(
      getInquiryDetailForActor({
        actor: firstOwnerActor,
        prisma,
        referenceNumber,
      }),
    ).rejects.toMatchObject({
      code: "NOT_CURRENT_OWNER",
      currentOwnerName: "周程",
    });
    await expect(
      getInquiryDetailForActor({
        actor: secondOwnerActor,
        prisma,
        referenceNumber,
      }),
    ).resolves.toMatchObject({
      company: "Harborline Fleet Parts",
      contactName: "Alex Morgan",
      currentOwner: { id: secondOwner.id, name: "周程" },
      message: "Please confirm private-label lead time.",
      phoneOrWhatsapp: "+65 6000 4827",
      workEmail: "alex@harborline.example",
    });

    const history = await prisma.inquiryAssignment.findMany({
      orderBy: { assignedAt: "asc" },
      where: { inquiry: { referenceNumber } },
    });
    expect(history).toEqual([
      expect.objectContaining({
        newOwnerId: firstOwner.id,
        previousOwnerId: null,
        reason: "按东南亚区域首次分配",
      }),
      expect.objectContaining({
        newOwnerId: secondOwner.id,
        previousOwnerId: firstOwner.id,
        reason: "原负责人休假，转交当日值班人员",
      }),
    ]);
  });

  it("拒绝基于旧版本的重复分配并返回最新修改人和时间", async () => {
    const inquiry = await createPendingInquiry();
    const administrator = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.ADMINISTRATOR },
    });
    const firstOwner = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.SALES },
    });
    const secondOwner = await prisma.user.create({
      data: {
        email: "conflict-sales@torquelis.local",
        id: "integration-conflict-sales",
        name: "周程",
        role: APP_ROLES.SALES,
      },
    });
    const actor: AdminActor = {
      id: administrator.id,
      name: administrator.name,
      role: APP_ROLES.ADMINISTRATOR,
    };
    const winningModifiedAt = new Date("2026-08-14T01:15:00.000Z");

    await assignInquiry({
      actor,
      expectedVersion: 1,
      newOwnerId: firstOwner.id,
      now: winningModifiedAt,
      prisma,
      reason: "首次分配给东南亚负责人",
      referenceNumber,
    });

    await expect(
      assignInquiry({
        actor,
        expectedVersion: 1,
        newOwnerId: secondOwner.id,
        now: new Date("2026-08-14T01:16:00.000Z"),
        prisma,
        reason: "基于旧页面重复提交",
        referenceNumber,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      conflict: {
        latestModifiedAt: winningModifiedAt,
        latestModifiedBy: administrator.name,
        latestVersion: 2,
      },
    });

    await expect(
      prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } }),
    ).resolves.toMatchObject({
      currentOwnerId: firstOwner.id,
      version: 2,
    });
    await expect(
      prisma.inquiryAssignment.count({ where: { inquiryId: inquiry.id } }),
    ).resolves.toBe(1);
    await expect(
      prisma.auditLog.count({
        where: {
          event: { in: ["INQUIRY_ASSIGNED", "INQUIRY_REASSIGNED"] },
          targetId: inquiry.id,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.notificationOutboxRecord.count({
        where: { inquiryId: inquiry.id },
      }),
    ).resolves.toBe(2);
  });

  it("内容编辑只获得脱敏数量且业务人员列表只包含当前负责询盘", async () => {
    await createPendingInquiry();
    const administrator = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.ADMINISTRATOR },
    });
    const contentEditor = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.CONTENT_EDITOR },
    });
    const sales = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.SALES },
    });
    const contentEditorActor: AdminActor = {
      id: contentEditor.id,
      name: contentEditor.name,
      role: APP_ROLES.CONTENT_EDITOR,
    };
    const salesActor: AdminActor = {
      id: sales.id,
      name: sales.name,
      role: APP_ROLES.SALES,
    };
    const administratorActor: AdminActor = {
      id: administrator.id,
      name: administrator.name,
      role: APP_ROLES.ADMINISTRATOR,
    };

    await expect(
      getInquiryMetricsForActor({ actor: contentEditorActor, prisma }),
    ).resolves.toEqual({ total: 1 });
    await expect(
      listInquiriesForActor({ actor: contentEditorActor, prisma }),
    ).rejects.toMatchObject({ code: "FORBIDDEN_ROLE" });
    await expect(
      getInquiryDetailForActor({
        actor: contentEditorActor,
        prisma,
        referenceNumber,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN_ROLE" });
    await expect(
      listInquiriesForActor({ actor: salesActor, prisma }),
    ).resolves.toEqual([]);

    const administratorList = await listInquiriesForActor({
      actor: administratorActor,
      prisma,
    });
    expect(administratorList).toHaveLength(1);
    expect(administratorList[0]).toMatchObject({
      company: "Harborline Fleet Parts",
      currentOwner: null,
      referenceNumber,
      status: "pending_assignment",
    });
    expect(administratorList[0]).not.toHaveProperty("workEmail");
    expect(administratorList[0]).not.toHaveProperty("message");

    await assignInquiry({
      actor: administratorActor,
      expectedVersion: 1,
      newOwnerId: sales.id,
      prisma,
      reason: "首次分配给当前业务人员",
      referenceNumber,
    });

    const salesList = await listInquiriesForActor({
      actor: salesActor,
      prisma,
    });
    expect(salesList).toHaveLength(1);
    expect(salesList[0]).not.toHaveProperty("workEmail");
    expect(salesList[0]).not.toHaveProperty("message");
  });
});
