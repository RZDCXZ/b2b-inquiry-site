import { describe, expect, it } from "vitest";

import { loginErrorMessage } from "@/src/components/admin/login-error-message";
import {
  parseLoginSearchParams,
  sessionAwareLoginPath,
} from "@/src/modules/identity-access/server/login-boundary";

describe("后台登录边界", () => {
  it("拒绝重复或危险查询参数，而不是把它们当作字符串使用", () => {
    expect(
      parseLoginSearchParams({
        loggedOut: ["1", "0"],
        next: ["/admin", "//outside.example"],
        reason: ["expired"],
      }),
    ).toEqual({ loggedOut: undefined, nextPath: "/admin", reason: undefined });

    expect(parseLoginSearchParams({ next: "//outside.example" }).nextPath).toBe(
      "/admin",
    );
  });

  it("检测到失效会话 Cookie 时进入会话过期状态", () => {
    expect(
      sessionAwareLoginPath(
        new Headers({ cookie: "torquelis.session_token=stale-value" }),
        "/admin/audit",
      ),
    ).toBe("/admin/login?next=%2Fadmin%2Faudit&reason=expired");
    expect(sessionAwareLoginPath(new Headers(), "/admin/audit")).toBe(
      "/admin/login?next=%2Fadmin%2Faudit",
    );
  });

  it("区分凭据、速率限制和系统错误", () => {
    expect(loginErrorMessage(401)).toContain("邮箱或密码");
    expect(loginErrorMessage(429)).toContain("次数过多");
    expect(loginErrorMessage(500)).toContain("系统暂时无法完成登录");
  });
});
