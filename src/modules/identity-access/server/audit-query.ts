import type { Prisma } from "@/src/generated/prisma/client";
import { z } from "zod";
import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import {
  isAppRole,
  ROLE_LABELS,
} from "@/src/modules/identity-access/public/permissions";

export type AuditLogView = {
  action: string;
  event: string;
  id: string;
  occurredAt: Date;
  operator: string;
  operatorId: string | null;
  outcome: string;
  summary: string;
  target: string;
  targetId: string | null;
  targetType: string | null;
};

export type AuditLogFilters = {
  actorUserId?: string | null;
  dateFrom?: string;
  dateTo?: string;
  event?: string;
  targetType?: string;
};

export const auditActionLabels: Record<string, string> = {
  ARTICLE_ARCHIVED: "归档文章",
  ARTICLE_DRAFT_SAVED: "保存文章草稿",
  ARTICLE_PUBLICATION_RESTORED: "恢复文章历史版本",
  ARTICLE_PUBLISHED: "发布文章",
  CORE_PAGE_ARCHIVED: "归档核心页面",
  CORE_PAGE_DRAFT_SAVED: "保存核心页面草稿",
  CORE_PAGE_PUBLICATION_RESTORED: "恢复核心页面历史版本",
  CORE_PAGE_PUBLISHED: "发布核心页面",
  INQUIRY_ASSIGNED: "分配询盘",
  INQUIRY_CLOSED: "关闭询盘",
  INQUIRY_FOLLOW_UP_ADDED: "追加跟进记录",
  INQUIRY_REASSIGNED: "重新分配询盘",
  INQUIRY_REOPENED: "重新打开询盘",
  INQUIRY_QUARANTINED: "隔离垃圾询盘",
  LOGIN: "后台登录",
  PRODUCT_DOCUMENT_REPLACED: "替换产品资料",
  PRODUCT_PUBLICATION_RESTORED: "恢复产品历史版本",
  PRODUCT_BATCH_PUBLISHED: "批量发布产品",
  PRODUCT_BATCH_PUBLISH_REJECTED: "拒绝批量发布",
  PRODUCT_IMPORT_CONFIRMED: "确认产品导入",
  PRODUCT_IMPORT_ROLLED_BACK: "撤销产品导入批次",
  PRODUCT_IMPORT_ROLLBACK_REJECTED: "拒绝撤销产品导入批次",
  PRODUCT_PUBLISHED: "发布产品",
  SITE_CONFIGURATION_UPDATED: "更新站点配置",
};

export const auditTargetLabels: Record<string, string> = {
  ARTICLE: "文章",
  CORE_PAGE: "核心页面",
  INQUIRY: "询盘",
  PRODUCT: "产品",
  QUARANTINED_INQUIRY: "垃圾询盘",
  ProductImportBatch: "产品导入批次",
  ProductPublishBatch: "产品发布批次",
  SITE_CONFIGURATION: "站点配置",
};

const auditDateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
});

const auditFilterSearchSchema = z
  .object({
    action: z
      .string()
      .max(100)
      .regex(/^[A-Z0-9_]+$/u)
      .optional(),
    from: auditDateSchema.optional(),
    operator: z.string().trim().min(1).max(200).optional(),
    targetType: z
      .string()
      .max(100)
      .regex(/^[A-Za-z0-9_]+$/u)
      .optional(),
    to: auditDateSchema.optional(),
  })
  .refine(
    ({ from, to }) => !from || !to || from <= to,
    "开始日期不能晚于结束日期。",
  );

function presentSearchParam(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const values = searchParams.getAll(key);
  if (values.length > 1) return "";
  const value = values[0]?.trim();
  return value || undefined;
}

export function parseAuditLogFilters(
  searchParams: URLSearchParams,
): { filters: AuditLogFilters; success: true } | { success: false } {
  const parsed = auditFilterSearchSchema.safeParse({
    action: presentSearchParam(searchParams, "action"),
    from: presentSearchParam(searchParams, "from"),
    operator: presentSearchParam(searchParams, "operator"),
    targetType: presentSearchParam(searchParams, "targetType"),
    to: presentSearchParam(searchParams, "to"),
  });

  if (!parsed.success) return { success: false };

  return {
    filters: {
      ...(parsed.data.action ? { event: parsed.data.action } : {}),
      ...(parsed.data.from ? { dateFrom: parsed.data.from } : {}),
      ...(parsed.data.operator
        ? {
            actorUserId:
              parsed.data.operator === "__system__"
                ? null
                : parsed.data.operator,
          }
        : {}),
      ...(parsed.data.targetType ? { targetType: parsed.data.targetType } : {}),
      ...(parsed.data.to ? { dateTo: parsed.data.to } : {}),
    },
    success: true,
  };
}

function shanghaiDayStart(date: string): Date {
  return new Date(`${date}T00:00:00.000+08:00`);
}

function auditWhere(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const createdAt = {
    ...(filters.dateFrom ? { gte: shanghaiDayStart(filters.dateFrom) } : {}),
    ...(filters.dateTo
      ? {
          lt: new Date(
            shanghaiDayStart(filters.dateTo).getTime() + 24 * 60 * 60 * 1_000,
          ),
        }
      : {}),
  };

  return {
    ...(filters.actorUserId !== undefined
      ? { actorUserId: filters.actorUserId }
      : {}),
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    ...(filters.event ? { event: filters.event } : {}),
    ...(filters.targetType ? { targetType: filters.targetType } : {}),
  };
}

export type AuditFilterOptions = {
  actions: Array<{ label: string; value: string }>;
  operators: Array<{ label: string; value: string }>;
  targetTypes: Array<{ label: string; value: string }>;
};

export async function listAuditFilterOptions(
  prisma: ApplicationDatabase = getApplicationPrisma(),
): Promise<AuditFilterOptions> {
  const [actorRecords, systemRecord, eventRecords, targetRecords] =
    await Promise.all([
      prisma.auditLog.findMany({
        distinct: ["actorUserId"],
        include: { actor: { select: { name: true } } },
        where: { actorUserId: { not: null } },
      }),
      prisma.auditLog.findFirst({
        select: { id: true },
        where: { actorUserId: null },
      }),
      prisma.auditLog.findMany({
        distinct: ["event"],
        select: { event: true },
      }),
      prisma.auditLog.findMany({
        distinct: ["targetType"],
        select: { targetType: true },
        where: { targetType: { not: null } },
      }),
    ]);

  return {
    actions: eventRecords
      .map(({ event }) => ({
        label: auditActionLabels[event] ?? event,
        value: event,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "zh-CN")),
    operators: [
      ...actorRecords.flatMap((record) =>
        record.actorUserId
          ? [
              {
                label: record.actor?.name ?? "未识别账号",
                value: record.actorUserId,
              },
            ]
          : [],
      ),
      ...(systemRecord
        ? [{ label: "系统／未识别账号", value: "__system__" }]
        : []),
    ].sort((left, right) => left.label.localeCompare(right.label, "zh-CN")),
    targetTypes: targetRecords
      .flatMap(({ targetType }) =>
        targetType
          ? [
              {
                label: auditTargetLabels[targetType] ?? targetType,
                value: targetType,
              },
            ]
          : [],
      )
      .sort((left, right) => left.label.localeCompare(right.label, "zh-CN")),
  };
}

export async function listAuditLogs({
  filters = {},
  prisma = getApplicationPrisma(),
  take = 50,
}: {
  filters?: AuditLogFilters;
  prisma?: ApplicationDatabase;
  take?: number;
} = {}): Promise<AuditLogView[]> {
  const records = await prisma.auditLog.findMany({
    include: { actor: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    where: auditWhere(filters),
  });

  return records.map((record) => {
    const roleLabel = isAppRole(record.actorRole)
      ? ROLE_LABELS[record.actorRole]
      : null;
    const succeeded = record.outcome === "SUCCESS";

    return {
      action: auditActionLabels[record.event] ?? record.event,
      event: record.event,
      id: record.id,
      occurredAt: record.createdAt,
      operator:
        record.actor?.name ??
        (record.event === "LOGIN" ? "未识别账号" : "系统"),
      operatorId: record.actorUserId,
      outcome: record.outcome,
      summary:
        record.summary ??
        (succeeded
          ? `${roleLabel ?? "预置账号"}登录成功。`
          : "登录失败；未记录提交的账号信息。"),
      target: record.targetType
        ? `${auditTargetLabels[record.targetType] ?? "系统记录"}${record.targetId ? ` · ${record.targetId}` : ""}`
        : record.event === "LOGIN"
          ? "运营后台会话"
          : "系统记录",
      targetId: record.targetId,
      targetType: record.targetType,
    };
  });
}

export async function listRecentAuditLogs(
  take: number,
): Promise<AuditLogView[]> {
  return listAuditLogs({ take });
}
