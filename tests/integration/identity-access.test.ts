import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyPassword } from "better-auth/crypto";

import { POST as handleAuthPost } from "@/app/api/auth/[...all]/route";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import {
  ensurePresetCredentials,
  type PresetCredentials,
} from "@/src/modules/identity-access/server/preset-credentials";
import { replacePresetAccounts } from "@/src/modules/identity-access/server/preset-accounts";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);
let credentials: PresetCredentials;

describe("预置账号数据库初始化", () => {
  beforeAll(async () => {
    credentials = await ensurePresetCredentials();
    await replacePresetAccounts(prisma, credentials);
  });

  afterAll(async () => {
    await replacePresetAccounts(prisma, credentials);
    await prisma.$disconnect();
  });

  it("保存三个角色账号和 Better Auth 凭据哈希", async () => {
    const users = await prisma.user.findMany({
      include: { accounts: true },
      orderBy: { email: "asc" },
    });

    expect(new Set(users.map(({ role }) => role))).toEqual(
      new Set(Object.values(APP_ROLES)),
    );
    expect(users).toHaveLength(3);

    for (const credential of credentials.accounts) {
      const user = users.find(({ email }) => email === credential.email);
      const passwordHash = user?.accounts[0]?.password;

      expect(passwordHash).toBeTruthy();
      expect(passwordHash).not.toBe(credential.password);
      await expect(
        verifyPassword({
          hash: passwordHash ?? "",
          password: credential.password,
        }),
      ).resolves.toBe(true);
    }
  });

  it("重置预置账号时撤销所有现有数据库会话", async () => {
    const administrator = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.ADMINISTRATOR },
    });
    await prisma.session.create({
      data: {
        expiresAt: new Date(Date.now() + 60_000),
        id: "integration-reset-session",
        token: "integration-reset-token",
        userId: administrator.id,
      },
    });

    await replacePresetAccounts(prisma, credentials);

    await expect(prisma.session.count()).resolves.toBe(0);
  });

  it("登录成功设置必要 Cookie、建立数据库会话并记录安全审计", async () => {
    const administrator = credentials.accounts.find(
      ({ role }) => role === APP_ROLES.ADMINISTRATOR,
    );
    expect(administrator).toBeDefined();

    const response = await handleAuthPost(
      new Request("http://127.0.0.1:3000/api/auth/sign-in/email", {
        body: JSON.stringify({
          email: administrator?.email,
          password: administrator?.password,
        }),
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:3000",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(response.headers.get("set-cookie")).toMatch(/SameSite=Lax/i);
    await expect(prisma.session.count()).resolves.toBe(1);

    const audit = await prisma.auditLog.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
    });
    expect(audit).toMatchObject({
      actorRole: APP_ROLES.ADMINISTRATOR,
      event: "LOGIN",
      outcome: "SUCCESS",
    });
    expect(JSON.stringify(audit)).not.toContain(administrator?.password);
    expect(JSON.stringify(audit)).not.toContain("session");
  });

  it("登录失败不给出会话并记录不含提交凭据的失败审计", async () => {
    const response = await handleAuthPost(
      new Request("http://127.0.0.1:3000/api/auth/sign-in/email", {
        body: JSON.stringify({
          email: "unknown@torquelis.local",
          password: "not-the-password",
        }),
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:3000",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();

    const audit = await prisma.auditLog.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
    });
    expect(audit).toMatchObject({
      actorRole: null,
      actorUserId: null,
      event: "LOGIN",
      outcome: "FAILURE",
    });
    expect(JSON.stringify(audit)).not.toContain("unknown@torquelis.local");
    expect(JSON.stringify(audit)).not.toContain("not-the-password");
  });
});
