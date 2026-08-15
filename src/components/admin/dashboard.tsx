import {
  BookOpenText,
  ClipboardText,
  FileArrowUp,
  LockKey,
  Package,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type {
  AdministratorOperationsDashboard,
  DashboardImportBatch,
  DashboardInquiryTask,
  InquiryStatusCounts,
  OperationsDashboard,
  SalesOperationsDashboard,
} from "@/src/application/operations-dashboard";
import { AdminPageHeader } from "@/src/components/admin/admin-page";
import {
  formatAdminDate,
  formatAdminTime,
} from "@/src/components/admin/admin-time";
import { InquiryStatus } from "@/src/components/admin/inquiry-status";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import {
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABELS_ZH_CN,
} from "@/src/modules/inquiry-operations/public/inquiry-lifecycle";

const roleDashboard = {
  [APP_ROLES.ADMINISTRATOR]: {
    description:
      "管理全局询盘、站点配置与只读审计；所有摘要均由当前业务记录重新计算。",
    eyebrow: "管理员工作区",
    links: [
      ["询盘工作台", "分配与审查询盘", "/admin/inquiries", ClipboardText],
      ["站点配置", "维护企业公开信息", "/admin/settings", ShieldCheck],
      ["审计日志", "筛选登录与关键变更", "/admin/audit", LockKey],
    ],
    title: "需要处理的工作",
  },
  [APP_ROLES.CONTENT_EDITOR]: {
    description:
      "只显示产品、内容发布与导入统计；不会查询询盘正文、联系方式或通知发件箱。",
    eyebrow: "内容编辑工作区",
    links: [
      ["产品内容", "维护双语产品公开表示", "/admin/products", Package],
      ["批量导入", "上传、校验与更新草稿", "/admin/import", FileArrowUp],
      ["内容发布", "预览并形成发布版本", "/admin/content", BookOpenText],
    ],
    title: "内容运营待办",
  },
  [APP_ROLES.SALES]: {
    description:
      "只显示当前由你负责的询盘与下一步；重新分配后不会继续出现在总览。",
    eyebrow: "业务人员工作区",
    links: [
      ["我的询盘", "查看当前由你负责的询盘", "/admin/inquiries", ClipboardText],
      ["权限说明", "了解当前负责人数据边界", "/admin/access", LockKey],
    ],
    title: "我的询盘与下一步",
  },
} as const;

function SummaryGrid({
  summaries,
}: {
  summaries: Array<{ detail: string; label: string; value: string }>;
}) {
  return (
    <section className="admin-summary-grid" aria-label="当前角色摘要">
      {summaries.map(({ detail, label, value }) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{detail}</small>
        </article>
      ))}
    </section>
  );
}

function RoleLinks({
  links,
}: {
  links: (typeof roleDashboard)[keyof typeof roleDashboard]["links"];
}) {
  return (
    <section className="admin-task-grid" aria-label="当前角色可用工作区">
      {links.map(([title, detail, href, Icon], index) => (
        <Link href={href} key={href}>
          <span>0{index + 1}</span>
          <Icon aria-hidden="true" size={28} weight="thin" />
          <strong>{title}</strong>
          <small>{detail}</small>
        </Link>
      ))}
    </section>
  );
}

function InquiryStatusBreakdown({ counts }: { counts: InquiryStatusCounts }) {
  const total = INQUIRY_STATUSES.reduce(
    (sum, status) => sum + counts[status],
    0,
  );

  return (
    <section className="admin-section dashboard-panel">
      <header>
        <p>状态摘要</p>
        <h2>询盘状态分布</h2>
      </header>
      <div className="dashboard-bars">
        {INQUIRY_STATUSES.map((status) => (
          <div key={status}>
            <span>{INQUIRY_STATUS_LABELS_ZH_CN[status]}</span>
            <i>
              <b
                style={{
                  width: `${total === 0 ? 0 : Math.max(4, (counts[status] / total) * 100)}%`,
                }}
              />
            </i>
            <strong>{counts[status]}</strong>
          </div>
        ))}
      </div>
      {total === 0 ? (
        <p className="dashboard-empty">当前没有可统计的询盘。</p>
      ) : null}
    </section>
  );
}

function TaskList({
  emptyMessage,
  tasks,
}: {
  emptyMessage: string;
  tasks: DashboardInquiryTask[];
}) {
  return (
    <section className="admin-section dashboard-panel dashboard-priority">
      <header>
        <p>优先队列</p>
        <h2>需要处理</h2>
        <Link href="/admin/inquiries">打开询盘工作台</Link>
      </header>
      {tasks.length === 0 ? (
        <p className="dashboard-empty">{emptyMessage}</p>
      ) : (
        <div className="dashboard-task-list">
          {tasks.map((task) => (
            <Link
              href={`/admin/inquiries/${encodeURIComponent(task.referenceNumber)}`}
              key={task.referenceNumber}
            >
              <span>
                <strong>{task.company}</strong>
                <small>
                  {task.referenceNumber}
                  {task.productPartNumber ? ` · ${task.productPartNumber}` : ""}
                </small>
              </span>
              <InquiryStatus status={task.status} />
              <time>
                {task.nextStepDate
                  ? formatAdminDate(task.nextStepDate)
                  : task.status === "pending_assignment"
                    ? "等待分配"
                    : "尚无下一步"}
              </time>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentImports({ batches }: { batches: DashboardImportBatch[] }) {
  return (
    <section className="admin-section dashboard-panel">
      <header>
        <p>产品数据</p>
        <h2>最近导入</h2>
        <Link href="/admin/import">查看导入工作区</Link>
      </header>
      {batches.length === 0 ? (
        <p className="dashboard-empty">当前没有导入批次。</p>
      ) : (
        <div className="dashboard-import-list">
          {batches.map((batch) => (
            <Link href={`/admin/import/batches/${batch.id}`} key={batch.id}>
              <strong>{batch.batchLabel}</strong>
              <span>
                {batch.originalFilename}
                <small>
                  {batch.affectedProductCount} 个草稿 · {batch.createdBy}
                </small>
              </span>
              <time>{formatAdminTime(batch.createdAt)}</time>
              <b>{batch.rolledBackAt ? "已撤销" : "已导入"}</b>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function AdministratorDashboard({
  dashboard,
}: {
  dashboard: AdministratorOperationsDashboard;
}) {
  const latestImport = dashboard.recentImports[0];
  const closeResultRows = [
    ["成交", dashboard.closeResults.won],
    ["未成交", dashboard.closeResults.lost],
    ["无效", dashboard.closeResults.invalid],
  ] as const;

  return (
    <>
      <SummaryGrid
        summaries={[
          {
            detail: "需要管理员建立当前负责人",
            label: "待分配询盘",
            value: `${dashboard.unassignedCount} 张`,
          },
          {
            detail: `${dashboard.dueFollowUps.overdue} 项逾期，${dashboard.dueFollowUps.dueToday} 项今日到期`,
            label: "到期跟进",
            value: `${dashboard.dueFollowUps.total} 项`,
          },
          {
            detail: "当前状态为已报价、尚未关闭",
            label: "已报价待处理",
            value: `${dashboard.quotedCount} 张`,
          },
          {
            detail: latestImport
              ? `${latestImport.affectedProductCount} 个草稿受影响`
              : "当前没有导入批次",
            label: "最近导入批次",
            value: latestImport?.batchLabel ?? "暂无",
          },
        ]}
      />
      <div className="dashboard-two-columns">
        <TaskList
          emptyMessage="当前没有待分配或到期的询盘。"
          tasks={dashboard.tasks}
        />
        <InquiryStatusBreakdown counts={dashboard.statusCounts} />
      </div>
      <div className="dashboard-three-columns">
        <section className="admin-section dashboard-panel">
          <header>
            <p>提交上下文</p>
            <h2>来源分布</h2>
          </header>
          {dashboard.sourceCounts.length === 0 ? (
            <p className="dashboard-empty">当前没有可统计的来源。</p>
          ) : (
            <dl className="dashboard-count-list">
              {dashboard.sourceCounts.map(({ count, source }) => (
                <div key={source}>
                  <dt>{source}</dt>
                  <dd>{count}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
        <section className="admin-section dashboard-panel">
          <header>
            <p>已关闭询盘</p>
            <h2>关闭结果</h2>
          </header>
          <dl className="dashboard-count-list">
            {closeResultRows.map(([label, count]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
        </section>
        <RecentImports batches={dashboard.recentImports} />
      </div>
    </>
  );
}

function SalesDashboard({
  dashboard,
}: {
  dashboard: SalesOperationsDashboard;
}) {
  return (
    <>
      <SummaryGrid
        summaries={[
          {
            detail: "只统计当前仍由你负责的询盘",
            label: "我的询盘",
            value: `${dashboard.totalCount} 张`,
          },
          {
            detail: `${dashboard.dueFollowUps.overdue} 项逾期，${dashboard.dueFollowUps.dueToday} 项今日到期`,
            label: "我的到期跟进",
            value: `${dashboard.dueFollowUps.total} 项`,
          },
          {
            detail: "等待采购者或业务下一步",
            label: "我的已报价询盘",
            value: `${dashboard.statusCounts.quoted} 张`,
          },
          {
            detail: "保留历史但不进入当前待办",
            label: "我的已关闭询盘",
            value: `${dashboard.statusCounts.closed} 张`,
          },
        ]}
      />
      <div className="dashboard-two-columns">
        <TaskList
          emptyMessage="当前没有分配给你的未关闭询盘。"
          tasks={dashboard.tasks}
        />
        <InquiryStatusBreakdown counts={dashboard.statusCounts} />
      </div>
    </>
  );
}

function DashboardBoundaryNote() {
  return (
    <section className="admin-boundary-note">
      <ShieldCheck aria-hidden="true" size={24} weight="fill" />
      <div>
        <strong>从业务记录实时重算</strong>
        <p>
          总览不保存独立统计值，也不展示访问量、转化率、销售额或其他虚构经营成果。
        </p>
      </div>
    </section>
  );
}

export function Dashboard({
  actor,
  dashboard,
}: {
  actor: AdminActor;
  dashboard: OperationsDashboard;
}) {
  const role = roleDashboard[actor.role];

  return (
    <>
      <AdminPageHeader
        description={role.description}
        eyebrow={role.eyebrow}
        title={role.title}
      />
      {dashboard.kind === "administrator" ? (
        <AdministratorDashboard dashboard={dashboard} />
      ) : dashboard.kind === "sales" ? (
        <SalesDashboard dashboard={dashboard} />
      ) : (
        <>
          <SummaryGrid
            summaries={[
              {
                detail: "草稿版本与最近发布版本不一致",
                label: "待发布产品",
                value: `${dashboard.pendingProductDraftCount} 个`,
              },
              {
                detail: `${dashboard.pendingCorePageDraftCount} 个核心页面，${dashboard.pendingArticleDraftCount} 个文章语言版本`,
                label: "待发布内容",
                value: `${dashboard.pendingCorePageDraftCount + dashboard.pendingArticleDraftCount} 个`,
              },
              {
                detail: dashboard.recentImports[0]
                  ? `${dashboard.recentImports[0].affectedProductCount} 个草稿受影响`
                  : "当前没有导入批次",
                label: "最近导入",
                value: dashboard.recentImports[0]?.batchLabel ?? "暂无",
              },
            ]}
          />
          <RecentImports batches={dashboard.recentImports} />
        </>
      )}
      <div className="dashboard-workspaces">
        <h2>工作区入口</h2>
        <RoleLinks links={role.links} />
      </div>
      <DashboardBoundaryNote />
    </>
  );
}
