import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { assignInquiry } from "@/src/application/admin-inquiries";
import {
  appendInquiryFollowUp,
  closeInquiry,
  reopenInquiry,
} from "@/src/application/inquiry-lifecycle";
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
const referenceNumber = "TQI-LIFE-0001-TEST";
let credentials: PresetCredentials;

async function createAssignedInquiry() {
  const submittedAt = new Date("2026-08-14T01:00:00.000Z");
  const submission = await prisma.inquirySubmission.create({
    data: {
      clientFingerprintHash: "lifecycle-test-fingerprint",
      completedAt: submittedAt,
      disposition: "accepted",
      expiresAt: new Date("2026-08-14T03:00:00.000Z"),
      interfaceLanguage: "en",
      issuedAt: new Date("2026-08-14T00:59:50.000Z"),
      referenceNumber,
      sourcePage: "/en/inquiry",
      tokenHash: "lifecycle-test-token",
    },
  });
  await prisma.inquiry.create({
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

  const administrator = await prisma.user.findFirstOrThrow({
    where: { role: APP_ROLES.ADMINISTRATOR },
  });
  const sales = await prisma.user.findFirstOrThrow({
    where: { role: APP_ROLES.SALES },
  });
  const administratorActor: AdminActor = {
    id: administrator.id,
    name: administrator.name,
    role: APP_ROLES.ADMINISTRATOR,
  };

  await assignInquiry({
    actor: administratorActor,
    expectedVersion: 1,
    newOwnerId: sales.id,
    prisma,
    reason: "按目标市场首次分配",
    referenceNumber,
  });

  return {
    administratorActor,
    actor: {
      id: sales.id,
      name: sales.name,
      role: APP_ROLES.SALES,
    } satisfies AdminActor,
  };
}

describe("联系、报价与关闭生命周期", () => {
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

  it("当前负责人追加首次联系时保存记录、推进状态并形成脱敏审计", async () => {
    const { actor } = await createAssignedInquiry();
    const occurredAt = new Date("2026-08-14T01:20:00.000Z");
    const nextStepDate = new Date("2026-08-18T00:00:00.000Z");

    await appendInquiryFollowUp({
      actor,
      expectedVersion: 2,
      nextStepDate,
      now: occurredAt,
      prisma,
      referenceNumber,
      summary: "通过工作邮箱确认了车型与预计采购量。",
      type: "contact",
    });

    await expect(
      prisma.inquiry.findUniqueOrThrow({ where: { referenceNumber } }),
    ).resolves.toMatchObject({
      lastModifiedByUserId: actor.id,
      nextStepDate,
      status: "in_progress",
      updatedAt: occurredAt,
      version: 3,
    });
    await expect(
      prisma.inquiryFollowUp.findMany({
        where: { inquiry: { referenceNumber } },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        actorUserId: actor.id,
        fromVersion: 2,
        nextStepDate,
        occurredAt,
        statusAfter: "in_progress",
        statusBefore: "assigned",
        summary: "通过工作邮箱确认了车型与预计采购量。",
        toVersion: 3,
        type: "contact",
      }),
    ]);
    const audits = await prisma.auditLog.findMany({
      where: { event: "INQUIRY_FOLLOW_UP_ADDED" },
    });
    expect(audits).toEqual([
      expect.objectContaining({
        actorUserId: actor.id,
        outcome: "SUCCESS",
        summary: "追加联系记录；状态从已分配推进到跟进中。",
      }),
    ]);
    expect(audits[0]?.summary).not.toContain("工作邮箱");
  });

  it("当前负责人追加首次报价时保存定点金额、币种和有效期并推进到已报价", async () => {
    const { actor } = await createAssignedInquiry();
    const occurredAt = new Date("2026-08-14T02:00:00.000Z");
    const quoteValidUntil = new Date("2026-09-15T00:00:00.000Z");

    await appendInquiryFollowUp({
      actor,
      expectedVersion: 2,
      now: occurredAt,
      prisma,
      quoteAmount: "2880.00",
      quoteCurrency: "USD",
      quoteValidUntil,
      referenceNumber,
      summary: "已按 240 pcs 发送演示报价，等待确认包装要求。",
      type: "quote",
    });

    await expect(
      prisma.inquiry.findUniqueOrThrow({ where: { referenceNumber } }),
    ).resolves.toMatchObject({
      status: "quoted",
      version: 3,
    });
    const [quote] = await prisma.inquiryFollowUp.findMany({
      where: { inquiry: { referenceNumber } },
    });
    expect(quote).toMatchObject({
      actorUserId: actor.id,
      quoteCurrency: "USD",
      quoteValidUntil,
      statusAfter: "quoted",
      statusBefore: "assigned",
      type: "quote",
    });
    expect(quote?.quoteAmount?.toFixed(2)).toBe("2880.00");
    const [audit] = await prisma.auditLog.findMany({
      where: { event: "INQUIRY_FOLLOW_UP_ADDED" },
    });
    expect(audit?.summary).toBe("追加报价记录；状态从已分配推进到已报价。");
    expect(audit?.summary).not.toContain("2880");
  });

  it("内部备注通过新更正记录纠错且已保存历史不可更新或删除", async () => {
    const { actor } = await createAssignedInquiry();
    const note = await appendInquiryFollowUp({
      actor,
      expectedVersion: 2,
      prisma,
      referenceNumber,
      summary: "采购者希望使用蓝色外箱。",
      type: "internal_note",
    });

    await appendInquiryFollowUp({
      actor,
      correctionOfId: note.followUp.id,
      expectedVersion: 3,
      prisma,
      referenceNumber,
      summary: "更正：采购者希望使用深海军蓝外箱，而不是亮蓝色。",
      type: "correction",
    });

    const records = await prisma.inquiryFollowUp.findMany({
      orderBy: { toVersion: "asc" },
      where: { inquiry: { referenceNumber } },
    });
    expect(records).toEqual([
      expect.objectContaining({
        correctionOfId: null,
        statusAfter: "assigned",
        summary: "采购者希望使用蓝色外箱。",
        type: "internal_note",
      }),
      expect.objectContaining({
        correctionOfId: note.followUp.id,
        statusAfter: "assigned",
        summary: "更正：采购者希望使用深海军蓝外箱，而不是亮蓝色。",
        type: "correction",
      }),
    ]);
    await expect(
      prisma.inquiryFollowUp.update({
        data: { summary: "覆盖旧备注" },
        where: { id: note.followUp.id },
      }),
    ).rejects.toThrow(/immutable/u);
    await expect(
      prisma.inquiryFollowUp.delete({ where: { id: note.followUp.id } }),
    ).rejects.toThrow(/immutable/u);
  });

  it("当前负责人带结果关闭后只有管理员可重开且全部历史保留", async () => {
    const { actor } = await createAssignedInquiry();
    await appendInquiryFollowUp({
      actor,
      expectedVersion: 2,
      prisma,
      referenceNumber,
      summary: "已确认采购量。",
      type: "contact",
    });
    await appendInquiryFollowUp({
      actor,
      expectedVersion: 3,
      prisma,
      quoteAmount: "2880.00",
      quoteCurrency: "USD",
      quoteValidUntil: new Date("2026-09-15T00:00:00.000Z"),
      referenceNumber,
      summary: "已发送演示报价。",
      type: "quote",
    });
    const closedAt = new Date("2026-08-14T03:00:00.000Z");

    await closeInquiry({
      actor,
      closeResult: "won",
      expectedVersion: 4,
      now: closedAt,
      prisma,
      reason: "采购者确认接受本次演示报价。",
      referenceNumber,
    });

    await expect(
      prisma.inquiry.findUniqueOrThrow({ where: { referenceNumber } }),
    ).resolves.toMatchObject({
      closeResult: "won",
      closedAt,
      nextStepDate: null,
      status: "closed",
      version: 5,
    });
    await expect(
      appendInquiryFollowUp({
        actor,
        expectedVersion: 5,
        prisma,
        referenceNumber,
        summary: "关闭后不应继续追加。",
        type: "contact",
      }),
    ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await expect(
      reopenInquiry({
        actor,
        expectedVersion: 5,
        prisma,
        reason: "业务人员不能自行重开。",
        referenceNumber,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const administrator = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.ADMINISTRATOR },
    });
    const administratorActor: AdminActor = {
      id: administrator.id,
      name: administrator.name,
      role: APP_ROLES.ADMINISTRATOR,
    };
    const reopenedAt = new Date("2026-08-14T04:00:00.000Z");

    await reopenInquiry({
      actor: administratorActor,
      expectedVersion: 5,
      now: reopenedAt,
      prisma,
      reason: "采购者补充了包装条款，需要重新跟进。",
      referenceNumber,
    });

    await expect(
      prisma.inquiry.findUniqueOrThrow({ where: { referenceNumber } }),
    ).resolves.toMatchObject({
      closeResult: null,
      closedAt: null,
      status: "assigned",
      version: 6,
    });
    await expect(
      prisma.inquiryFollowUp.count({ where: { inquiry: { referenceNumber } } }),
    ).resolves.toBe(2);
    const changes = await prisma.inquiryStatusChange.findMany({
      orderBy: { toVersion: "asc" },
      where: { inquiry: { referenceNumber } },
    });
    expect(changes).toEqual([
      expect.objectContaining({
        actorUserId: actor.id,
        closeResult: "won",
        fromStatus: "quoted",
        reason: "采购者确认接受本次演示报价。",
        toStatus: "closed",
      }),
      expect.objectContaining({
        actorUserId: administrator.id,
        closeResult: null,
        fromStatus: "closed",
        reason: "采购者补充了包装条款，需要重新跟进。",
        toStatus: "assigned",
      }),
    ]);
    await expect(
      prisma.inquiryStatusChange.update({
        data: { reason: "覆盖关闭历史" },
        where: { id: changes[0]!.id },
      }),
    ).rejects.toThrow(/immutable/u);
    const audits = await prisma.auditLog.findMany({
      orderBy: { createdAt: "asc" },
      where: {
        event: { in: ["INQUIRY_CLOSED", "INQUIRY_REOPENED"] },
      },
    });
    expect(audits.map(({ summary }) => summary)).toEqual([
      "询盘从已报价关闭；关闭结果为成交。",
      "询盘从已关闭重新打开并回到已分配。",
    ]);
  });

  it("拒绝非当前负责人操作和基于旧版本的跟进或关闭", async () => {
    const { actor, administratorActor } = await createAssignedInquiry();
    const winningModifiedAt = new Date("2026-08-14T05:00:00.000Z");
    await appendInquiryFollowUp({
      actor,
      expectedVersion: 2,
      now: winningModifiedAt,
      prisma,
      referenceNumber,
      summary: "有效的首次联系。",
      type: "contact",
    });

    await expect(
      appendInquiryFollowUp({
        actor,
        expectedVersion: 2,
        prisma,
        quoteAmount: "2880.00",
        quoteCurrency: "USD",
        quoteValidUntil: new Date("2026-09-15T00:00:00.000Z"),
        referenceNumber,
        summary: "来自旧页面的报价。",
        type: "quote",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      conflict: {
        latestModifiedAt: winningModifiedAt,
        latestModifiedBy: actor.name,
        latestVersion: 3,
      },
    });
    await expect(
      closeInquiry({
        actor,
        closeResult: "lost",
        expectedVersion: 2,
        prisma,
        referenceNumber,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      appendInquiryFollowUp({
        actor: administratorActor,
        expectedVersion: 3,
        prisma,
        referenceNumber,
        summary: "管理员不能替代当前负责人追加记录。",
        type: "internal_note",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const otherSales = await prisma.user.create({
      data: {
        email: "lifecycle-other-sales@torquelis.local",
        id: "lifecycle-other-sales",
        name: "其他业务人员",
        role: APP_ROLES.SALES,
      },
    });
    await expect(
      appendInquiryFollowUp({
        actor: {
          id: otherSales.id,
          name: otherSales.name,
          role: APP_ROLES.SALES,
        },
        expectedVersion: 3,
        prisma,
        referenceNumber,
        summary: "非当前负责人不能追加记录。",
        type: "internal_note",
      }),
    ).rejects.toMatchObject({ code: "NOT_CURRENT_OWNER" });
    await expect(
      prisma.inquiryFollowUp.count({ where: { inquiry: { referenceNumber } } }),
    ).resolves.toBe(1);
  });

  it("服务边界拒绝非法下一步日期和非枚举关闭结果", async () => {
    const { actor } = await createAssignedInquiry();

    await expect(
      appendInquiryFollowUp({
        actor,
        expectedVersion: 2,
        nextStepDate: new Date(Number.NaN),
        prisma,
        referenceNumber,
        summary: "非法日期不应进入持久化层。",
        type: "contact",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RECORD" });
    await expect(
      closeInquiry({
        actor,
        closeResult: "toString" as "won",
        expectedVersion: 2,
        prisma,
        referenceNumber,
      }),
    ).rejects.toMatchObject({ code: "INVALID_RECORD" });
    await expect(
      prisma.inquiry.findUniqueOrThrow({ where: { referenceNumber } }),
    ).resolves.toMatchObject({ status: "assigned", version: 2 });
  });

  it("跟进中的询盘重新分配时保留状态且已关闭询盘必须先重开", async () => {
    const { actor, administratorActor } = await createAssignedInquiry();
    await appendInquiryFollowUp({
      actor,
      expectedVersion: 2,
      prisma,
      referenceNumber,
      summary: "已完成首次联系。",
      type: "contact",
    });
    const secondOwner = await prisma.user.create({
      data: {
        email: "lifecycle-reassigned-sales@torquelis.local",
        id: "lifecycle-reassigned-sales",
        name: "周程",
        role: APP_ROLES.SALES,
      },
    });

    await assignInquiry({
      actor: administratorActor,
      expectedVersion: 3,
      newOwnerId: secondOwner.id,
      prisma,
      reason: "原负责人休假，保留当前跟进阶段",
      referenceNumber,
    });

    await expect(
      prisma.inquiry.findUniqueOrThrow({ where: { referenceNumber } }),
    ).resolves.toMatchObject({
      currentOwnerId: secondOwner.id,
      status: "in_progress",
      version: 4,
    });
    const secondOwnerActor: AdminActor = {
      id: secondOwner.id,
      name: secondOwner.name,
      role: APP_ROLES.SALES,
    };
    await closeInquiry({
      actor: secondOwnerActor,
      closeResult: "lost",
      expectedVersion: 4,
      prisma,
      referenceNumber,
    });

    await expect(
      assignInquiry({
        actor: administratorActor,
        expectedVersion: 5,
        newOwnerId: actor.id,
        prisma,
        reason: "已关闭询盘不能直接重新分配",
        referenceNumber,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });
});
