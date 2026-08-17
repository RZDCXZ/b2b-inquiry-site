export type PublicRepositoryFinding = {
  line?: number;
  message: string;
  path: string;
  rule:
    | "machine-absolute-path"
    | "personal-contact"
    | "private-key"
    | "sensitive-path"
    | "service-token";
};

type ContentRule = {
  message: string;
  pattern: RegExp;
  rule: PublicRepositoryFinding["rule"];
};

const contentRules: ContentRule[] = [
  {
    message: "包含机器专属的用户目录绝对路径。",
    pattern:
      /(?:^|[\s"'(=:])(?:\/(?:Users|home)\/[a-z0-9._-]+\/|[a-z]:\\Users\\[^\\\s]+\\)/iu,
    rule: "machine-absolute-path",
  },
  {
    message: "包含私钥材料。",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
    rule: "private-key",
  },
  {
    message: "包含看似可用的第三方服务令牌。",
    pattern:
      /(?:\bAKIA[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9_]{20,}\b|\bsk-(?:live|proj)-[A-Za-z0-9_-]{16,}\b)/u,
    rule: "service-token",
  },
  {
    message: "包含个人邮箱域名；公开演示只允许 example.com 或 .local 联系人。",
    pattern:
      /[A-Z0-9._%+-]+@(?:gmail|outlook|hotmail|qq|163|126|foxmail)\.com\b/iu,
    rule: "personal-contact",
  },
];

export function inspectPublicRepositoryPath(
  filePath: string,
): PublicRepositoryFinding[] {
  const normalizedPath = filePath.replaceAll("\\", "/");
  const basename = normalizedPath.split("/").at(-1) ?? normalizedPath;
  const isEnvironmentFile =
    basename.startsWith(".env") && basename !== ".env.example";
  const isLocalState =
    normalizedPath === ".local" || normalizedPath.startsWith(".local/");
  const isCredentialContainer = /\.(?:key|p12|pfx|pem)$/iu.test(basename);

  if (!isEnvironmentFile && !isLocalState && !isCredentialContainer) {
    return [];
  }

  return [
    {
      message: "跟踪路径可能携带本地配置、凭据或私钥。",
      path: filePath,
      rule: "sensitive-path",
    },
  ];
}

export function inspectPublicRepositoryFile(
  filePath: string,
  content: string,
): PublicRepositoryFinding[] {
  const findings: PublicRepositoryFinding[] = [];

  for (const [index, line] of content.split(/\r?\n/u).entries()) {
    for (const rule of contentRules) {
      if (rule.pattern.test(line)) {
        findings.push({
          line: index + 1,
          message: rule.message,
          path: filePath,
          rule: rule.rule,
        });
      }
    }
  }

  return findings;
}
