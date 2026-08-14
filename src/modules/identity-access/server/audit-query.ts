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
  INQUIRY_ASSIGNED: "分配询盘",
  INQUIRY_CLOSED: "关闭询盘",
  INQUIRY_FOLLOW_UP_ADDED: "追加跟进记录",
  INQUIRY_REASSIGNED: "重新分配询盘",
  INQUIRY_REOPENED: "重新打开询盘",
  LOGIN: "后台登录",
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
      target:
        record.targetType === "INQUIRY"
          ? "询盘"
          : record.event === "LOGIN"
            ? "运营后台会话"
            : "系统记录",
    };
  });
}
