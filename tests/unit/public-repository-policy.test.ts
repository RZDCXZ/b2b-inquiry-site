import { describe, expect, test } from "vitest";

import {
  inspectPublicRepositoryFile,
  inspectPublicRepositoryPath,
} from "@/scripts/public-repository-policy";

describe("公开仓库策略", () => {
  test("允许明确的本地示例配置与虚构联系人", () => {
    const content = [
      'DATABASE_URL="postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo"',
      'BETTER_AUTH_SECRET="generated-by-pnpm-setup"',
      "workEmail: maya@example.com",
      "login: administrator@torquelis.local",
    ].join("\n");

    expect(inspectPublicRepositoryFile(".env.example", content)).toEqual([]);
    expect(inspectPublicRepositoryPath(".env.example")).toEqual([]);
  });

  test("拒绝机器专属绝对路径、私钥、服务令牌与个人邮箱", () => {
    const macPath = ["", "Users", "reviewer", "project"].join("/");
    const privateKey = ["-----BEGIN", "PRIVATE", "KEY-----"].join(" ");
    const githubToken = ["ghp", "0123456789abcdefghijklmnop"].join("_");
    const personalEmail = ["reviewer", "gmail.com"].join("@");
    const content = [macPath, privateKey, githubToken, personalEmail].join(
      "\n",
    );

    expect(
      inspectPublicRepositoryFile("docs/evidence.txt", content).map(
        ({ rule }) => rule,
      ),
    ).toEqual([
      "machine-absolute-path",
      "private-key",
      "service-token",
      "personal-contact",
    ]);
  });

  test("拒绝会携带本地秘密或凭据的跟踪路径", () => {
    expect(inspectPublicRepositoryPath(".env")).toEqual([
      expect.objectContaining({ rule: "sensitive-path" }),
    ]);
    expect(inspectPublicRepositoryPath(".local/demo-credentials.json")).toEqual(
      [expect.objectContaining({ rule: "sensitive-path" })],
    );
    expect(inspectPublicRepositoryPath("certificates/demo.key")).toEqual([
      expect.objectContaining({ rule: "sensitive-path" }),
    ]);
  });
});
