export const APP_ROLES = {
  ADMINISTRATOR: "administrator",
  CONTENT_EDITOR: "content_editor",
  SALES: "sales",
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const ROLE_LABELS: Record<AppRole, string> = {
  [APP_ROLES.ADMINISTRATOR]: "管理员",
  [APP_ROLES.CONTENT_EDITOR]: "内容编辑",
  [APP_ROLES.SALES]: "业务人员",
};

export const PERMISSIONS = {
  AUDIT_VIEW: "audit:view",
  CONTENT_MANAGE: "content:manage",
  DASHBOARD_VIEW: "dashboard:view",
  IMPORTS_MANAGE: "imports:manage",
  INQUIRIES_ASSIGN: "inquiries:assign",
  INQUIRIES_MANAGE: "inquiries:manage",
  INQUIRIES_VIEW: "inquiries:view",
  INQUIRY_METRICS_VIEW: "inquiry-metrics:view",
  OUTBOX_VIEW: "outbox:view",
  PERMISSION_MATRIX_VIEW: "permission-matrix:view",
  PRODUCTS_MANAGE: "products:manage",
  SETTINGS_MANAGE: "settings:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const allPermissions = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<AppRole, ReadonlySet<Permission>> = {
  [APP_ROLES.ADMINISTRATOR]: new Set(allPermissions),
  [APP_ROLES.CONTENT_EDITOR]: new Set([
    PERMISSIONS.CONTENT_MANAGE,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.IMPORTS_MANAGE,
    PERMISSIONS.INQUIRY_METRICS_VIEW,
    PERMISSIONS.PERMISSION_MATRIX_VIEW,
    PERMISSIONS.PRODUCTS_MANAGE,
  ]),
  [APP_ROLES.SALES]: new Set([
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.INQUIRIES_MANAGE,
    PERMISSIONS.INQUIRIES_VIEW,
    PERMISSIONS.PERMISSION_MATRIX_VIEW,
  ]),
};

export type AuthorizationDecision =
  | { allowed: true }
  | {
      allowed: false;
      code: "FORBIDDEN" | "UNAUTHENTICATED";
      message: string;
      status: 401 | 403;
    };

export function isAppRole(value: unknown): value is AppRole {
  return Object.values(APP_ROLES).some((role) => role === value);
}

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function getAuthorizationDecision(
  role: AppRole | null,
  permission: Permission,
): AuthorizationDecision {
  if (!role) {
    return {
      allowed: false,
      code: "UNAUTHENTICATED",
      message: "请先登录运营后台。",
      status: 401,
    };
  }

  if (!hasPermission(role, permission)) {
    return {
      allowed: false,
      code: "FORBIDDEN",
      message: "你没有访问此功能的权限。",
      status: 403,
    };
  }

  return { allowed: true };
}
