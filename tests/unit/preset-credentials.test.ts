import { constants } from "node:fs";
import { access, mkdtemp, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import {
  ensurePresetCredentials,
  readPresetCredentials,
} from "@/src/modules/identity-access/server/preset-credentials";

describe("本地预置账号凭据", () => {
  it("首次初始化生成三种角色的随机密码并以仅当前用户可读方式保存", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "torquelis-auth-"));
    const filePath = path.join(directory, "demo-credentials.json");

    const credentials = await ensurePresetCredentials(filePath);
    const fileMode = (await stat(filePath)).mode & 0o777;

    expect(credentials.accounts.map(({ role }) => role)).toEqual([
      APP_ROLES.ADMINISTRATOR,
      APP_ROLES.CONTENT_EDITOR,
      APP_ROLES.SALES,
    ]);
    expect(
      new Set(credentials.accounts.map(({ password }) => password)).size,
    ).toBe(3);
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
});
