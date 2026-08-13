import { LockKey } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  ROLE_LABELS,
  type AppRole,
} from "@/src/modules/identity-access/public/permissions";

export function AdminPageHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="admin-page-header">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <span>{description}</span>
    </header>
  );
}

export function AdminSection({ children }: { children: ReactNode }) {
  return <section className="admin-section">{children}</section>;
}

export function PermissionDenied({ role }: { role: AppRole }) {
  return (
    <section className="admin-denied" role="alert">
      <LockKey aria-hidden="true" size={54} weight="thin" />
      <p>权限受限</p>
      <h1>你没有访问此功能的权限。</h1>
      <span>
        当前角色为{ROLE_LABELS[role]}
        。服务端已拒绝本次请求，页面不会加载受限数据。
      </span>
      <Link className="admin-primary-button" href="/admin">
        返回总览
      </Link>
    </section>
  );
}
