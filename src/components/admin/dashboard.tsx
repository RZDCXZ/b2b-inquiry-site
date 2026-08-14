import {
  BookOpenText,
  ClipboardText,
  FileArrowUp,
  LockKey,
  Package,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { AdminPageHeader } from "@/src/components/admin/admin-page";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";

const roleDashboard = {
  [APP_ROLES.ADMINISTRATOR]: {
    description:
      "管理全局询盘、站点配置与只读审计；摘要只使用本地数据库可验证的信息。",
    eyebrow: "管理员工作区",
    links: [
      ["询盘工作台", "分配与审查询盘", "/admin/inquiries", ClipboardText],
      ["站点配置", "维护企业公开信息", "/admin/settings", ShieldCheck],
      ["审计日志", "查看登录与关键变更", "/admin/audit", LockKey],
    ],
    summaries: [
      {
        detail: "当前本地演示没有可统计的询盘",
        kind: "inquiry",
        label: "待分配询盘",
        value: "尚无数据",
      },
      {
        detail: "当前本地演示没有到期任务",
        kind: "static",
        label: "今日到期跟进",
        value: "尚无数据",
      },
      {
        detail: "当前本地演示没有报价记录",
        kind: "static",
        label: "已报价待处理",
        value: "尚无数据",
      },
      {
        detail: "当前本地演示没有导入记录",
        kind: "static",
        label: "最近导入批次",
        value: "尚无数据",
      },
    ],
    title: "需要处理的工作",
  },
  [APP_ROLES.CONTENT_EDITOR]: {
    description: "维护中英文产品与内容、执行批量导入；询盘仅提供脱敏汇总。",
    eyebrow: "内容编辑工作区",
    links: [
      ["产品内容", "维护双语产品公开表示", "/admin/products", Package],
      ["批量导入", "上传、校验与更新草稿", "/admin/import", FileArrowUp],
      ["内容发布", "预览并形成发布版本", "/admin/content", BookOpenText],
    ],
    summaries: [
      {
        detail: "不会显示完整联系方式或留言",
        kind: "inquiry",
        label: "询盘脱敏汇总",
        value: "尚无数据",
      },
      {
        detail: "当前本地演示没有内容任务",
        kind: "static",
        label: "内容待办",
        value: "尚无数据",
      },
      {
        detail: "当前本地演示没有导入记录",
        kind: "static",
        label: "最近导入",
        value: "尚无数据",
      },
    ],
    title: "内容运营待办",
  },
  [APP_ROLES.SALES]: {
    description: "只显示分配给你的询盘与下一步；重新分配后访问权会立即失效。",
    eyebrow: "业务人员工作区",
    links: [
      ["我的询盘", "查看当前由你负责的询盘", "/admin/inquiries", ClipboardText],
      ["权限说明", "了解当前负责人数据边界", "/admin/access", LockKey],
    ],
    summaries: [
      {
        detail: "只统计当前分配给你的询盘",
        kind: "inquiry",
        label: "我的询盘",
        value: "尚无数据",
      },
      {
        detail: "当前本地演示没有到期任务",
        kind: "static",
        label: "我的下一步",
        value: "尚无数据",
      },
    ],
    title: "我的询盘与下一步",
  },
} as const;

export function Dashboard({
  actor,
  inquiryTotal,
}: {
  actor: AdminActor;
  inquiryTotal: number;
}) {
  const dashboard = roleDashboard[actor.role];
  const inquirySummaryDetail =
    actor.role === APP_ROLES.ADMINISTRATOR
      ? "当前待分配询盘"
      : actor.role === APP_ROLES.CONTENT_EDITOR
        ? "仅显示数量，不显示联系方式或留言"
        : "只统计当前分配给你的询盘";

  return (
    <>
      <AdminPageHeader
        description={dashboard.description}
        eyebrow={dashboard.eyebrow}
        title={dashboard.title}
      />
      <section className="admin-summary-grid" aria-label="当前角色摘要">
        {dashboard.summaries.map(({ detail, kind, label, value }) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{kind === "inquiry" ? `${inquiryTotal} 张` : value}</strong>
            <small>{kind === "inquiry" ? inquirySummaryDetail : detail}</small>
          </article>
        ))}
      </section>
      <section className="admin-task-grid" aria-label="当前角色可用工作区">
        {dashboard.links.map(([title, detail, href, Icon], index) => (
          <Link href={href} key={href}>
            <span>0{index + 1}</span>
            <Icon aria-hidden="true" size={28} weight="thin" />
            <strong>{title}</strong>
            <small>{detail}</small>
          </Link>
        ))}
      </section>
      <section className="admin-boundary-note">
        <ShieldCheck aria-hidden="true" size={24} weight="fill" />
        <div>
          <strong>权限由服务端执行</strong>
          <p>
            导航会随角色精简，但直接访问页面或接口仍会重新检查数据库会话与权限。
          </p>
        </div>
      </section>
    </>
  );
}
