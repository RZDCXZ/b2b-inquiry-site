import { constants } from "node:fs";
import { access, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import {
  ensurePresetCredentials,
  readPresetCredentials,
} from "@/src/modules/identity-access/server/preset-credentials";

describe("本地预置账号凭据", () => {
  it("首次初始化生成管理员、内容编辑和两名业务人员账号并以仅当前用户可读方式保存", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "torquelis-auth-"));
    const filePath = path.join(directory, "demo-credentials.json");

    const credentials = await ensurePresetCredentials(filePath);
    const fileMode = (await stat(filePath)).mode & 0o777;

    expect(credentials.accounts.map(({ role }) => role)).toEqual([
      APP_ROLES.ADMINISTRATOR,
      APP_ROLES.CONTENT_EDITOR,
      APP_ROLES.SALES,
      APP_ROLES.SALES,
    ]);
    expect(
      new Set(credentials.accounts.map(({ password }) => password)).size,
    ).toBe(4);
    expect(credentials.accounts.map(({ name }) => name)).toContain("周程");
    expect(
      credentials.accounts.every(({ password }) => password.length >= 20),
    ).toBe(true);
    expect(fileMode).toBe(0o600);
    await expect(access(filePath, constants.R_OK)).resolves.toBeUndefined();
  });

  it("重复初始化保留原凭据而不是悄悄轮换密码", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "torquelis-auth-"));
    const filePath = path.join(directory, "demo-credentials.json");

    const first = await ensurePresetCredentials(filePath);
    const second = await ensurePresetCredentials(filePath);

    expect(second).toEqual(first);
    expect(await readPresetCredentials(filePath)).toEqual(first);
    expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual(first);
  });

  it("升级旧凭据时保留已有密码并只新增第二名业务人员", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "torquelis-auth-"));
    const filePath = path.join(directory, "demo-credentials.json");
    const legacyPasswords = [
      "legacy-administrator-password",
      "legacy-content-editor-password",
      "legacy-sales-password-value",
    ];
    await writeFile(
      filePath,
      JSON.stringify({
        accounts: [
          {
            email: "administrator@torquelis.local",
            name: "陈屿",
            password: legacyPasswords[0],
            role: APP_ROLES.ADMINISTRATOR,
            roleLabel: "管理员",
          },
          {
            email: "content-editor@torquelis.local",
            name: "王晴",
            password: legacyPasswords[1],
            role: APP_ROLES.CONTENT_EDITOR,
            roleLabel: "内容编辑",
          },
          {
            email: "sales@torquelis.local",
            name: "林婧",
            password: legacyPasswords[2],
            role: APP_ROLES.SALES,
            roleLabel: "业务人员",
          },
        ],
        generatedAt: "2026-08-13T00:00:00.000Z",
        version: 1,
      }),
      { mode: 0o600 },
    );

    const migrated = await ensurePresetCredentials(filePath);

    expect(migrated.version).toBe(2);
    expect(
      migrated.accounts.slice(0, 3).map(({ password }) => password),
    ).toEqual(legacyPasswords);
    expect(migrated.accounts[3]).toMatchObject({
      email: "sales-secondary@torquelis.local",
      name: "周程",
      role: APP_ROLES.SALES,
    });
    expect(migrated.accounts[3]?.password).not.toBe(legacyPasswords[2]);
    await expect(readPresetCredentials(filePath)).resolves.toEqual(migrated);
  });
});
