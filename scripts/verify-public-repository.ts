import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import {
  inspectPublicRepositoryFile,
  inspectPublicRepositoryPath,
  type PublicRepositoryFinding,
} from "@/scripts/public-repository-policy";

function trackedPaths(): string[] {
  return execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
}

async function inspectTrackedFile(
  filePath: string,
): Promise<PublicRepositoryFinding[]> {
  const pathFindings = inspectPublicRepositoryPath(filePath);
  const buffer = await readFile(filePath);

  if (buffer.includes(0)) {
    return pathFindings;
  }

  return [
    ...pathFindings,
    ...inspectPublicRepositoryFile(filePath, buffer.toString("utf8")),
  ];
}

const paths = trackedPaths();
const findings = (
  await Promise.all(paths.map((filePath) => inspectTrackedFile(filePath)))
).flat();

if (findings.length > 0) {
  console.error("Public repository verification failed:");
  for (const finding of findings) {
    const location = finding.line
      ? `${finding.path}:${finding.line}`
      : finding.path;
    console.error(`- [${finding.rule}] ${location}: ${finding.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Verified ${paths.length} tracked files: no sensitive paths, machine-specific user paths, private keys, service tokens, or personal contact addresses were found.`,
  );
}
