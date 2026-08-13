"use client";

import {
  ArrowSquareOut,
  BellSimple,
  BookOpenText,
  ClipboardText,
  FileArrowUp,
  GearSix,
  House,
  List,
  LockKey,
  Package,
  ShieldCheck,
  SignOut,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import {
  hasPermission,
  PERMISSIONS,
  ROLE_LABELS,
  type Permission,
} from "@/src/modules/identity-access/public/permissions";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";

const navigation = [
  {
    href: "/admin",
    icon: House,
    label: "总览",
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    href: "/admin/inquiries",
    icon: ClipboardText,
    label: "询盘工作台",
    salesLabel: "我的询盘",
    permission: PERMISSIONS.INQUIRIES_VIEW,
  },
  {
    href: "/admin/outbox",
    icon: BellSimple,
    label: "通知发件箱",
    permission: PERMISSIONS.OUTBOX_VIEW,
  },
  {
    href: "/admin/products",
    icon: Package,
    label: "产品内容",
    permission: PERMISSIONS.PRODUCTS_MANAGE,
  },
  {
    href: "/admin/import",
    icon: FileArrowUp,
    label: "批量导入",
    permission: PERMISSIONS.IMPORTS_MANAGE,
  },
  {
    href: "/admin/content",
    icon: BookOpenText,
    label: "内容发布",
    permission: PERMISSIONS.CONTENT_MANAGE,
  },
  {
    href: "/admin/settings",
    icon: GearSix,
    label: "站点配置",
    permission: PERMISSIONS.SETTINGS_MANAGE,
  },
  {
    href: "/admin/access",
    icon: LockKey,
    label: "权限说明",
    permission: PERMISSIONS.PERMISSION_MATRIX_VIEW,
  },
  {
    href: "/admin/audit",
    icon: ShieldCheck,
    label: "审计日志",
    permission: PERMISSIONS.AUDIT_VIEW,
  },
] satisfies ReadonlyArray<{
  href: string;
  icon: typeof House;
  label: string;
  permission: Permission;
  salesLabel?: string;
}>;

function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/sign-out", {
        body: "{}",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (response.ok) {
        router.replace("/admin/login?loggedOut=1");
        router.refresh();
        return;
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      aria-label="退出登录"
      className="admin-logout"
      disabled={pending}
      onClick={logout}
      type="button"
    >
      <SignOut aria-hidden="true" size={19} />
    </button>
  );
}

export function AdminShell({
  actor,
  children,
}: {
  actor: AdminActor;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visibleNavigation = navigation.filter(({ permission }) =>
    hasPermission(actor.role, permission),
  );

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <div className="admin-sidebar-heading">
          <Link
            aria-label="Torquelis 运营后台总览"
            className="admin-brand"
            href="/admin"
          >
            <span>TORQUELIS</span>
            <small>询盘运营</small>
          </Link>
          <button
            aria-label="关闭导航"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="后台主导航">
          {visibleNavigation.map(({ href, icon: Icon, label, salesLabel }) => {
            const active =
              pathname === href ||
              (href !== "/admin" && pathname.startsWith(`${href}/`));
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={active ? "active" : undefined}
                href={href}
                key={href}
                onClick={() => setOpen(false)}
              >
                <Icon aria-hidden="true" size={20} />
                <span>
                  {actor.role === "sales" && salesLabel ? salesLabel : label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-role-card">
          <UserCircle aria-hidden="true" size={30} />
          <span>
            <strong>{actor.name}</strong>
            <small>{ROLE_LABELS[actor.role]}</small>
          </span>
          <LogoutButton />
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <button
            aria-expanded={open}
            aria-label="打开导航"
            className="admin-menu-button"
            onClick={() => setOpen(true)}
            type="button"
          >
            <List aria-hidden="true" />
          </button>
          <div className="admin-environment">
            <span>本地演示环境</span>
            <span className="admin-status">
              <i /> 通知仅捕获
            </span>
          </div>
          <Link className="admin-public-link" href="/en" target="_blank">
            查看采购前台 <ArrowSquareOut aria-hidden="true" size={17} />
          </Link>
        </header>
        <main className="admin-content">{children}</main>
      </div>
      {open ? (
        <button
          aria-label="关闭导航遮罩"
          className="admin-sidebar-backdrop"
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}
    </div>
  );
}
