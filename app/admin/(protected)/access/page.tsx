import { Check, Minus } from "@phosphor-icons/react/dist/ssr";

import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import {
  APP_ROLES,
  hasPermission,
  PERMISSIONS,
  ROLE_LABELS,
  type Permission,
} from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

const rows: ReadonlyArray<[string, Permission]> = [
  ["查看角色总览", PERMISSIONS.DASHBOARD_VIEW],
  ["查看完整询盘", PERMISSIONS.INQUIRIES_VIEW],
  ["维护产品内容", PERMISSIONS.PRODUCTS_MANAGE],
  ["执行批量导入", PERMISSIONS.IMPORTS_MANAGE],
  ["维护发布内容", PERMISSIONS.CONTENT_MANAGE],
  ["维护站点配置", PERMISSIONS.SETTINGS_MANAGE],
  ["查看审计日志", PERMISSIONS.AUDIT_VIEW],
];

export default async function AccessPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.PERMISSION_MATRIX_VIEW,
    "/admin/access",
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  return (
    <>
      <AdminPageHeader
        description="角色固定由本地初始化创建；后台不提供新增账号或编辑角色入口。"
        eyebrow="账号与权限"
        title="权限说明"
      />
      <section className="admin-section admin-permission-matrix">
        <div className="admin-matrix-row admin-matrix-head">
          <strong>功能</strong>
          {Object.values(APP_ROLES).map((role) => (
            <strong key={role}>{ROLE_LABELS[role]}</strong>
          ))}
        </div>
        {rows.map(([label, permission]) => (
          <div className="admin-matrix-row" key={permission}>
            <span>{label}</span>
            {Object.values(APP_ROLES).map((role) =>
              hasPermission(role, permission) ? (
                <span className="is-allowed" key={role}>
                  <Check aria-hidden="true" /> 允许
                </span>
              ) : (
                <span className="is-denied" key={role}>
                  <Minus aria-hidden="true" /> 不允许
                </span>
              ),
            )}
          </div>
        ))}
      </section>
    </>
  );
}
