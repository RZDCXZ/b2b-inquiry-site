import { randomBytes } from "node:crypto";
import {
  access,
  chmod,
  constants,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { regenerateDemoAssets } from "@/src/infrastructure/local-demo/generated-assets";

const environmentFile = path.join(process.cwd(), ".env");

async function ensureEnvironmentFile(): Promise<void> {
  try {
    await access(environmentFile, constants.F_OK);
    return;
  } catch {
    // The local environment is intentionally created only when absent.
  }

  const template = await readFile(
    path.join(process.cwd(), ".env.example"),
    "utf8",
  );
  const content = template.replace(
    "generated-by-pnpm-setup",
    randomBytes(48).toString("base64url"),
  );
  await writeFile(environmentFile, content, { encoding: "utf8", mode: 0o600 });
  await chmod(environmentFile, 0o600);
}

await mkdir(path.join(process.cwd(), ".local"), { recursive: true });
await ensureEnvironmentFile();
await regenerateDemoAssets();
