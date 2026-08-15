import { LockKey } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import { formatAdminTime } from "@/src/components/admin/admin-time";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import {
  listAuditFilterOptions,
  listAuditLogPage,
  parseAuditLogFilters,
} from "@/src/modules/identity-access/server/audit-query";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

type AuditPageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function urlSearchParamsFromPage(
  values: Awaited<AuditPageSearchParams>,
): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) searchParams.append(key, item);
    } else if (value !== undefined) {
      searchParams.set(key, value);
    }
  }
  return searchParams;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: AuditPageSearchParams;
}) {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.AUDIT_VIEW,
    "/admin/audit",
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  const query = urlSearchParamsFromPage(await searchParams);
  const parsed = parseAuditLogFilters(query);
  const [auditPage, options] = await Promise.all([
    listAuditLogPage({
      cursor: parsed.success ? parsed.cursor : undefined,
      filters: parsed.success ? parsed.filters : {},
      take: 50,
    }),
    listAuditFilterOptions(),
  ]);
  const selected = parsed.success ? parsed.filters : {};
  const nextPageQuery = new URLSearchParams(query);
  if (auditPage.nextCursor) {
    nextPageQuery.set("cursor", auditPage.nextCursor);
  }

  return (
    <>
      <AdminPageHeader
        description="按操作人、动作、目标类型和时间查询；记录不复制密码、会话值、完整联系方式、询盘正文或报价正文。"
        eyebrow="系统管理 / 只读"
        title="审计日志"
      />
      <aside className="admin-readonly-banner">
        <LockKey aria-hidden="true" size={22} weight="fill" />
        <span>
          <strong>审计记录只读</strong>
          <small>界面与服务端都不提供编辑或删除入口。</small>
        </span>
      </aside>
      <form className="admin-audit-filters" method="get">
        <label>
          <span>操作人</span>
          <select
            defaultValue={
              selected.actorUserId === null
                ? "__system__"
                : (selected.actorUserId ?? "")
            }
            name="operator"
          >
            <option value="">全部操作人</option>
            {options.operators.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>动作</span>
          <select defaultValue={selected.event ?? ""} name="action">
            <option value="">全部动作</option>
            {options.actions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>目标类型</span>
          <select defaultValue={selected.targetType ?? ""} name="targetType">
            <option value="">全部目标类型</option>
            {options.targetTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>开始日期</span>
          <input
            defaultValue={selected.dateFrom ?? ""}
            name="from"
            type="date"
          />
        </label>
        <label>
          <span>结束日期</span>
          <input defaultValue={selected.dateTo ?? ""} name="to" type="date" />
        </label>
        <div>
          <button className="admin-primary-button" type="submit">
            应用筛选
          </button>
          <Link className="admin-secondary-button" href="/admin/audit">
            清除筛选
          </Link>
        </div>
      </form>
      {!parsed.success ? (
        <p className="admin-audit-filter-error" role="alert">
          筛选条件无效，请检查日期范围或重新选择筛选项。
        </p>
      ) : null}
      <section className="admin-section admin-audit-table">
        <div className="admin-audit-row admin-audit-head">
          <strong>操作人</strong>
          <strong>时间</strong>
          <strong>动作</strong>
          <strong>对象</strong>
          <strong>变更摘要</strong>
        </div>
        {auditPage.records.length === 0 ? (
          <div className="admin-audit-empty">
            <strong>没有符合当前条件的审计记录</strong>
            <span>清除部分筛选，或等待新的业务操作形成记录。</span>
          </div>
        ) : (
          auditPage.records.map((record) => (
            <div className="admin-audit-row" key={record.id}>
              <strong>{record.operator}</strong>
              <time>{formatAdminTime(record.occurredAt)}</time>
              <span>{record.action}</span>
              <code>{record.target}</code>
              <span>{record.summary}</span>
            </div>
          ))
        )}
      </section>
      {auditPage.nextCursor ? (
        <nav className="admin-audit-pagination" aria-label="审计记录分页">
          <Link
            className="admin-secondary-button"
            href={`/admin/audit?${nextPageQuery.toString()}`}
          >
            查看更早记录
          </Link>
        </nav>
      ) : null}
    </>
  );
}
