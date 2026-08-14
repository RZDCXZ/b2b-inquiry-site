import { getApplicationPrisma } from "@/src/infrastructure/database/prisma";
import {
  isAppRole,
  ROLE_LABELS,
} from "@/src/modules/identity-access/public/permissions";

export type AuditLogView = {
  action: string;
  id: string;
  occurredAt: Date;
  operator: string;
  summary: string;
  target: string;
};

const auditActionLabels: Record<string, string> = {
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
  LOGIN: "后台登录",
  PRODUCT_PUBLICATION_RESTORED: "恢复产品历史版本",
  PRODUCT_PUBLISHED: "发布产品",
  SITE_CONFIGURATION_UPDATED: "更新站点配置",
};

const auditTargetLabels: Record<string, string> = {
  ARTICLE: "文章",
  CORE_PAGE: "核心页面",
  INQUIRY: "询盘",
  PRODUCT: "产品",
  SITE_CONFIGURATION: "站点配置",
};

export async function listRecentAuditLogs(
  take: number,
): Promise<AuditLogView[]> {
  const records = await getApplicationPrisma().auditLog.findMany({
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });

  return records.map((record) => {
    const roleLabel = isAppRole(record.actorRole)
      ? ROLE_LABELS[record.actorRole]
      : null;
    const succeeded = record.outcome === "SUCCESS";

    return {
      action: auditActionLabels[record.event] ?? record.event,
      id: record.id,
      occurredAt: record.createdAt,
      operator: record.actor?.name ?? "未识别账号",
      summary:
        record.summary ??
        (succeeded
          ? `${roleLabel ?? "预置账号"}登录成功。`
          : "登录失败；未记录提交的账号信息。"),
      target: record.targetType
        ? (auditTargetLabels[record.targetType] ?? "系统记录")
        : record.event === "LOGIN"
          ? "运营后台会话"
          : "系统记录",
    };
  });
}
