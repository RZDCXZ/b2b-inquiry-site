import { describe, expect, it } from "vitest";

import {
  APP_ROLES,
  getAuthorizationDecision,
  hasPermission,
  PERMISSIONS,
} from "@/src/modules/identity-access/public/permissions";

describe("后台角色权限矩阵", () => {
  it("管理员可访问全部后台壳层功能", () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(hasPermission(APP_ROLES.ADMINISTRATOR, permission)).toBe(true);
    }
  });

  it("内容编辑只能访问脱敏总览和内容运营功能", () => {
    expect(
      hasPermission(APP_ROLES.CONTENT_EDITOR, PERMISSIONS.INQUIRY_METRICS_VIEW),
    ).toBe(true);
    expect(
      hasPermission(APP_ROLES.CONTENT_EDITOR, PERMISSIONS.PRODUCTS_MANAGE),
    ).toBe(true);
    expect(
      hasPermission(APP_ROLES.CONTENT_EDITOR, PERMISSIONS.IMPORTS_MANAGE),
    ).toBe(true);
    expect(
      hasPermission(APP_ROLES.CONTENT_EDITOR, PERMISSIONS.INQUIRIES_VIEW),
    ).toBe(false);
    expect(
      hasPermission(APP_ROLES.CONTENT_EDITOR, PERMISSIONS.AUDIT_VIEW),
    ).toBe(false);
  });

  it("业务人员只能访问自己的询盘工作区", () => {
    expect(hasPermission(APP_ROLES.SALES, PERMISSIONS.DASHBOARD_VIEW)).toBe(
      true,
    );
    expect(hasPermission(APP_ROLES.SALES, PERMISSIONS.INQUIRIES_VIEW)).toBe(
      true,
    );
    expect(hasPermission(APP_ROLES.SALES, PERMISSIONS.PRODUCTS_MANAGE)).toBe(
      false,
    );
    expect(hasPermission(APP_ROLES.SALES, PERMISSIONS.SETTINGS_MANAGE)).toBe(
      false,
    );
  });

  it("拒绝结果使用明确且不泄露内部信息的公共合同", () => {
    expect(
      getAuthorizationDecision(APP_ROLES.SALES, PERMISSIONS.AUDIT_VIEW),
    ).toEqual({
      allowed: false,
      code: "FORBIDDEN",
      message: "你没有访问此功能的权限。",
      status: 403,
    });
    expect(getAuthorizationDecision(null, PERMISSIONS.DASHBOARD_VIEW)).toEqual({
      allowed: false,
      code: "UNAUTHENTICATED",
      message: "请先登录运营后台。",
      status: 401,
    });
  });
});
